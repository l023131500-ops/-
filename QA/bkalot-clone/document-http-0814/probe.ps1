# QA probe - bkalot-clone-admin /document (layer 3, brick 3).
# ASCII only on purpose: a .ps1 without a BOM is parsed as cp1255 here, and any
# Hebrew literal inside a comparison would be mangled at parse time and the
# check would silently match nothing. Hebrew is built from code points below.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$BASE   = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$INTAKE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake'
$RPC    = 'https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/bkalot_clone_admin_document'
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
$pf = try { Invoke-WebRequest -Uri "$BASE/document" -Method OPTIONS -UseBasicParsing -TimeoutSec 60 } catch { $null }
if ($pf) {
  Say ("[00] OPTIONS /document, no headers at all -> HTTP {0}" -f [int]$pf.StatusCode)
  Say ("     allow-headers: {0}" -f $pf.Headers['access-control-allow-headers'])
}
# v2 knew six routes. If this returns route_not_found the deploy did not land,
# and every check below would fail for the wrong reason.
Probe 'POST /nope (route list must now contain document)' "$BASE/nope" 'POST' $auth '{}' | Out-Null
Probe 'GET /document (wrong method)' "$BASE/document" 'GET' $auth '' | Out-Null
Probe 'POST /document with NO Authorization (gateway)' "$BASE/document" 'POST' @{} '{}' | Out-Null

Say ''
Say '=== the rpc itself is not reachable with the anon key ==='
# The gate is the edge function. If the rpc were callable directly the gate
# would be decoration - and the body carries a full name, phone and email.
Probe 'rpc bkalot_clone_admin_document with the anon key' $RPC 'POST' $auth '{"p":{"id":1}}' | Out-Null

Say ''
Say '=== the gate ==='
Probe 'document: no x-admin-token' "$BASE/document" 'POST' $auth '{"id":1}' | Out-Null
$tamperHdr = $auth.Clone(); $tamperHdr['x-admin-token'] = 'not-a-real-token-at-all-0000000000000000000'
Probe 'document: a token that was never issued' "$BASE/document" 'POST' $tamperHdr '{"id":1}' | Out-Null

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
           email = 'qa-document@more30.com'; situation = 'disability';
           note = $NOTE; consent = 'true' } | ConvertTo-Json -Compress
$r = Probe 'intake: treatment / disability' $INTAKE 'POST' $auth $case
$in = $r.text | ConvertFrom-Json
$CASE = $in.case_id
Say ("     case_id={0}  rights_linked={1}  queued={2}" -f $CASE, $in.rights_linked, $in.queued)

Say ''
Say '=== render, so there is a body to read back ==='
$r = Probe 'render: the case' "$BASE/render" 'POST' $ok ('{"case_id":' + $CASE + '}')
$d = $r.text | ConvertFrom-Json
# DOCID and not DOC: PowerShell variable names are case-insensitive, and the
# response object below is the natural thing to call $doc. It would silently
# overwrite the id, and the two probes that interpolate it would post a 9KB
# object as {"id":...} - both come back 413 body_too_large, which reads like a
# finding and is nothing but this collision.
$DOCID = $d.document_id
Say ("     document_id={0}  text_chars={1}  html_chars={2}" -f $DOCID, $d.text_chars, $d.html_chars)

Say ''
Say '=== what admin_case returns for the same case: metadata, still no body ==='
# 0060 line 215 stays as it is. If a body ever appeared here the new route
# would be redundant - and every case open would carry ~20KB it does not need.
$r = Probe 'case: the same case' "$BASE/case" 'POST' $ok ('{"id":' + $CASE + '}')
$c = $r.text | ConvertFrom-Json
$meta = $c.documents[0]
Say ("     documents[0]: id={0} has_body={1} body_html present in payload: {2}" -f `
     $meta.id, $meta.has_body, ($null -ne $meta.body_html))

Say ''
Say '=== the read itself ==='
$r = Probe 'document: the id render just returned' "$BASE/document" 'POST' $ok ('{"id":' + $DOCID + '}')
$g = ($r.text | ConvertFrom-Json)
$doc = $g.document
Say ("     ok={0} id={1} case_id={2} kind={3}" -f $g.ok, $doc.id, $doc.case_id, $doc.kind)
Say ("     html_chars={0} text_chars={1} queue_id={2} queued={3} storage_path={4}" -f `
     $doc.html_chars, $doc.text_chars, $doc.queue_id, $doc.queued, $doc.storage_path)
Say ("     case_id matches the case we rendered: {0}" -f ($doc.case_id -eq $CASE))
# Two independent producers agreeing on the same number. If render said 5223
# and the reader says something else, one of them is truncating.
Say ("     html_chars agrees with render: {0}   text_chars agrees: {1}" -f `
     ($doc.html_chars -eq $d.html_chars), ($doc.text_chars -eq $d.text_chars))
Say ("     body_html actually present: {0}  (measured length {1})" -f `
     ($doc.body_html.Length -gt 0), $doc.body_html.Length)
Say ("     length of what arrived equals the count it reported: {0}" -f `
     ($doc.body_html.Length -eq $doc.html_chars))
# The Hebrew round trip: the reader is the first thing that hands this text to
# a screen, and a body that comes back mangled looks exactly like a healthy 200.
Say ("     the applicant name survives in the html: {0}" -f $doc.body_html.Contains($NAME))
Say ("     the note survives in the text: {0}" -f $doc.body_text.Contains($NOTE))
Say ("     pinned site url in the body: {0}   javascript: in the body: {1}" -f `
     $doc.body_html.Contains('https://more30.com/bkalot-studio'), $doc.body_html.Contains('javascript:'))

Say ''
Say '=== reader errors stay distinguishable from data faults ==='
Probe 'document: no id' "$BASE/document" 'POST' $ok '{}' | Out-Null
Probe 'document: id is a word' "$BASE/document" 'POST' $ok '{"id":"abc"}' | Out-Null
Probe 'document: id is a number as a string' "$BASE/document" 'POST' $ok ('{"id":"' + $DOCID + '"}') | Out-Null
Probe 'document: id that does not exist' "$BASE/document" 'POST' $ok '{"id":99999}' | Out-Null
# 25 digits: digits-only, so it passes any regex, and ::bigint on it raises
# numeric_value_out_of_range - a db error on input that is legitimate in shape.
Probe 'document: 25 digits (bigint overflow guard)' "$BASE/document" 'POST' $ok '{"id":9999999999999999999999999}' | Out-Null

Say ''
Say '=== logout: the read path closes with the session too ==='
Probe 'logout' "$BASE/logout" 'POST' $ok '{}' | Out-Null
Probe 'document: same token after logout' "$BASE/document" 'POST' $ok ('{"id":' + $DOCID + '}') | Out-Null

Say ''
Say ("done: {0} requests   CASE_ID={1}   DOC_ID={2}" -f $n, $CASE, $DOCID)
