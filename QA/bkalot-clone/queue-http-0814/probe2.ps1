# Follow-up probe. The first run's "no consent" case did NOT exercise the guard:
# bkalot_clone_intake dedupes the contact by phone, all three cases reused
# contact 39, and that contact already carried consent=true from case A. So the
# consent guard was never reached. This run uses a phone that has never been
# seen, so the contact is created fresh with consent=false.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$BASE   = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin'
$INTAKE = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake'
$ANON   = $env:BK_ANON
$EMAIL  = $env:BK_EMAIL
$PW     = $env:BK_PW
if (-not $ANON -or -not $PW) { throw 'set $env:BK_ANON and $env:BK_PW first' }

function He([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }
$NAME = He @(0x05D9,0x05E9,0x05E8,0x05D0,0x05DC,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4)

$n = 0
function Say { param([string]$s) [Console]::Out.WriteLine($s) }
function Probe {
  param([string]$Label, [string]$Url, [hashtable]$Headers, [string]$Body = '{}')
  $script:n++
  $status = 0; $text = ''
  try {
    $r = Invoke-WebRequest -Uri $Url -Method POST -Headers $Headers -Body $Body `
         -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 60
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
  if ($flat.Length -gt 360) { $flat = $flat.Substring(0, 360) + ' ...[' + $text.Length + ' bytes]' }
  Say ("     HTTP {0}  {1}" -f $status, $flat)
  return [pscustomobject]@{ status = $status; text = $text }
}

$auth = @{ Authorization = "Bearer $ANON"; apikey = $ANON }
$r = Probe 'login' "$BASE/login" $auth (@{ email = $EMAIL; password = $PW } | ConvertTo-Json -Compress)
$ok = $auth.Clone(); $ok['x-admin-token'] = ($r.text | ConvertFrom-Json).token

Say ''
Say '=== a contact that has never existed here, created with consent=false ==='
$case = @{ kind = 'treatment'; full_name = $NAME; phone = '0529998877';
           email = 'qa.bkalot@more30.com'; situation = 'disability';
           consent = 'false' } | ConvertTo-Json -Compress
$r = Probe 'intake: brand new phone, consent=false' $INTAKE $auth $case
$c = $r.text | ConvertFrom-Json
Say ("     case_id={0} contact_id={1} (must NOT be 39)" -f $c.case_id, $c.contact_id)
$r = Probe ("render: case " + $c.case_id) "$BASE/render" $ok ('{"case_id":' + $c.case_id + '}')
$d = $r.text | ConvertFrom-Json
Say ("     document_id={0}" -f $d.document_id)
$r = Probe 'queue: recipient never gave consent' "$BASE/queue" $ok ('{"document_id":' + $d.document_id + '}')
$q = $r.text | ConvertFrom-Json
Say ("     ok={0} error={1} queue_id={2} (must be empty - no row at all)" -f $q.ok, $q.error, $q.queue_id)

Say ''
Say ("done: {0} requests   CASE_D={1} DOC_D={2} CONTACT_D={3}" -f $n, $c.case_id, $d.document_id, $c.contact_id)
