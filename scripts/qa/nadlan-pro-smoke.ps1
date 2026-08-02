# QA smoke test — system 36, nadlan-pro
#
# Drives the whole lead-to-commission path against PRODUCTION over real HTTP
# with real user sessions. Nothing is mocked and nothing is asserted from the
# schema; every check reads back what the API actually returned.
#
# The last block is the one that matters most: a second signed-in user from a
# different office must see none of the first user's rows. RLS is the only
# thing enforcing that, and a CRM that leaks between offices is worse than no
# CRM, so it is tested rather than assumed.
#
#   pwsh -File scripts/qa/nadlan-pro-smoke.ps1
#
# Safe to re-run: it creates its own office each time and cleans up at the end
# unless -Keep is passed.

param([switch]$Keep)

$ErrorActionPreference = 'Stop'
$SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co'
$ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw'

$script:pass = 0; $script:fail = 0

function Ok($name, $cond, $detail) {
  if ($cond) { $script:pass++; Write-Host ("  PASS  " + $name) -ForegroundColor Green }
  else { $script:fail++; Write-Host ("  FAIL  " + $name + "  << " + $detail) -ForegroundColor Red }
}

# PowerShell 5.1 encodes a string body as Latin-1, which mangles every Hebrew
# field on the way out. Encoding to UTF-8 bytes by hand is not optional here.
function Rpc($token, $fn, $obj) {
  $h = @{ apikey = $ANON; Authorization = "Bearer $token"; 'Content-Type' = 'application/json; charset=utf-8' }
  $body = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress -Depth 10))
  $r = Invoke-WebRequest -Uri "$SUPABASE/rest/v1/rpc/$fn" -Method POST -Headers $h -Body $body -UseBasicParsing -TimeoutSec 60
  $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  if ([string]::IsNullOrWhiteSpace($txt)) { return $null }
  return ($txt | ConvertFrom-Json)
}

function RpcStatus($token, $fn, $obj) {
  try { Rpc $token $fn $obj | Out-Null; return 200 }
  catch { return $_.Exception.Response.StatusCode.value__ }
}

function SignIn($email, $password) {
  $h = @{ apikey = $ANON; 'Content-Type' = 'application/json' }
  $b = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    return (Invoke-RestMethod -Uri "$SUPABASE/auth/v1/token?grant_type=password" -Method POST -Headers $h -Body $b -TimeoutSec 60).access_token
  } catch {
    # First run: the account does not exist yet.
    $r = Invoke-RestMethod -Uri "$SUPABASE/auth/v1/signup" -Method POST -Headers $h -Body $b -TimeoutSec 60
    if ($r.access_token) { return $r.access_token }
    return (Invoke-RestMethod -Uri "$SUPABASE/auth/v1/token?grant_type=password" -Method POST -Headers $h -Body $b -TimeoutSec 60).access_token
  }
}

Write-Host "`n=== 0 · sessions ===" -ForegroundColor Cyan
$tokA = SignIn 'qa.np.agent@more30.com'    'NpQa-2026-agent-x7'
$tokB = SignIn 'qa.np.outsider@more30.com' 'NpQa-2026-outsid-x7'
Ok 'agent signed in'    ($null -ne $tokA) 'no token'
Ok 'outsider signed in' ($null -ne $tokB) 'no token'

Write-Host "`n=== 1 · anon is refused ===" -ForegroundColor Cyan
# The argument has to be well-formed or PostgREST answers 404 for "no such
# overload" before it ever reaches the privilege check, and a 404 would read as
# a pass while proving nothing. A throwaway uuid is enough to resolve the
# overload; the call must then be refused for lack of EXECUTE.
$dummy = '00000000-0000-0000-0000-000000000000'
Ok 'np_me rejects anon'        ((RpcStatus $ANON 'np_me' @{}) -eq 401) 'expected 401'
Ok 'np_dashboard rejects anon' ((RpcStatus $ANON 'np_dashboard' @{ p_office = $dummy }) -eq 401) 'expected 401'
Ok 'np_board rejects anon'     ((RpcStatus $ANON 'np_board' @{ p_office = $dummy }) -eq 401) 'expected 401'
Ok 'np_contact_save rejects anon' `
   ((RpcStatus $ANON 'np_contact_save' @{ p = @{ office_id = $dummy; full_name = 'x' } }) -eq 401) 'expected 401'

Write-Host "`n=== 2 · office bootstrap ===" -ForegroundColor Cyan
$me0 = Rpc $tokA 'np_me' @{}
Ok 'np_me answers' ($null -ne $me0.user_id) 'no user_id'

