# Set-VercelEnv.ps1 - write one production env var to a Vercel project, without BOM.
#
# Why this exists: piping a value into `vercel env add` from PowerShell prepends a
# UTF-8 BOM to the value. supabase-js then dies at cold start building the auth
# header ("ByteString ... 65279"), and `vercel env pull` returns "[SECRET]" so the
# corrupted value is invisible. This writes the value to a BOM-less file and feeds
# it through cmd.exe stdin redirection, which PowerShell's pipeline never touches.
#
# NOTE: comments here are deliberately English-only. PowerShell 5.1 reads a .ps1
# without a BOM as ANSI, which corrupts Hebrew badly enough to be a parse error.
#
# Usage:
#   .\scripts\Set-VercelEnv.ps1 -Project tamlul-more30 -Name OPENAI_API_KEY -Value sk-...
#
# The value is never echoed and never stored in this repo.

[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Project,
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Value,
  [string]$Target = 'production',
  [string]$Scope  = 'l023131500-ops-projects',
  [string]$Vercel = "$env:APPDATA\npm\vercel.ps1"
)

$ErrorActionPreference = 'Stop'

$work = Join-Path ([System.IO.Path]::GetTempPath()) ("venv-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $work | Out-Null
Push-Location $work
try {
  & $Vercel link --project $Project --scope $Scope --yes | Out-Null

  # Remove first so re-running updates instead of erroring on a duplicate.
  & $Vercel env rm $Name $Target --yes --scope $Scope 2>$null | Out-Null

  $valueFile = Join-Path $work 'value.txt'
  [System.IO.File]::WriteAllText($valueFile, $Value, (New-Object System.Text.UTF8Encoding($false)))

  cmd /c "`"powershell`" -NoProfile -File `"$Vercel`" env add $Name $Target --scope $Scope < `"$valueFile`""
  if ($LASTEXITCODE -ne 0) { throw "vercel env add failed for $Name (exit $LASTEXITCODE)" }

  Write-Host "OK: $Name set on $Project ($Target). Redeploy the project for it to take effect."
}
finally {
  Pop-Location
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
