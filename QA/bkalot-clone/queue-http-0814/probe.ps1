# QA probe - bkalot-clone-admin /queue (layer 3, the first sending brick, #234 part 1).
# ASCII only on purpose: a .ps1 without a BOM is parsed as cp1255 here, and any
# Hebrew literal inside a comparison would be mangled at parse time and the
# check would silently match nothing. Hebrew is built from code points below.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$BASE   = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$INTAKE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake'
$RPC    = 'https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/bkalot_clone_queue'
$ANON   = $env:BK_ANON
if (-not $ANON) { throw 'set $env:BK_ANON to the project anon key first' }
$EMAIL  = $env:BK_EMAIL
$PW     = $env:BK_PW
if (-not $PW) { throw 'set $env:BK_PW to the admin password first' }

function He([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }
# "ישראל בדיקה" / "הערה לבדיקה"
$NAME = He @(0x05D9,0x05E9,0x05E8,0x05D0,0x05DC,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4)
$NOTE = He @(0x05D4,0x05E2,0x05E8,0x05D4,0x0020,0x05DC,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4)
# "היעד אינו ברשימת יעדי הבדיקה. לא יישלח." - the source engine's wording, word for word.
$BLOCKED = He @(0x05D4,0x05D9,0x05E2,0x05D3,0x0020,0x05D0,0x05D9,0x05E0,0x05D5,0x0020,
                0x05D1,0x05E8,0x05E9,0x05D9,0x05DE,0x05EA,0x0020,0x05D9,0x05E2,0x05D3,
                0x05D9,0x0020,0x05D4,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4,0x002E,0x0020,
                0x05DC,0x05D0,0x0020,0x05D9,0x05D9,0x05E9,0x05DC,0x05D7,0x002E)

$n = 0
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
  if ($flat.Length -gt 400) { $flat = $flat.Substring(0, 400) + ' ...[' + $text.Length + ' bytes]' }
  Say ("     HTTP {0}  {1}" -f $status, $flat)
  return [pscustomobject]@{ status = $status; text = $text }
}

$auth = @{ Authorization = "Bearer $ANON"; apikey = $ANON }

Say '=== the route exists at all ==='
$pf = try { Invoke-WebRequest -Uri "$BASE/queue" -Method OPTIONS -UseBasicParsing -TimeoutSec 60 } catch { $null }
if ($pf) {
  Say ("[00] OPTIONS /queue, no headers at all -> HTTP {0}" -f [int]$pf.StatusCode)
  Say ("     allow-headers: {0}" -f $pf.Headers['access-control-allow-headers'])
}
# v3 knew seven routes. If this returns route_not_found the deploy did not land,
# and every check below would fail for the wrong reason.
Probe 'POST /nope (route list must now contain queue)' "$BASE/nope" 'POST' $auth '{}' | Out-Null
Probe 'GET /queue (wrong method)' "$BASE/queue" 'GET' $auth '' | Out-Null
Probe 'POST /queue with NO Authorization (gateway)' "$BASE/queue" 'POST' @{} '{}' | Out-Null

Say ''
Say '=== the rpc itself is not reachable with the anon key ==='
# This is the first route that writes into the sending mechanism. If the rpc were
# callable directly the gate would be decoration.
Probe 'rpc bkalot_clone_queue with the anon key' $RPC 'POST' $auth '{"p":{"document_id":1}}' | Out-Null

Say ''
Say '=== the gate ==='
Probe 'queue: no x-admin-token' "$BASE/queue" 'POST' $auth '{"document_id":1}' | Out-Null
$tamperHdr = $auth.Clone(); $tamperHdr['x-admin-token'] = 'not-a-real-token-at-all-0000000000000000000'
Probe 'queue: a token that was never issued' "$BASE/queue" 'POST' $tamperHdr '{"document_id":1}' | Out-Null

Say ''
Say '=== login ==='
$good = @{ email = $EMAIL; password = $PW } | ConvertTo-Json -Compress
$r = Probe 'login: correct' "$BASE/login" 'POST' $auth $good
$TOKEN = ($r.text | ConvertFrom-Json).token
Say ("     token length: {0}" -f $TOKEN.Length)
$ok = $auth.Clone(); $ok['x-admin-token'] = $TOKEN

function NewCase {
  param([string]$Label, [string]$Mail, [string]$Consent = 'true')
  $case = @{ kind = 'treatment'; full_name = $NAME; phone = '0501234567';
             email = $Mail; situation = 'disability';
             note = $NOTE; consent = $Consent } | ConvertTo-Json -Compress
  $r = Probe ("intake: " + $Label) $INTAKE 'POST' $auth $case
  return ($r.text | ConvertFrom-Json)
}
function RenderCase {
  param([int]$CaseId)
  $r = Probe ("render: case " + $CaseId) "$BASE/render" 'POST' $ok ('{"case_id":' + $CaseId + '}')
  return ($r.text | ConvertFrom-Json)
}

Say ''
Say '=== A: a target that IS on the test list ==='
# Real cases through the real intake path over HTTP, not injected into the db.
$a = NewCase 'allowed target' 'qa.bkalot@more30.com'
Say ("     case_id={0} rights_linked={1} queued={2}" -f $a.case_id, $a.rights_linked, $a.queued)
$ad = RenderCase $a.case_id
Say ("     document_id={0} text_chars={1} html_chars={2}" -f $ad.document_id, $ad.text_chars, $ad.html_chars)
$r = Probe 'queue: the document render just produced' "$BASE/queue" 'POST' $ok ('{"document_id":' + $ad.document_id + '}')
$qa = $r.text | ConvertFrom-Json
Say ("     ok={0} queue_id={1} status={2} blocked={3} mode={4}" -f $qa.ok, $qa.queue_id, $qa.status, $qa.blocked, $qa.mode)
Say ("     to_address={0} content_bytes={1} already_queued={2}" -f $qa.to_address, $qa.content_bytes, $qa.already_queued)
Say ("     admin identity came back with the write: {0}" -f $qa.admin.full_name)