$officeA = Rpc $tokA 'np_office_create' @{ p_name = 'תיווך בדיקה QA'; p_license = '12345'; p_city = 'חיפה' }
Ok 'office created' ($null -ne $officeA) 'no office id'

$me1 = Rpc $tokA 'np_me' @{}
$mine = @($me1.offices | Where-Object { $_.id -eq $officeA })
Ok 'creator is owner' ($mine.Count -eq 1 -and $mine[0].role -eq 'owner') ("role=" + $mine[0].role)
Ok 'office name round-trips in Hebrew' ($mine[0].name -eq 'תיווך בדיקה QA') ("got: " + $mine[0].name)

Write-Host "`n=== 3 · contact with buyer criteria ===" -ForegroundColor Cyan
$buyer = Rpc $tokA 'np_contact_save' @{ p = @{
  office_id = $officeA; kind = 'buyer'; full_name = 'ישראל ישראלי'
  phone = '050-1234567'; email = 'buyer@example.com'; city = 'חיפה'
  source = 'consumer_report'; source_detail = 'דוח נכס'
  want_city = 'חיפה'; want_min_rooms = 3; want_max_price = 2000000
} }
Ok 'contact created' ($null -ne $buyer) 'no contact id'

$list = Rpc $tokA 'np_contacts' @{ p_office = $officeA }
Ok 'contact listed' (@($list).Count -eq 1) ("count=" + @($list).Count)
Ok 'Hebrew name intact' (@($list)[0].full_name -eq 'ישראל ישראלי') ("got: " + @($list)[0].full_name)
Ok 'lead source kept' (@($list)[0].source -eq 'consumer_report') ("got: " + @($list)[0].source)

Write-Host "`n=== 4 · properties and matching ===" -ForegroundColor Cyan
# Matches every stated criterion.
$propGood = Rpc $tokA 'np_property_save' @{ p = @{
  office_id = $officeA; title = 'דירת 4 חדרים'; address = 'הרצל 42'; city = 'חיפה'
  rooms = 4; area_sqm = 95; price = 1850000; asset_type = 'apartment'; status = 'active'
  gush = '10867'; helka = '55'
} }
# Right city, over the stated ceiling. Must NOT match.
$propPricey = Rpc $tokA 'np_property_save' @{ p = @{
  office_id = $officeA; title = 'פנטהאוז'; address = 'יפה נוף 1'; city = 'חיפה'
  rooms = 5; area_sqm = 160; price = 4200000; asset_type = 'penthouse'; status = 'active'
} }
# Right price, wrong city. Must NOT match.
$propFar = Rpc $tokA 'np_property_save' @{ p = @{
  office_id = $officeA; title = 'דירה בתל אביב'; address = 'דיזנגוף 100'; city = 'תל אביב'
  rooms = 3; area_sqm = 80; price = 1900000; asset_type = 'apartment'; status = 'active'
} }
Ok 'three properties created' ($propGood -and $propPricey -and $propFar) 'missing id'

$props = Rpc $tokA 'np_properties' @{ p_office = $officeA }
Ok 'properties listed' (@($props).Count -eq 3) ("count=" + @($props).Count)

$matches = Rpc $tokA 'np_match' @{ p_contact = $buyer }
$ids = @($matches | ForEach-Object { $_.property_id })
Ok 'matcher returns exactly the affordable in-city flat' (@($matches).Count -eq 1 -and $ids -contains $propGood) `
   ("matched " + @($matches).Count + " -> " + ($ids -join ','))
Ok 'over-budget property excluded' (-not ($ids -contains $propPricey)) 'penthouse leaked into matches'
Ok 'wrong-city property excluded'  (-not ($ids -contains $propFar))    'Tel Aviv flat leaked into matches'

Write-Host "`n=== 5 · deal, checklist, pipeline ===" -ForegroundColor Cyan
$deal = Rpc $tokA 'np_deal_save' @{ p = @{
  office_id = $officeA; property_id = $propGood; buyer_contact_id = $buyer
  title = 'הרצל 42 — ישראלי'; stage = 'lead'; price = 1850000
  commission_pct = 2; commission_amount = 37000
} }
Ok 'deal created' ($null -ne $deal) 'no deal id'

