# QA probe for the bkalot-clone-intake edge function (core.issues #223, item 1).
# ASCII source only: a .ps1 without a BOM is parsed as cp1255 here, so every Hebrew
# literal is built from code points instead of typed in.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# Windows PowerShell 5.1 does not load System.Net.Http by default.
Add-Type -AssemblyName System.Net.Http

$FN   = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake'
$ANON = $env:ANON_KEY
if (-not $ANON) { throw 'ANON_KEY not set' }

function He([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }

# $body is [object] on purpose: a [string] parameter coerces $null to '', and an
# empty body on OPTIONS/GET measures a different request than the one intended.
function Hit([string]$method, [object]$body, [bool]$auth, [string]$label) {
  $h = New-Object Net.Http.HttpClient
  $verb = New-Object Net.Http.HttpMethod $method
  $req = New-Object Net.Http.HttpRequestMessage $verb, $FN
  if ($auth) {
    $req.Headers.Add('apikey', $ANON)
    $req.Headers.Add('Authorization', "Bearer $ANON")
  }
  if ($null -ne $body) {
    $bytes = [Text.Encoding]::UTF8.GetBytes([string]$body)
    $c = New-Object Net.Http.ByteArrayContent (,$bytes)
    $c.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/json')
    $req.Content = $c
  }
  $res  = $h.SendAsync($req).Result
  $text = ''
  if ($null -ne $res.Content) { $text = $res.Content.ReadAsStringAsync().Result }
  $acao = ''
  if ($res.Headers.Contains('access-control-allow-origin')) {
    $acao = ($res.Headers.GetValues('access-control-allow-origin') | Select-Object -First 1)
  }
  Write-Output ("=== {0} | HTTP {1} | acao='{2}'" -f $label, [int]$res.StatusCode, $acao)
  if ($text) { Write-Output $text }
  $h.Dispose()
}

$name  = He @(0x05D9,0x05E9,0x05E8,0x05D0,0x05DC)                       # Israel
$note  = He @(0x05D1,0x05D3,0x05D9,0x05E7,0x05D4,0x20,0x05D0,0x05D5,0x05D8,0x05D5) # test
$stamp = 'qa-intake-http-0813'

Hit 'OPTIONS' $null $false 'A preflight, no Authorization header'
Hit 'POST'    '{"kind":"info","full_name":"x","phone":"0501234567"}' $false 'B POST with no key'
Hit 'GET'     $null $true 'C GET with anon key'
Hit 'POST'    'not json' $true 'D body that is not JSON'
Hit 'POST'    '[1,2]' $true 'E body that is a JSON array'
Hit 'POST'    ('{"kind":"whatever","full_name":"x","phone":"0501234567"}') $true 'F kind the DB rejects'

$big = '{"kind":"info","full_name":"x","phone":"0501234567","note":"' + ('a' * 17000) + '"}'
Hit 'POST' $big $true 'G body over 16KB'

$treat = @{
  kind      = 'treatment'
  full_name = $name
  phone     = '+972-50-999-8877'
  email     = 'qa-intake-http-0813@more30.com'
  situation = 'disability'
  note      = "$note $stamp"
  consent   = 'true'
  source    = 'form'
} | ConvertTo-Json -Compress
Hit 'POST' $treat $true 'H full treatment case, Hebrew name, +972 phone'

$info = @{
  kind      = 'info'
  full_name = $name
  phone     = '050-999-8877'
  situation = 'disability'
  topic_no  = '17'
  documents = @('a')
  note      = $stamp
} | ConvertTo-Json -Compress
Hit 'POST' $info $true 'I info case sending treatment-only fields'


