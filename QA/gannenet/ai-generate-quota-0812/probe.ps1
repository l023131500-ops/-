# מחולל דפי המשימה של 40 (גן-קליק): כמה יכולה משתמשת מחוברת להוציא ביום.
#
# ההמשך הישיר של QA/gannenet/ai-generate-auth-0812 — שם נסגר "מי", כאן נסגר "כמה".
# מריצים מכל מקום. אין כאן שום סוד: ה-URL וה-anon key נקראים מ-apps/40-gannenet/.env.local
# (שאינו בגיט), והסיסמה של משתמש הבדיקה הרשמי (§1ב) נלקחת מ-$env:GN_TEST_PASSWORD
# אם הוגדרה, אחרת מברירת המחדל המתועדת ב-LOGINS.md.
#
#   powershell -File probe.ps1
#
# רגל א' — יצירה אחת אמיתית: חייבת להמשיך לעבוד (התקרה לא נסגרה על הגננת).
# רגל ב' — מילוי המכסה האישית ואז לחיצה נוספת: 429 מיידי, בלי קריאה במעלה הזרם.
# רגל ג' — אנונימי: עדיין 401, כלומר הגידור של #185 לא נשבר בדרך.
#
# ⚠️ רגל ב' כותבת סימוני שימוש אמיתיים לחשבון הבדיקה, ולכן היא מכלה את המכסה
# היומית שלו. היא מתאפסת בחצות UTC. אין לה שום השפעה על חשבון אחר.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$envFile = Join-Path $root "apps\40-gannenet\.env.local"
$cfg = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match "^([A-Z_]+)=(.*)$") { $cfg[$matches[1]] = $matches[2].Trim('"') } }

$api = "https://more30.com/gannenet/api/ai-generate"
$bucket = "gannenet-shelf"
$today = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
$prefix = "usage/aigen/$today"
$hdr = @{ apikey = $cfg.SUPABASE_ANON_KEY; Authorization = "Bearer $($cfg.SUPABASE_ANON_KEY)" }
$payload = '{"topic":"בדיקת מכסה — סימני הסתיו","ageGroup":"טרום־חובה (3–5)","style":"דף עבודה"}'
$bytes = [Text.Encoding]::UTF8.GetBytes($payload)

function Show([string]$leg, [scriptblock]$call) {
  $t0 = Get-Date
  try {
    $r = & $call
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    Write-Output "$leg`: status=$($r.StatusCode) ms=$ms body=$($txt.Substring(0, [Math]::Min(160, $txt.Length)))"
  } catch {
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $resp = $_.Exception.Response
    if (-not $resp) { Write-Output "$leg`: no-http-response ms=$ms err=$($_.Exception.Message)"; return }
    $body = (New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd()
    Write-Output "$leg`: status=$([int]$resp.StatusCode) ms=$ms body=$($body.Substring(0, [Math]::Min(240, $body.Length)))"
  }
}

# הספירה נעשית באותו LIST שהשרת עצמו סופר בו, ולא בטענה של השרת על עצמו.
function CountMarks([string]$uid) {
  $b = [Text.Encoding]::UTF8.GetBytes((@{ prefix = $prefix; limit = 500 } | ConvertTo-Json))
  $r = Invoke-RestMethod -Uri "$($cfg.SUPABASE_URL)/storage/v1/object/list/$bucket" -Method POST `
    -Headers $hdr -ContentType "application/json" -Body $b
  $rows = @($r | Where-Object { $_.id })
  $mine = @($rows | Where-Object { $_.name -like "$uid`__*" })
  return @{ all = $rows.Count; user = $mine.Count }
}

$pw = if ($env:GN_TEST_PASSWORD) { $env:GN_TEST_PASSWORD } else { "More30Test2026" }
$login = Invoke-RestMethod -Uri "$($cfg.SUPABASE_URL)/auth/v1/token?grant_type=password" -Method POST `
  -Headers @{ apikey = $cfg.SUPABASE_ANON_KEY } -ContentType "application/json" `
  -Body (@{ email = "test@more30.com"; password = $pw } | ConvertTo-Json)
$uid = $login.user.id
$tok = $login.access_token
Write-Output "signed in as test@more30.com (sub=$uid), day=$today"

$before = CountMarks $uid
Write-Output "marks before : user=$($before.user) all=$($before.all)"

Show "generate-1" { Invoke-WebRequest -Uri $api -Method POST -UseBasicParsing -TimeoutSec 180 `
  -Headers @{ Authorization = "Bearer $tok" } -ContentType "application/json; charset=utf-8" -Body $bytes }

$after = CountMarks $uid
Write-Output "marks after  : user=$($after.user) all=$($after.all)"

# מילוי היתרה עד התקרה האישית (20 כברירת מחדל), בדיוק באותו שם-אובייקט שהשרת כותב.
$capUser = if ($env:GN_CAP_USER) { [int]$env:GN_CAP_USER } else { 20 }
$need = $capUser - $after.user
Write-Output "seeding $need marks to reach the per-account cap ($capUser)"
for ($i = 0; $i -lt $need; $i++) {
  $name = "$prefix/$uid`__seed-$i.json"
  $b = [Text.Encoding]::UTF8.GetBytes((@{ at = (Get-Date).ToUniversalTime().ToString("o"); user = $uid; seeded = $true } | ConvertTo-Json))
  Invoke-WebRequest -Uri "$($cfg.SUPABASE_URL)/storage/v1/object/$bucket/$name" -Method POST `
    -Headers $hdr -ContentType "application/json" -Body $b -UseBasicParsing | Out-Null
}
$full = CountMarks $uid
Write-Output "marks at cap : user=$($full.user) all=$($full.all)"

Show "over-cap  " { Invoke-WebRequest -Uri $api -Method POST -UseBasicParsing -TimeoutSec 180 `
  -Headers @{ Authorization = "Bearer $tok" } -ContentType "application/json; charset=utf-8" -Body $bytes }

Show "anonymous " { Invoke-WebRequest -Uri $api -Method POST -ContentType "application/json; charset=utf-8" -Body $bytes -UseBasicParsing -TimeoutSec 120 }

$end = CountMarks $uid
Write-Output "marks end    : user=$($end.user) all=$($end.all)   # סירוב אינו נספר"
