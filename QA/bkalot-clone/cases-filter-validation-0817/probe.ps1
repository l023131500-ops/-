# QA probe - bkalot-clone-admin /cases filter validation branches over live HTTP.
# Gap: status_unknown / kind_unknown / decided_unknown / sort_unknown (built in
# migrations 0081/0082, re-affirmed through 0102) were only ever measured by
# calling public.bkalot_clone_admin_cases(jsonb) directly in SQL (scaffolding,
# QA/bkalot-clone/queue-total-0816) - never through the deployed edge function
# with a real admin session, the only path a browser can actually reach.
# ASCII only on purpose: a .ps1 without a BOM is parsed as cp1255 here, and any
# Hebrew literal inside a comparison would be mangled at parse time.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$ANON = $env:BK_ANON
if (-not $ANON) { throw 'set $env:BK_ANON to the project anon key first' }
$EMAIL = $env:BK_EMAIL
if (-not $EMAIL) { throw 'set $env:BK_EMAIL to the admin email first' }
$PW = $env:BK_PW
if (-not $PW) { throw 'set $env:BK_PW to the admin password first' }

$n = 0
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Say { param([string]$s) [Console]::Out.WriteLine($s) }

function Probe {
  param([string]$Label, [string]$Path, [hashtable]$Headers, [string]$Body)
  $script:n++
  $url = "$BASE$Path"
  $status = 0; $text = ''
  $iwr = @{ Uri = $url; Method = 'POST'; Headers = $Headers; UseBasicParsing = $true; TimeoutSec = 40
            Body = $Body; ContentType = 'application/json; charset=utf-8' }
  try {
    $r = Invoke-WebRequest @iwr
    $status = [int]$r.StatusCode
    $text = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  } catch [Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) {
      $status = [int]$resp.StatusCode
      $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
      $text = $sr.ReadToEnd(); $sr.Close()
    } else { $text = $_.Exception.Message }
  }
  Say ("[{0:d2}] {1}" -f $script:n, $Label)
  Say ("     HTTP {0}  {1}" -f $status, $text)
  return [pscustomobject]@{ status = $status; text = $text }
}

$auth = @{ Authorization = "Bearer $ANON"; apikey = $ANON }

Say '=== login ==='
$body = @{ email = $EMAIL; password = $PW } | ConvertTo-Json -Compress
$r = Probe 'login' '/login' $auth $body
$login = $r.text | ConvertFrom-Json
if (-not $login.ok) { throw "login failed: $($r.text)" }
$TOKEN = $login.token
$ok = $auth.Clone(); $ok['x-admin-token'] = $TOKEN
Say ("     logged in as {0}" -f $login.admin.email)

Say ''
Say '=== baseline (no filters) ==='
Probe 'cases: no filters' '/cases' $ok '{}' | Out-Null

Say ''
Say '=== the four filter-validation branches, never measured over HTTP before ==='
Probe 'cases: kind=bogus'    '/cases' $ok '{"kind":"bogus"}'    | Out-Null
Probe 'cases: status=bogus'  '/cases' $ok '{"status":"bogus"}'  | Out-Null
Probe 'cases: decided=bogus' '/cases' $ok '{"decided":"bogus"}' | Out-Null
Probe 'cases: sort=bogus'    '/cases' $ok '{"sort":"bogus"}'    | Out-Null

Say ''
Say '=== controls: the values each branch does accept ==='
Probe 'cases: kind=info'         '/cases' $ok '{"kind":"info"}'         | Out-Null
Probe 'cases: status=new'        '/cases' $ok '{"status":"new"}'        | Out-Null
Probe 'cases: decided=no'        '/cases' $ok '{"decided":"no"}'        | Out-Null
Probe 'cases: sort=decided_at'   '/cases' $ok '{"sort":"decided_at"}'   | Out-Null

Say ''
Say '=== logout (leave no session behind) ==='
Probe 'logout' '/logout' $ok '{}' | Out-Null

Say ''
Say ("done: {0} requests" -f $n)
