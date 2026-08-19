# QA probe - bkalot-clone-admin /render (layer 3, brick 2).
# ASCII only on purpose: a .ps1 without a BOM is parsed as cp1255 here, and any
# Hebrew literal inside a comparison would be mangled at parse time and the
# check would silently match nothing. Hebrew is built from code points below.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$BASE   = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$INTAKE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake'
$ANON   = $env:BK_ANON
if (-not $ANON) { throw 'set $env:BK_ANON to the project anon key first' }
$EMAIL  = 'l023131500@gmail.com'
$PW     = $env:BK_PW
if (-not $PW) { throw 'set $env:BK_PW to the admin password first' }

function He([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }
# "ישראל בדיקה" / "הערה לבדיקה"
$NAME = He @(0x05D9,0x05E9,0x05E8,0x05D0,0x05DC,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4)
$NOTE = He @(0x05D4,0x05E2,0x05E8,0x05D4,0x0020,0x05DC,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4)

$n = 0
# Straight to the console stream, never the pipeline: a function that both
# writes and returns hands the caller an array, and Out-Null on the calls that
# need no return value swallows the whole report - a run that looks like it
# passed with almost no output.
function Say { param([string]$s) [Console]::Out.WriteLine($s) }

function Probe {
  param([string]$Label, [string]$Url, [string]$Method = 'POST',
        [hashtable]$Headers = @{}, [string]$Body = '{}')
  $script:n++
  $h = @{}
  foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] }
  $status = 0; $text = ''
  $iwr = @{ Uri = $Url; Method = $Method; Headers = $h; UseBasicParsing = $true; TimeoutSec = 60 }
  if ($Method -eq 'POST') {
    $iwr['Body'] = $Body
    $iwr['ContentType'] = 'application/json; charset=utf-8'
  }
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
  $flat = $text -replace '\s+', ' '
  if ($flat.Length -gt 600) { $flat = $flat.Substring(0, 600) + ' ...[' + $text.Length + ' bytes]' }
  Say ("     HTTP {0}  {1}" -f $status, $flat)
  return [pscustomobject]@{ status = $status; text = $text }
}

$auth = @{ Authorization = "Bearer $ANON"; apikey = $ANON }

Say '=== the route exists at all ==='
# The preflight is the one request the browser sends with no headers. If
# x-admin-token is not announced here the real request is blocked client-side,
# and a command-line probe - which sends no preflight - would pass in green.
$pf = try { Invoke-WebRequest -Uri "$BASE/render" -Method OPTIONS -UseBasicParsing -TimeoutSec 60 } catch { $null }
if ($pf) {
  Say ("[00] OPTIONS /render, no headers at all -> HTTP {0}" -f [int]$pf.StatusCode)
  Say ("     allow-headers: {0}" -f $pf.Headers['access-control-allow-headers'])
}
# v1 knew five routes. If this returns route_not_found the deploy did not land,
# and every check below would fail for the wrong reason.
Probe 'POST /nope (route list must now contain render)' "$BASE/nope" 'POST' $auth '{}' | Out-Null
Probe 'GET /render (wrong method)' "$BASE/render" 'GET' $auth '' | Out-Null
Probe 'POST /render with NO Authorization (gateway)' "$BASE/render" 'POST' @{} '{}' | Out-Null

Say ''
Say '=== the gate: render is the first route here that writes ==='
Probe 'render: no x-admin-token' "$BASE/render" 'POST' $auth '{"case_id":1}' | Out-Null
$tamperHdr = $auth.Clone(); $tamperHdr['x-admin-token'] = 'not-a-real-token-at-all-0000000000000000000'
Probe 'render: a token that was never issued' "$BASE/render" 'POST' $tamperHdr '{"case_id":1}' | Out-Null

