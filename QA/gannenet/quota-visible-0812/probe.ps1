# 40 (גן-קליק): המכסה היומית של המחולל — עכשיו גם נקראת, לא רק נאכפת.
#
# ההמשך הישיר של QA/gannenet/ai-generate-quota-0812: שם נסגר "כמה מותר", וכאן
# נסגר "כמה נשאר לי, לפני שאני לוחצת". הנתיב החדש GET /api/ai-generate/quota
# קורא בלבד — הוא לא מזמין, לא כותב סימון, ולא מוציא שקל.
#
#   powershell -File probe.ps1
#
# רגל א' — אנונימי: 401, אותו גידור כמו במחולל עצמו.
# רגל ב' — מחוברת, כשהמכסה מוצתה: המספרים האמיתיים (20/20, remaining 0).
# רגל ג' — ניקוי סימוני ה-seed המלאכותיים של הפעימה הקודמת (במפתח השירות, כי
#          המפתח האנונימי אינו יכול למחוק), ושאילה חוזרת: יתרה אמיתית חוזרת.
# רגל ד' — הספירה נמדדת מול אותו LIST שהשרת סופר בו, לא מהצהרת השרת על עצמו.
#
# אין כאן סוד בריפו: הכל נקרא מ-apps/40-gannenet/.env.local (gitignored).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$envFile = Join-Path $root "apps\40-gannenet\.env.local"
$cfg = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match "^([A-Z_]+)=(.*)$") { $cfg[$matches[1]] = $matches[2].Trim('"') } }

$api = "https://more30.com/gannenet/api/ai-generate/quota"
$bucket = "gannenet-shelf"
$today = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
$prefix = "usage/aigen/$today"
$anon = @{ apikey = $cfg.SUPABASE_ANON_KEY; Authorization = "Bearer $($cfg.SUPABASE_ANON_KEY)" }

function Show([string]$leg, [scriptblock]$call) {
  $t0 = Get-Date
  try {
    $r = & $call
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    Write-Output "$leg`: status=$($r.StatusCode) ms=$ms body=$($txt.Substring(0, [Math]::Min(220, $txt.Length)))"
  } catch {
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $resp = $_.Exception.Response
    if (-not $resp) { Write-Output "$leg`: no-http-response ms=$ms err=$($_.Exception.Message)"; return }
    $body = (New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd()
    Write-Output "$leg`: status=$([int]$resp.StatusCode) ms=$ms body=$($body.Substring(0, [Math]::Min(240, $body.Length)))"
  }
}

function ListMarks([string]$uid) {
  $b = [Text.Encoding]::UTF8.GetBytes((@{ prefix = $prefix; limit = 500 } | ConvertTo-Json))
  $r = Invoke-RestMethod -Uri "$($cfg.SUPABASE_URL)/storage/v1/object/list/$bucket" -Method POST `
    -Headers $anon -ContentType "application/json" -Body $b
  return @($r | Where-Object { $_.id } | Where-Object { $_.name -like "$uid`__*" } | ForEach-Object { $_.name })
}

Show "anonymous " { Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 60 }

$pw = if ($env:GN_TEST_PASSWORD) { $env:GN_TEST_PASSWORD } else { "More30Test2026" }
$login = Invoke-RestMethod -Uri "$($cfg.SUPABASE_URL)/auth/v1/token?grant_type=password" -Method POST `
  -Headers @{ apikey = $cfg.SUPABASE_ANON_KEY } -ContentType "application/json" `
  -Body (@{ email = "test@more30.com"; password = $pw } | ConvertTo-Json)
$uid = $login.user.id
$tok = $login.access_token
Write-Output "signed in as test@more30.com (sub=$uid), day=$today"

$marks = ListMarks $uid
Write-Output "marks now    : user=$($marks.Count)  seeded=$(@($marks | Where-Object { $_ -like '*__seed-*' }).Count)"
Show "quota-full" { Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 60 -Headers @{ Authorization = "Bearer $tok" } }

# סימוני ה-seed הם פיקסטורה של הפעימה הקודמת ולא שימוש אמיתי; הם נמחקים כדי
# שהמסך יראה יתרה אמיתית. מחיקה דורשת את מפתח השירות — המפתח האנונימי אינו יכול.
$seeded = @($marks | Where-Object { $_ -like "*__seed-*" })
if ($seeded.Count -gt 0 -and $cfg.SUPABASE_SERVICE_ROLE_KEY) {
  $svc = @{ apikey = $cfg.SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $($cfg.SUPABASE_SERVICE_ROLE_KEY)" }
  $b = [Text.Encoding]::UTF8.GetBytes((@{ prefixes = @($seeded | ForEach-Object { "$prefix/$_" }) } | ConvertTo-Json))
  Invoke-WebRequest -Uri "$($cfg.SUPABASE_URL)/storage/v1/object/$bucket" -Method DELETE `
    -Headers $svc -ContentType "application/json" -Body $b -UseBasicParsing | Out-Null
  Write-Output "deleted $($seeded.Count) seeded QA marks"
}

$marks2 = ListMarks $uid
Write-Output "marks after  : user=$($marks2.Count)   # real generations only"
Show "quota-real" { Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 60 -Headers @{ Authorization = "Bearer $tok" } }
Write-Output "token-for-browser=$tok"
