# QA — priority §1: is the mount-prefix API bug class (#154) actually closed?
#
# imud (04), kupot (28) and mechiron (27) each shipped a bundle whose fetch()
# calls were written root-relative ("/api/..."). Served from more30.com/<mount>/
# those calls leave the app and land on the portal, which answers 404 text/html
# or 404 text/plain — so every one of them fails, and nothing looks broken from
# outside. Each was found one at a time. This asks the same question of every
# mounted system at once, against production rather than against the source
# tree, because the source tree is not what is being served.
#
# Method: GET the mount's index.html, take every same-origin <script src> under
# it, GET each asset, and count the root-relative API literals that survived
# into the emitted JavaScript. A hit is a candidate, not a verdict — the call
# still has to be reached at runtime.
#
# Usage: powershell -File scan.ps1   (writes _results.json next to itself)

$ErrorActionPreference = 'Stop'
$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp  = Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'

$mounts = @(
  'torah','tamlul','modaot','imud','briut','bkalot','smel','smachot','egod',
  'chatzor','chizukim','orech','mthbram','zchuyot','galil','studio','mechiron',
  'kupot','crm','gesher','nadlan','kesef','kiosk','tivuch','gannenet'
)

# Root-relative API literals as they appear in emitted bundles. Vite keeps the
# quoting style of the source, and template literals survive as backticks.
$patterns = @(
  @{ name = 'fetch("/api';  rx = 'fetch\(\s*"\/api\/' },
  @{ name = "fetch('/api";  rx = "fetch\(\s*'\/api\/" },
  @{ name = 'fetch(`/api';  rx = 'fetch\(\s*`\/api\/' },
  @{ name = 'axios "/api';  rx = '(get|post|put|patch|delete)\(\s*["''`]\/api\/' },
  @{ name = 'bare "/api/"'; rx = '["''`]\/api\/[a-zA-Z0-9_\-]' }
)

$results = @()

foreach ($m in $mounts) {
  $base = "https://more30.com/$m/"
  $row  = [ordered]@{ mount = $m; index_status = $null; assets = @(); hits = @(); error = $null }
  try {
    # No trailing slash and no query string. Every Next.js mount answers 308 to
    # "/<mount>/?..." and Invoke-WebRequest does not carry the query across that
    # redirect, which silently produced 0 assets for 7 of the 25 on the first
    # run. Staleness is covered another way: the asset names are content hashes
    # (and the Next mounts append ?dpl=<deployment>), so a stale index.html
    # would name a different file, not the same file with different contents.
    $html = (Invoke-WebRequest -Uri "https://more30.com/$m" -UseBasicParsing)
    $row.index_status = [int]$html.StatusCode
    $srcs = [regex]::Matches($html.Content, '<script[^>]+src="([^"]+)"') |
            ForEach-Object { $_.Groups[1].Value } |
            Where-Object { $_ -notmatch '^https?:' -and $_ -notmatch '^//' -and $_ -match '\.js' }

    foreach ($s in $srcs) {
      $u = if ($s.StartsWith('/')) { 'https://more30.com' + $s } else { $base + $s }
      try {
        $js = (Invoke-WebRequest -Uri $u -UseBasicParsing).Content
      } catch { continue }
      $row.assets += @{ url = $u; bytes = $js.Length }
      foreach ($p in $patterns) {
        $ms = [regex]::Matches($js, $p.rx)
        if ($ms.Count -gt 0) {
          # keep a short sample so the finding can be read without re-downloading
          $sample = ($ms | Select-Object -First 3 | ForEach-Object {
            $i = [Math]::Max(0, $_.Index - 10)
            $js.Substring($i, [Math]::Min(70, $js.Length - $i)) -replace '\s+', ' '
          }) -join ' ⋯ '
          $row.hits += @{ asset = $u; pattern = $p.name; count = $ms.Count; sample = $sample }
        }
      }
    }
  } catch {
    $row.error = $_.Exception.Message
  }
  $flag = if ($row.hits.Count -gt 0) { 'HIT' } else { '--' }
  '{0,-4} {1,-10} index={2} assets={3} hits={4}' -f $flag, $m, $row.index_status, $row.assets.Count, $row.hits.Count
  $results += $row
}

@{ what   = 'root-relative /api literals in the JavaScript production actually serves, per mount'
   when   = $stamp
   how    = 'GET more30.com/<mount>/ then GET each same-origin <script src>; regex the emitted bundle'
   note   = 'a hit is a candidate: the call site still has to be reached at runtime'
   mounts = $results } | ConvertTo-Json -Depth 8 | Out-File (Join-Path $outDir '_results.json') -Encoding utf8
