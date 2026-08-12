# QA - priority 1B: the test customer test@more30.com
# Signs in the way a real customer does (password, never a service key) and calls
# the same RPCs more30.com/auth-button.js calls on every site:
# more30_profile_set_contact, then more30_join_app once per system.
# Output is the server's real answer to each call.
#
# ASCII only on purpose: PowerShell 5.1 reads this file as ANSI, so a Hebrew
# string literal here is a parse error. The Hebrew name is built from code points.
$ErrorActionPreference = 'Stop'
$base = 'https://uhnrgujbdxhhmoxcjria.supabase.co'
$anon = $env:MORE30_ANON
if (-not $anon) { throw 'set $env:MORE30_ANON first' }

# "customer for testing" in Hebrew
$fullName = -join (0x05DC,0x05E7,0x05D5,0x05D7,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4 | ForEach-Object { [char]$_ })

function Post-Json($url, $headers, $obj) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
  $r = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $bytes -UseBasicParsing
  return $r.Content
}

# 1. sign in with the documented password
$login = Post-Json "$base/auth/v1/token?grant_type=password" `
  @{ apikey = $anon; 'Content-Type' = 'application/json' } `
  @{ email = 'test@more30.com'; password = 'More30Test2026' }
$tok = ($login | ConvertFrom-Json).access_token
if (-not $tok) { throw 'login failed' }
$h = @{ apikey = $anon; Authorization = "Bearer $tok"; 'Content-Type' = 'application/json' }

# 2. name + phone on the profile - what the button displays
$profile = Post-Json "$base/rest/v1/rpc/more30_profile_set_contact" $h `
  @{ p_full_name = $fullName; p_phone = '0500000000' }

# 3. membership per system - exactly the call the button makes on entering a site
$rows = @()
foreach ($a in $args) {
  $res = Post-Json "$base/rest/v1/rpc/more30_join_app" $h @{ p_app = $a }
  $j = $res | ConvertFrom-Json
  $rows += [pscustomobject]@{ app = $a; ok = $j.ok; reason = $j.reason; key = $j.app_key; role = $j.role; created = $j.created; plan = $j.plan }
}
[pscustomobject]@{ profile = ($profile | ConvertFrom-Json); joins = $rows } | ConvertTo-Json -Depth 6