Say ''
Say '=== login ==='
$good = @{ email = $EMAIL; password = $PW } | ConvertTo-Json -Compress
$r = Probe 'login: correct' "$BASE/login" 'POST' $auth $good
$TOKEN = ($r.text | ConvertFrom-Json).token
Say ("     token length: {0}" -f $TOKEN.Length)
$ok = $auth.Clone(); $ok['x-admin-token'] = $TOKEN

Say ''
Say '=== a real case, through the real intake path (not injected into the db) ==='
$case = @{ kind = 'treatment'; full_name = $NAME; phone = '0501234567';
           email = 'qa-render@more30.com'; situation = 'disability';
           note = $NOTE; consent = 'true' } | ConvertTo-Json -Compress
$r = Probe 'intake: treatment / disability' $INTAKE 'POST' $auth $case
$in = $r.text | ConvertFrom-Json
$CASE = $in.case_id
Say ("     case_id={0}  rights_linked={1}  queued={2}" -f $CASE, $in.rights_linked, $in.queued)

Say ''
Say '=== render ==='
$r = Probe 'render: the case' "$BASE/render" 'POST' $ok ('{"case_id":' + $CASE + '}')
$d1 = $r.text | ConvertFrom-Json
Say ("     document_id={0} template={1} fallback={2} rights={3}/{4} text={5} html={6} unresolved={7}" -f `
     $d1.document_id, $d1.template_key, $d1.fallback, $d1.rights_count, $d1.rights_source,
     $d1.text_chars, $d1.html_chars, ($d1.placeholders_unresolved -join ','))
Say ("     queued (test mode, must be False): {0}" -f $d1.queued)
Say ("     admin echoed back: {0}" -f $d1.admin.email)

# One document per (case, kind): a second call must update, not accumulate.
$r = Probe 'render: the same case again (upsert, not accumulate)' "$BASE/render" 'POST' $ok ('{"case_id":' + $CASE + '}')
$d2 = $r.text | ConvertFrom-Json
Say ("     same document_id: {0}" -f ($d2.document_id -eq $d1.document_id))

Say ''
Say '=== reader errors stay distinguishable from data faults ==='
Probe 'render: no case_id' "$BASE/render" 'POST' $ok '{}' | Out-Null
Probe 'render: case_id is a word' "$BASE/render" 'POST' $ok '{"case_id":"abc"}' | Out-Null
Probe 'render: case_id that does not exist' "$BASE/render" 'POST' $ok '{"case_id":99999}' | Out-Null
Probe 'render: template_key that does not exist' "$BASE/render" 'POST' $ok `
  ('{"case_id":' + $CASE + ',"template_key":"no_such_template"}') | Out-Null
Probe 'render: the other template, explicitly' "$BASE/render" 'POST' $ok `
  ('{"case_id":' + $CASE + ',"template_key":"general_inquiry_reply"}') | Out-Null

Say ''
Say '=== site_url is pinned in the function and cannot be supplied ==='
# {{siteUrl}} lands inside an href in the document body. 0063 escapes it so it
# cannot break out of the attribute, but escaping does not restrict a scheme -
# a caller-supplied value would plant a foreign link in a document a person
# reads and later sends. Measured, not assumed. Run last on purpose, so the row
# left in the table for the sql check is the one this request wrote.
$evil = '{"case_id":' + $CASE + ',"site_url":"javascript:alert(1)"}'
$r = Probe 'render: caller tries to set site_url' "$BASE/render" 'POST' $ok $evil
$d3 = $r.text | ConvertFrom-Json
Say ("     still HTTP 200 and same document_id: {0}" -f ($d3.document_id -eq $d1.document_id))
Say ("     template that wrote the surviving row: {0}" -f $d3.template_key)
Say '     (the body itself is checked in sql after this run)'

Say ''
Say '=== logout ==='
Probe 'logout' "$BASE/logout" 'POST' $ok '{}' | Out-Null
Probe 'render: same token after logout' "$BASE/render" 'POST' $ok ('{"case_id":' + $CASE + '}') | Out-Null

Say ''
Say ("done: {0} requests   CASE_ID={1}" -f $n, $CASE)
