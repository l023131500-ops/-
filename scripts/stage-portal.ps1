# stage-portal.ps1 — מכין את portal/dist לפריסה ל-Vercel.
#
# vite מוחק את dist/ בכל build, ולכן שני הדברים שלא מגיעים מה-build עצמו —
# vercel.json (מפת ה-rewrites לכל המערכות) ותיקיית api/ (פונקציית ניתוח ה-AI) —
# נשמרים במקור ומועתקים כאן. בלי זה, build אחד מוחק את כל הניתוב.
#
# שימוש:  pwsh scripts/stage-portal.ps1   ואז:
#         cd portal/dist; vercel deploy --prod --yes --scope l023131500-ops-projects

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot
$portal = Join-Path $root 'portal'
$dist   = Join-Path $portal 'dist'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw "dist/index.html חסר — הרץ קודם: npx pnpm --filter @more30/portal build"
}

Copy-Item (Join-Path $portal 'vercel.dist.json') (Join-Path $dist 'vercel.json') -Force

# בלי .vercel/project.json בתוך dist, `vercel deploy` מסיק את שם הפרויקט משם
# התיקייה ויוצר פרויקט חדש בשם "dist" — הפריסה מצליחה אבל more30.com לא מתעדכן.
# הקישור נשמר במקור ומועתק לכאן בכל staging.
$linkSrc = Join-Path $portal 'vercel.project.json'
if (Test-Path $linkSrc) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dist '.vercel') | Out-Null
  Copy-Item $linkSrc (Join-Path $dist '.vercel\project.json') -Force
} else {
  Write-Warning "portal/vercel.project.json חסר — הפריסה עלולה ליצור פרויקט חדש במקום לעדכן את more30-portal"
}

# 37 bkalot-clone — עמוד סטטי יחיד בלי build ובלי נכסים יחסיים, ולכן הוא מוגש
# מתוך הפורטל עצמו ולא מפרויקט Vercel נפרד. המקור נשאר apps/37-bkalot-clone
# (שם יושב גם app.json), ומועתק לכאן בכל staging כדי שלא יהיה עותק שני בריפו
# שיכול להיפרד מהראשון. throw ולא warning: פריסה בלי הקובץ מגישה 404 בנתיב
# שה-rewrite כבר מכריז עליו.
$cloneSrc = Join-Path $root 'apps\37-bkalot-clone\index.html'
if (-not (Test-Path $cloneSrc)) {
  throw "apps/37-bkalot-clone/index.html חסר — /bkalot-studio ייפרס כ-404"
}
$cloneAdminSrc = Join-Path $root 'apps\37-bkalot-clone\admin.html'
if (-not (Test-Path $cloneAdminSrc)) {
  throw "apps/37-bkalot-clone/admin.html חסר — /bkalot-studio/admin ייפרס כ-404"
}
$cloneFaviconSrc = Join-Path $root 'apps\37-bkalot-clone\favicon.svg'
$cloneDst = Join-Path $dist 'bkalot-studio'
New-Item -ItemType Directory -Force -Path $cloneDst | Out-Null
Copy-Item $cloneSrc (Join-Path $cloneDst 'index.html') -Force
Copy-Item $cloneAdminSrc (Join-Path $cloneDst 'admin.html') -Force
if (Test-Path $cloneFaviconSrc) {
  Copy-Item $cloneFaviconSrc (Join-Path $cloneDst 'favicon.svg') -Force
}

# 38 events-gifts + 39 maatefet — אותו דפוס בדיוק כמו 37: עמודים סטטיים בלי
# build ובלי נכסים יחסיים חיצוניים (ה-API שלהם הוא public.evg_*/maatefet_* על
# Supabase), ולכן מוגשים מתוך הפורטל עצמו במקום להמתין לפרויקט Vercel נפרד —
# הפריט שחסם את שניהם ב-NEEDS_USER. המקור נשאר sites/<n>/ ומועתק בכל staging
# כדי שלא יהיה עותק שני בריפו. throw ולא warning: ה-rewrites כבר מוכרזים
# ב-vercel.dist.json, ופריסה בלי הקבצים מגישה 404 בנתיב שהוכרז.
$staticSites = @(
  @{ src = 'sites\38-events-gifts\events'; dst = 'events' },
  @{ src = 'sites\39-maatefet\maatefet';   dst = 'maatefet' }
)
foreach ($s in $staticSites) {
  $srcDir = Join-Path $root $s.src
  if (-not (Test-Path (Join-Path $srcDir 'index.html'))) {
    throw "$($s.src)\index.html חסר — /$($s.dst) ייפרס כ-404"
  }
  $dstDir = Join-Path $dist $s.dst
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  Copy-Item (Join-Path $srcDir '*') $dstDir -Recurse -Force
}

$apiSrc = Join-Path $portal 'api'
if (Test-Path $apiSrc) {
  $apiDst = Join-Path $dist 'api'
  New-Item -ItemType Directory -Force -Path $apiDst | Out-Null
  Copy-Item (Join-Path $apiSrc '*') $apiDst -Recurse -Force
}

Get-ChildItem $dist -Recurse -File | ForEach-Object { $_.FullName.Substring($dist.Length + 1) }
