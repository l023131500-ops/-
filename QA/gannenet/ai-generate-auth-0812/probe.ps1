# מחולל דפי המשימה של 40 (גן-קליק): מי מותר לו להוציא כסף מהמפתח שלנו.
#
# מריצים מכל מקום. אין כאן שום סוד: ה-URL וה-anon key נקראים מ-apps/40-gannenet/.env.local
# (שאינו בגיט), והסיסמה של משתמש הבדיקה הרשמי (§1ב) נלקחת מ-$env:GN_TEST_PASSWORD
# אם הוגדרה, אחרת מברירת המחדל המתועדת ב-LOGINS.md.
#
#   powershell -File probe.ps1
#
# רגל א' — בלי טוקן:  לפני התיקון 200 + דף מלא (44.7 שניות של Opus על חשבוננו).
#                      אחרי התיקון 401 מיידי, בלי שום קריאה במעלה הזרם.
# רגל ב' — עם טוקן:   200 + דף אמיתי, כדי שהגידור לא ייסגר על הגננת עצמה.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$envFile = Join-Path $root "apps\40-gannenet\.env.local"
$cfg = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match "^([A-Z_]+)=(.*)$") { $cfg[$matches[1]] = $matches[2].Trim('"') } }

$api = "https://more30.com/gannenet/api/ai-generate"
$payload = '{"topic":"בדיקת אבטחה — האות א׳","ageGroup":"טרום־חובה (3–5)","style":"דף עבודה"}'
$bytes = [Text.Encoding]::UTF8.GetBytes($payload)

function Show([string]$leg, [scriptblock]$call) {
  $t0 = Get-Date
  try {
    $r = & $call
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    Write-Output "$leg`: status=$($r.StatusCode) ms=$ms body=$($txt.Substring(0, [Math]::Min(150, $txt.Length)))"
  } catch {
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $resp = $_.Exception.Response
    if (-not $resp) { Write-Output "$leg`: no-http-response ms=$ms err=$($_.Exception.Message)"; return }
    $body = (New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd()
    Write-Output "$leg`: status=$([int]$resp.StatusCode) ms=$ms body=$($body.Substring(0, [Math]::Min(200, $body.Length)))"
  }
}

Show "anonymous " { Invoke-WebRequest -Uri $api -Method POST -ContentType "application/json; charset=utf-8" -Body $bytes -UseBasicParsing -TimeoutSec 120 }

# משתמש הבדיקה הרשמי של §1ב מול אותו פרויקט שהאפליקציה מדברת איתו.
$pw = if ($env:GN_TEST_PASSWORD) { $env:GN_TEST_PASSWORD } else { "More30Test2026" }
$login = Invoke-RestMethod -Uri "$($cfg.SUPABASE_URL)/auth/v1/token?grant_type=password" -Method POST `
  -Headers @{ apikey = $cfg.SUPABASE_ANON_KEY } -ContentType "application/json" `
  -Body (@{ email = "test@more30.com"; password = $pw } | ConvertTo-Json)
Write-Output "signed in as test@more30.com (sub=$($login.user.id))"

Show "signed-in " { Invoke-WebRequest -Uri $api -Method POST -UseBasicParsing -TimeoutSec 180 `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } `
  -ContentType "application/json; charset=utf-8" -Body $bytes }

# טוקן שאינו טוקן — כדי שהגידור לא ייפול על "יש כותרת, אז בסדר".
Show "junk-token" { Invoke-WebRequest -Uri $api -Method POST -UseBasicParsing -TimeoutSec 120 `
  -Headers @{ Authorization = "Bearer not-a-real-token" } `
  -ContentType "application/json; charset=utf-8" -Body $bytes }