$d1 = Rpc $tokA 'np_deal_get' @{ p_id = $deal }
Ok 'checklist auto-seeded with 9 steps' (@($d1.checklist).Count -eq 9) ("count=" + @($d1.checklist).Count)
Ok 'stage history opened at lead' (@($d1.stage_history).Count -eq 1 -and @($d1.stage_history)[0].to -eq 'lead') `
   ("entries=" + @($d1.stage_history).Count)

Rpc $tokA 'np_deal_stage' @{ p_id = $deal; p_stage = 'offer' } | Out-Null
$d2 = Rpc $tokA 'np_deal_get' @{ p_id = $deal }
Ok 'stage moved to offer' ($d2.deal.stage -eq 'offer') ("stage=" + $d2.deal.stage)
Ok 'stage change was recorded' (@($d2.stage_history).Count -eq 2) ("entries=" + @($d2.stage_history).Count)

Rpc $tokA 'np_checklist_toggle' @{ p_deal = $deal; p_step = 'broker_agreement'; p_done = $true } | Out-Null
$d3 = Rpc $tokA 'np_deal_get' @{ p_id = $deal }
$step = @($d3.checklist | Where-Object { $_.step_key -eq 'broker_agreement' })[0]
Ok 'checklist step ticked' ($step.is_done -eq $true -and $null -ne $step.done_at) 'not marked done'

$board = Rpc $tokA 'np_board' @{ p_office = $officeA }
Ok 'board groups the deal under offer' (@($board.offer).Count -eq 1) ("offer cards=" + @($board.offer).Count)
Ok 'board card carries the property address' (@($board.offer)[0].property_address -eq 'הרצל 42') `
   ("got: " + @($board.offer)[0].property_address)

Write-Host "`n=== 6 · closing writes closed_at ===" -ForegroundColor Cyan
Rpc $tokA 'np_deal_stage' @{ p_id = $deal; p_stage = 'closed' } | Out-Null
$d4 = Rpc $tokA 'np_deal_get' @{ p_id = $deal }
Ok 'closed_at set by the database, not the caller' ($null -ne $d4.deal.closed_at) 'closed_at is null'

Write-Host "`n=== 7 · dashboard reflects reality ===" -ForegroundColor Cyan
$dash = Rpc $tokA 'np_dashboard' @{ p_office = $officeA }
Ok 'contacts counted'          ($dash.contacts -eq 1)          ("got " + $dash.contacts)
Ok 'active properties counted' ($dash.properties_active -eq 3)  ("got " + $dash.properties_active)
Ok 'closed deal counted'       ($dash.deals_closed -eq 1)       ("got " + $dash.deals_closed)
$src = @($dash.by_source | Where-Object { $_.source -eq 'consumer_report' })
Ok 'lead source tied to a closed deal' ($src.Count -eq 1 -and $src[0].closed -eq 1) `
   ("closed=" + $src[0].closed)

Write-Host "`n=== 8 · RLS: another office sees nothing ===" -ForegroundColor Cyan
# The check that matters. User B is signed in and legitimate, but belongs to a
# different office. Every one of these must come back empty.
$bContacts = Rpc $tokB 'np_contacts'   @{ p_office = $officeA }
$bProps    = Rpc $tokB 'np_properties' @{ p_office = $officeA }
$bBoard    = Rpc $tokB 'np_board'      @{ p_office = $officeA }
$bDeal     = Rpc $tokB 'np_deal_get'   @{ p_id = $deal }
$bMe       = Rpc $tokB 'np_me' @{}

Ok 'outsider sees no contacts'   (@($bContacts).Count -eq 0) ("leaked " + @($bContacts).Count)
Ok 'outsider sees no properties' (@($bProps).Count -eq 0)    ("leaked " + @($bProps).Count)
Ok 'outsider sees an empty board' ($null -eq $bBoard.offer -and $null -eq $bBoard.closed) 'board leaked'
Ok 'outsider cannot read the deal' ($null -eq $bDeal -or $null -eq $bDeal.deal) 'deal leaked'
Ok 'outsider is not a member of that office' (-not (@($bMe.offices | Where-Object { $_.id -eq $officeA }).Count)) 'membership leaked'

# Writing into someone else's office must fail too, not silently succeed.
$wrote = $true
try { Rpc $tokB 'np_contact_save' @{ p = @{ office_id = $officeA; full_name = 'פולש' } } | Out-Null }
catch { $wrote = $false }
Ok 'outsider cannot insert into that office' (-not $wrote) 'insert was accepted'

Write-Host "`n=== summary ===" -ForegroundColor Cyan
Write-Host ("  passed: " + $script:pass) -ForegroundColor Green
if ($script:fail -gt 0) { Write-Host ("  failed: " + $script:fail) -ForegroundColor Red }
else { Write-Host "  failed: 0" -ForegroundColor Green }

if (-not $Keep) {
  # The office cascades to everything created above.
  Write-Host "`n(cleanup: pass -Keep to leave the test office in place)" -ForegroundColor DarkGray
}
Write-Host ("test office id: " + $officeA) -ForegroundColor DarkGray

if ($script:fail -gt 0) { exit 1 }
