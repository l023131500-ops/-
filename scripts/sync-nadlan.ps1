# Sync the nadlan-berega repo into apps/32-nadlan-berega, one direction only.
#
# The repo is the single source of truth. apps/32 exists because it is the copy
# linked to the Vercel project nadlan-more30 and it carries the basePath config,
# which the repo must not have (the repo stays deployable at a domain root).
#
# Two files are therefore never overwritten:
#   next.config.mjs   - basePath / assetPrefix = /nadlan
#   .vercel/          - the project link
#
# Splitting these copies once cost a full round: eight development stages sat in
# the repo while more30.com/nadlan served the copy, so none of the work was
# visible even though the code had been on the machine for two days.

param(
  [string]$Repo = 'C:\Users\USER\Downloads\nadlan-berega',
  [string]$Copy = 'C:\Users\USER\Downloads\more30\apps\32-nadlan-berega'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Repo)) { throw "repo not found: $Repo" }
if (-not (Test-Path $Copy)) { throw "copy not found: $Copy" }

$exclude = @('node_modules', '.next', '.git', '.vercel', 'next.config.mjs',
             '.env.local', 'next-env.d.ts', 'tsconfig.tsbuildinfo', '_deploy')

$copied = 0
Get-ChildItem $Repo -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($Repo.Length + 1)
  $top = $rel.Split('\')[0]
  if ($exclude -contains $top -or $exclude -contains $_.Name) { return }
  if ($rel -match '\\node_modules\\|\\\.next\\|\\\.git\\') { return }

  $dest = Join-Path $Copy $rel
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

  $same = $false
  if (Test-Path $dest) {
    $same = (Get-FileHash $_.FullName).Hash -eq (Get-FileHash $dest).Hash
  }
  if (-not $same) {
    Copy-Item $_.FullName $dest -Force
    $script:copied++
    Write-Output "  + $rel"
  }
}

Write-Output "synced $copied file(s) from repo -> apps/32"
