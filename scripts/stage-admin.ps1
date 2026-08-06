# stage-admin.ps1 — מכין את מרכז השליטה (admin) לפריסה ל-nihul-more30.
#
# פרויקט ה-Vercel הזה מוגדר "בלי בנייה" (Build Command = echo no-build,
# Output Directory = .), כלומר הוא מגיש בדיוק את התיקייה שנדחפת אליו. הקבצים
# יושבים אצלו תחת **admin/** ולא בשורש, ולכן more30.com/admin/assets/... עובד.
# מכאן שתי דרישות שחייבות להתקיים יחד, ואם אחת מהן נשברת האתר עולה ריק:
#   1. vite חייב לבנות עם base "/admin/"  (admin/vite.config.ts)
#   2. הפריסה חייבת לשים את הפלט בתוך תיקיית admin/ ולא בשורש
#
# ⚠️ ה-base היה "./" עד 06/08/2026, וזו הייתה תקלה שקטה: הכתובת הקנונית היא
# more30.com/admin בלי לוכסן סוגר, ונתיב יחסי נפתר מול שורש האתר — כלומר
# ./assets/x הופך ל-/assets/x ונופל. אותה מלכודת בדיוק שכבר תוקנה ב-12
# קונפיגים תחת apps/.
#
# ⚠️ בלי .vercel/project.json בתוך התיקייה הנפרסת, `vercel deploy` מסיק את שם
# הפרויקט משם התיקייה ויוצר פרויקט חדש — הפריסה "מצליחה" ו-more30.com/admin
# ממשיך להגיש את הגרסה הישנה.
#
# שימוש:
#   cd admin; .\node_modules\.bin\vite.CMD build; cd ..
#   pwsh scripts/stage-admin.ps1
#   cd admin/deploy; vercel deploy --prod --yes --scope l023131500-ops-projects

$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot
$admin = Join-Path $root 'admin'
$dist  = Join-Path $admin 'dist'
$out   = Join-Path $admin 'deploy'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw "admin/dist/index.html חסר — הרץ קודם את הבנייה."
}

# הבדיקה שמונעת את התקלה שבגללה הקובץ הזה נכתב: אם ה-HTML הבנוי אינו מפנה
# ל-/admin/assets, ה-base שגוי והפריסה תעלה מסך ריק. עדיף להיעצר כאן.
$html = [System.IO.File]::ReadAllText((Join-Path $dist 'index.html'), [System.Text.Encoding]::UTF8)
if ($html -notmatch '/admin/assets/') {
  throw "ה-HTML הבנוי אינו מפנה ל-/admin/assets — base שגוי ב-admin/vite.config.ts. לא נפרס."
}

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $out 'admin') | Out-Null
Copy-Item (Join-Path $dist '*') (Join-Path $out 'admin') -Recurse -Force

$linkSrc = Join-Path $admin 'vercel.project.json'
if (Test-Path $linkSrc) {
  New-Item -ItemType Directory -Force -Path (Join-Path $out '.vercel') | Out-Null
  Copy-Item $linkSrc (Join-Path $out '.vercel\project.json') -Force
} else {
  Write-Warning "admin/vercel.project.json חסר — הפריסה עלולה ליצור פרויקט חדש במקום לעדכן את nihul-more30"
}

Get-ChildItem $out -Recurse -File -Force | ForEach-Object { $_.FullName.Substring($out.Length + 1) }
