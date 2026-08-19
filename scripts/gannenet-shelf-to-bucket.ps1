# Moves the 258 seed shelf files of app 40 (gannenet) out of the source branch's
# git (public/shelf/**, 156MB) and into the Supabase bucket `gannenet-shelf`
# under seed/<id>.<ext>. Idempotent: an object already present at the right
# byte length is skipped. Reads the anon key from apps/40-gannenet/.env.local
# and the GitHub token from GitHub Desktop's credential manager - neither is
# written to disk here.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root   = "C:\Users\USER\Downloads\more30"
$app    = "$root\apps\40-gannenet"
$COMMIT = "f489e2c8437d5de79a46f5b7ef8e8b460784ccec"
$BUCKET = "gannenet-shelf"
$PREFIX = "seed"
$log    = "$root\QA\gannenet\shelf-transfer.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
function Say($m) { $line = "{0}  {1}" -f (Get-Date -Format "HH:mm:ss"), $m; Add-Content -Path $log -Value $line -Encoding utf8; Write-Output $line }

# --- credentials -------------------------------------------------------------
$envMap = @{}
Get-Content "$app\.env.local" | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') { $envMap[$Matches[1]] = $Matches[2].Trim() }
}
$SB_URL = $envMap["SUPABASE_URL"]
$SB_KEY = $envMap["SUPABASE_ANON_KEY"]
if (-not $SB_URL -or -not $SB_KEY) { throw "SUPABASE_URL / SUPABASE_ANON_KEY missing from .env.local" }

$gitRoot = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop" -Directory -Filter "app-*" |
            Sort-Object Name -Descending | Select-Object -First 1).FullName + "\resources\app\git"
$env:PATH = "$gitRoot\cmd;$gitRoot\mingw64\bin;" + $env:PATH
$tok = ("protocol=https`nhost=github.com`nusername=l023131500-ops`n`n" |
        & "$gitRoot\mingw64\bin\git-credential-manager.exe" get |
        Where-Object { $_ -like "password=*" }) -replace '^password=', ''
if (-not $tok) { throw "no GitHub token" }
$ghHead = @{ Authorization = "Bearer $tok"; "User-Agent" = "more30" }

# --- what to move ------------------------------------------------------------
$tree = Invoke-RestMethod -Headers $ghHead -Uri "https://api.github.com/repos/l023131500-ops/-/git/trees/$COMMIT`?recursive=1"
$shelf = @($tree.tree | Where-Object { $_.type -eq "blob" -and $_.path -like "gannenet-app/public/shelf/*" })
Say "shelf blobs at ${COMMIT}: $($shelf.Count), $([math]::Round((($shelf | Measure-Object size -Sum).Sum)/1MB,1)) MB"

$mime = @{ ".pdf" = "application/pdf"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".png" = "image/png" }
$done = 0; $skipped = 0; $failed = @()

foreach ($b in $shelf) {
  $name = Split-Path $b.path -Leaf
  $ext  = [IO.Path]::GetExtension($name).ToLower()
  $ct   = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
  $dest = "$SB_URL/storage/v1/object/$BUCKET/$PREFIX/$name"

  # already there at the right length?
  try {
    $h = Invoke-WebRequest -Method Head -Uri "$SB_URL/storage/v1/object/public/$BUCKET/$PREFIX/$name" -UseBasicParsing
    if ([int]$h.Headers["Content-Length"] -eq [int]$b.size) { $skipped++; continue }
  } catch { }

  try {
    # raw.githubusercontent.com is blocked by NetFree from this machine (HTTP 418);
    # api.github.com is not, so pull the blob as base64 and decode it here.
    $blob  = Invoke-RestMethod -Headers $ghHead -Uri "https://api.github.com/repos/l023131500-ops/-/git/blobs/$($b.sha)"
    $bytes = [Convert]::FromBase64String($blob.content)
    if ($bytes.Length -ne [int]$b.size) { throw "size mismatch: got $($bytes.Length), blob says $($b.size)" }
    Invoke-WebRequest -Method Post -Uri $dest -UseBasicParsing -Body $bytes -Headers @{
      apikey = $SB_KEY; Authorization = "Bearer $SB_KEY"; "x-upsert" = "true"
    } -ContentType $ct | Out-Null
    $done++
  } catch {
    $failed += [pscustomobject]@{ name = $name; size = $b.size; error = $_.Exception.Message }
    Say "FAIL $name - $($_.Exception.Message)"
  }
  if ((($done + $skipped) % 25) -eq 0) { Say "progress: uploaded=$done skipped=$skipped failed=$($failed.Count) of $($shelf.Count)" }
}

Say "TRANSFER DONE uploaded=$done skipped=$skipped failed=$($failed.Count)"
if ($failed.Count) { $failed | ConvertTo-Json -Depth 3 | Out-File "$root\QA\gannenet\shelf-transfer-failures.json" -Encoding utf8 }
