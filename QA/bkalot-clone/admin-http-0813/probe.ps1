# QA probe - bkalot-clone-admin edge function (issue #224 item 3).
# ASCII only on purpose: a .ps1 without a BOM is parsed as cp1255 here, and any
# Hebrew literal inside a comparison would be mangled at parse time and the
# check would silently match nothing. Hebrew expectations are built from code
# points below.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$ANON = $env:BK_ANON
if (-not $ANON) { throw 'set $env:BK_ANON to the project anon key first' }
$EMAIL = 'qa-admin-http@more30.com'
$PW    = $env:BK_PW
if (-not $PW) { throw 'set $env:BK_PW to the QA admin password first' }

$n = 0
# Every line goes straight to the console stream, not to the PowerShell
# pipeline: a function that both Write-Outputs and returns an object hands the
# caller an array of strings, and `| Out-Null` on the calls that need no return
# value swallows the report entirely. That failure is silent - the run looks
# like it passed with almost no output.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Say { param([string]$s) [Console]::Out.WriteLine($s) }

function Probe {
  param([string]$Label, [string]$Path, [string]$Method = 'POST',
        [hashtable]$Headers = @{}, [string]$Body = '{}')
  $script:n++
  $url = "$BASE$Path"
  $h = @{}
  foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] }
  $status = 0; $text = ''
  # A body may only ride on POST here: Invoke-WebRequest raises
  # ProtocolViolationException for GET/OPTIONS with one, and that is not a
  # WebException - it would abort the run instead of being recorded as a probe.
  $iwr = @{ Uri = $url; Method = $Method; Headers = $h; UseBasicParsing = $true; TimeoutSec = 40 }
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
  if ($flat.Length -gt 700) { $flat = $flat.Substring(0, 700) + ' ...[' + $text.Length + ' bytes]' }
  Say ("     HTTP {0}  {1}" -f $status, $flat)
  return [pscustomobject]@{ status = $status; text = $text }
}

$auth = @{ Authorization = "Bearer $ANON"; apikey = $ANON }

Say '=== gateway and routing ==='
# The preflight is the one request the browser sends with no headers at all.
Probe 'OPTIONS /login, no auth at all (preflight)' '/login' 'OPTIONS' @{} '' | Out-Null
$pf = try {
  Invoke-WebRequest -Uri "$BASE/login" -Method OPTIONS -UseBasicParsing -TimeoutSec 40
} catch { $null }
if ($pf) {
  Say ("     allow-headers: {0}" -f $pf.Headers['access-control-allow-headers'])
  Say ("     allow-origin : {0}" -f $pf.Headers['access-control-allow-origin'])
}

Probe 'POST /login with NO Authorization header' '/login' 'POST' @{} '{}' | Out-Null
Probe 'GET /cases (wrong method)' '/cases' 'GET' $auth '' | Out-Null
Probe 'POST /nope (unknown route)' '/nope' 'POST' $auth '{}' | Out-Null
Probe 'POST /login with a body that is not JSON' '/login' 'POST' $auth 'not-json' | Out-Null
Probe 'POST /login with an array body' '/login' 'POST' $auth '[1,2]' | Out-Null
Probe 'POST /login over 4KB' '/login' 'POST' $auth ('{"email":"' + ('x' * 4200) + '"}') | Out-Null

Say ''
Say '=== login ==='
Probe 'login: no credentials' '/login' 'POST' $auth '{}' | Out-Null
$bad = @{ email = $EMAIL; password = 'definitely-not-the-password' } | ConvertTo-Json -Compress
Probe 'login: wrong password' '/login' 'POST' $auth $bad | Out-Null
$good = @{ email = "  QA-Admin-HTTP@More30.COM  "; password = $PW } | ConvertTo-Json -Compress
$r = Probe 'login: correct (email padded + uppercased)' '/login' 'POST' $auth $good
$login = $r.text | ConvertFrom-Json
$TOKEN = $login.token
Say ("     token length: {0}" -f $TOKEN.Length)

Say ''
Say '=== the forced deviation: token in Authorization vs x-admin-token ==='
# The source puts the opaque token in Authorization. Behind this gateway that
# request never reaches our code. Measured, not assumed.
Probe 'cases: admin token placed in Authorization (as the source does)' '/cases' 'POST' `
  @{ Authorization = "Bearer $TOKEN"; apikey = $ANON } '{}' | Out-Null

Say ''
Say '=== the gate ==='
Probe 'cases: no x-admin-token' '/cases' 'POST' $auth '{}' | Out-Null
$tampered = $auth.Clone(); $tampered['x-admin-token'] = ($TOKEN.Substring(0, $TOKEN.Length - 1) + 'Z')
Probe 'cases: one character changed in the token' '/cases' 'POST' $tampered '{}' | Out-Null

$ok = $auth.Clone(); $ok['x-admin-token'] = $TOKEN
$r = Probe 'session: valid token' '/session' 'POST' $ok '{}'
$r = Probe 'cases: valid token' '/cases' 'POST' $ok '{}'
$cases = $r.text | ConvertFrom-Json
Say ("     total={0}  first_id={1}  admin={2}" -f $cases.total, $cases.cases[0].id, $cases.admin.email)

$r = Probe 'case: valid token, id 14' '/case' 'POST' $ok ('{"id":' + $cases.cases[0].id + '}')
$one = $r.text | ConvertFrom-Json
# rights sits at the top level of the reply, not under case - reading it as
# $one.case.rights returns 0 for a case that has 59 of them, and 0 is exactly
# what an empty list looks like. Counted where it actually is.
Say ("     rights={0}  list_rights_count={1}  contact={2}" -f `
     $one.rights.Count, $cases.cases[0].rights_count, $one.case.contact.full_name)
# Hebrew round trip, expectation built from code points so the file stays ASCII.
$expect = -join ([int[]]@(0x05D9,0x05E9,0x05E8,0x05D0,0x05DC,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4) |
                 ForEach-Object { [char]$_ })
Say ("     hebrew round trip clean: {0}" -f ($one.case.contact.full_name -ceq $expect))
Say ("     admin full_name bytes ok: {0}" -f ($one.admin.email -eq $EMAIL))

Probe 'case: no id' '/case' 'POST' $ok '{}' | Out-Null
Probe 'case: id that does not exist' '/case' 'POST' $ok '{"id":99999}' | Out-Null
Probe 'case: id is a word' '/case' 'POST' $ok '{"id":"abc"}' | Out-Null

Say ''
Say '=== logout ==='
Probe 'logout: valid token' '/logout' 'POST' $ok '{}' | Out-Null
Probe 'cases: same token after logout' '/cases' 'POST' $ok '{}' | Out-Null
Probe 'logout: again (idempotent)' '/logout' 'POST' $ok '{}' | Out-Null
Probe 'logout: no token at all' '/logout' 'POST' $auth '{}' | Out-Null

Say ''
Say ("done: {0} requests" -f $n)