Say ''
Say '=== A2: the second click (idempotency over HTTP, not just in sql) ==='
# Two clicks in an admin screen must not be two letters to the same person.
$r = Probe 'queue: the same document again' "$BASE/queue" 'POST' $ok ('{"document_id":' + $ad.document_id + '}')
$qa2 = $r.text | ConvertFrom-Json
Say ("     queue_id={0} (same as before: {1})  already_queued={2}" -f `
     $qa2.queue_id, ($qa2.queue_id -eq $qa.queue_id), $qa2.already_queued)

Say ''
Say '=== A3: the reader agrees with the writer ==='
# document was extended in 0067 with queue_status/queue_mode. If it does not
# report the new row, the admin screen cannot tell queued from blocked.
$r = Probe 'document: the same document' "$BASE/document" 'POST' $ok ('{"id":' + $ad.document_id + '}')
$dg = ($r.text | ConvertFrom-Json).document
Say ("     queue_id={0} queued={1} queue_status={2} queue_mode={3}" -f `
     $dg.queue_id, $dg.queued, $dg.queue_status, $dg.queue_mode)
Say ("     the reader's queue_id equals the writer's: {0}" -f ($dg.queue_id -eq $qa.queue_id))

Say ''
Say '=== B: a target that is NOT on the test list ==='
$b = NewCase 'target not on the list' 'not-a-test-target@example.com'
$bd = RenderCase $b.case_id
$r = Probe 'queue: not an approved test target' "$BASE/queue" 'POST' $ok ('{"document_id":' + $bd.document_id + '}')
$qb = $r.text | ConvertFrom-Json
Say ("     ok={0} queue_id={1} status={2} blocked={3}" -f $qb.ok, $qb.queue_id, $qb.status, $qb.blocked)
Say ("     a row WAS written (the trace), and it is blocked: {0}" -f ($qb.status -eq 'blocked'))

Say ''
Say '=== C: no consent - no row at all ==='
$c = NewCase 'no consent' 'qa.bkalot@more30.com' 'false'
Say ("     case_id={0} consent path: {1}" -f $c.case_id, $c.ok)
if ($c.case_id) {
  $cd = RenderCase $c.case_id
  $r = Probe 'queue: recipient never gave consent' "$BASE/queue" 'POST' $ok ('{"document_id":' + $cd.document_id + '}')
  $qc = $r.text | ConvertFrom-Json
  Say ("     ok={0} error={1}" -f $qc.ok, $qc.error)
}

Say ''
Say '=== caller errors stay distinguishable from data faults ==='
Probe 'queue: no id at all' "$BASE/queue" 'POST' $ok '{}' | Out-Null
Probe 'queue: id is a word' "$BASE/queue" 'POST' $ok '{"document_id":"abc"}' | Out-Null
Probe 'queue: id as a string of digits' "$BASE/queue" 'POST' $ok ('{"document_id":"' + $ad.document_id + '"}') | Out-Null
Probe 'queue: id that does not exist' "$BASE/queue" 'POST' $ok '{"document_id":999999}' | Out-Null
# 25 digits: digits-only, so it passes any regex, and ::bigint on it raises
# numeric_value_out_of_range - a db error on input that is legitimate in shape.
Probe 'queue: 25 digits (bigint overflow guard)' "$BASE/queue" 'POST' $ok '{"document_id":9999999999999999999999999}' | Out-Null
# The alias 0067 accepts. If this stopped working the admin screen could send
# {id:...} and get document_id_required on a document that exists.
Probe 'queue: the id alias' "$BASE/queue" 'POST' $ok ('{"id":' + $ad.document_id + '}') | Out-Null
# Nothing in the body may reach mode/status/to_address. 0067 ignores them; this
# measures that the route did not hand them through to something that does not.
Probe 'queue: body tries to set mode=live and its own address' "$BASE/queue" 'POST' $ok `
  ('{"document_id":' + $bd.document_id + ',"mode":"live","status":"queued","to_address":"someone@example.com"}') | Out-Null

Say ''
Say '=== logout: the write path closes with the session too ==='
Probe 'logout' "$BASE/logout" 'POST' $ok '{}' | Out-Null
Probe 'queue: same token after logout' "$BASE/queue" 'POST' $ok ('{"document_id":' + $ad.document_id + '}') | Out-Null

Say ''
Say ("done: {0} requests" -f $n)
Say ("CASE_A={0} DOC_A={1} QUEUE_A={2}" -f $a.case_id, $ad.document_id, $qa.queue_id)
Say ("CASE_B={0} DOC_B={1} QUEUE_B={2}" -f $b.case_id, $bd.document_id, $qb.queue_id)
Say ("CASE_C={0}" -f $c.case_id)
# The blocked row's status_detail is the source engine's wording word for word.
# It is not in the http response (only the message is), so it is asserted in sql
# in the rollback step; here we only record that a message came back at all.
Say ("blocked message came back over http: {0}" -f ($qb.message.Length -gt 0))
