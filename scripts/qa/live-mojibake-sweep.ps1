<#
  Is any LIVE mount serving double-encoded Hebrew right now?

  scripts/qa/mojibake-scan.mjs answers a different question. It reads the repo:
  every source tree, plus _deploy/**/*.html because that is where the two known
  corruptions (22 zchuyot, 01 torah, both 13/08) actually landed. That is the
  right check to run before a commit.

  It is not proof about production. A clean _deploy only means the copy on this
  disk is clean -- it says nothing about whether that copy was ever deployed, and
  several mounts are built by Vercel from source rather than served from _deploy
  at all. Both known corruptions were found by fetching the live URL and looking,
  not by reading the repo. So this sweep asks the customer's question directly:
  fetch what more30.com returns, and decide on those bytes.

  Detection is two-stage, and the second stage is what makes a hit reportable:

    1. FLAG -- a run of U+05F3 geresh separated by single characters. A lone
       geresh is good Hebrew (צ׳יפ, ג׳ינס, ר׳), so the character alone proves
       nothing; the mangling emits one per letter, so a RUN is the fingerprint.

    2. CONFIRM -- the round trip. Take the served text, write it back out as
       cp1255 (this machine's ANSI codepage, and the default Set-Content uses
       when -Encoding is omitted -- the actual cause both times), then read those
       bytes as UTF-8. If clean Hebrew comes back, the corruption is exactly one
       reversible cp1255<-UTF-8 misread and the recovered text IS the original.
       If it does not round-trip, the flag is something else and is reported as
       unconfirmed rather than as a finding.

  Read-only: it fetches and reports. Protected systems (08, 09) have no
  live_url and are not in the list.

    powershell -File scripts/qa/live-mojibake-sweep.ps1 [-OutDir QA/platform/...]
#>
param(
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# core.projects: every non-protected row with a live_url, 13/08.
$targets = @(
  @{ n = '01'; name = 'torah';    url = 'https://more30.com/torah/' }
  @{ n = '02'; name = 'tamlul';   url = 'https://more30.com/tamlul/' }
  @{ n = '03'; name = 'modaot';   url = 'https://more30.com/modaot/' }
  @{ n = '04'; name = 'imud';     url = 'https://more30.com/imud/' }
  @{ n = '06'; name = 'briut';    url = 'https://more30.com/briut/' }
  @{ n = '10'; name = 'bkalot';   url = 'https://more30.com/bkalot/' }
  @{ n = '12'; name = 'smel';     url = 'https://more30.com/smel/' }
  @{ n = '14'; name = 'smachot';  url = 'https://more30.com/smachot/' }
  @{ n = '15'; name = 'egod';     url = 'https://more30.com/egod/' }
  @{ n = '16'; name = 'chatzor';  url = 'https://more30.com/chatzor/' }
  @{ n = '17'; name = 'chizukim'; url = 'https://more30.com/chizukim/' }
  @{ n = '18'; name = 'orech';    url = 'https://more30.com/orech/' }
  @{ n = '21'; name = 'mthbram';  url = 'https://more30.com/mthbram/' }
  @{ n = '22'; name = 'zchuyot';  url = 'https://more30.com/zchuyot/' }
  @{ n = '24'; name = 'galil';    url = 'https://more30.com/galil/' }
  @{ n = '26'; name = 'studio';   url = 'https://more30.com/studio/' }
  @{ n = '27'; name = 'mechiron'; url = 'https://more30.com/mechiron/' }
  @{ n = '28'; name = 'kupot';    url = 'https://more30.com/kupot/' }
  @{ n = '30'; name = 'crm';      url = 'https://more30.com/crm/' }
  @{ n = '31'; name = 'gesher';   url = 'https://more30.com/gesher/' }
  @{ n = '32'; name = 'nadlan';   url = 'https://more30.com/nadlan/' }
  @{ n = '33'; name = 'portal';   url = 'https://more30.com/' }
  @{ n = '34'; name = 'kesef';    url = 'https://more30.com/kesef/' }
  @{ n = '35'; name = 'kiosk';    url = 'https://more30.com/kiosk/' }
  @{ n = '36'; name = 'tivuch';   url = 'https://more30.com/tivuch/' }
  @{ n = '40'; name = 'gannenet'; url = 'https://more30.com/gannenet/' }
)

$utf8 = [Text.Encoding]::UTF8
$cp1255 = [Text.Encoding]::GetEncoding(1255)

# Every Hebrew character below is built from its code point, and this file is
# deliberately pure ASCII. That is not style. PowerShell 5.1 parses a .ps1 with
# no BOM using the machine's ANSI codepage -- cp1255 here -- so a literal ׳ in
# the source is silently mangled into three characters and the pattern matches
# nothing. A detector written the obvious way reports every page clean while
# being blind, which is worse than not running it: it is the same cp1255 misread
# this script exists to find, turned on the script itself. Caught on 13/08 by the
# controls below, on a run that had already printed 26 clean pages twice.
$GERESH = [char]0x05F3                       # U+05F3 HEBREW PUNCTUATION GERESH
$geresh_re = [regex]([regex]::Escape($GERESH))
# three markers separated by a single non-space character each: the fingerprint
# of per-letter mangling, not of ordinary Hebrew punctuation
$run = [regex]("{0}[^\s]{0}[^\s]{0}" -f [regex]::Escape($GERESH))

# --- controls -------------------------------------------------------------
# A sweep that reports "all clean" is indistinguishable from a sweep whose
# detector never fires, and every mount here happens to score zero. So the
# detector is exercised on real corruption before it is trusted on real pages:
# the live HTML 01 torah was serving on 13/08, captured in the commit that fixed
# it. If either control fails the sweep aborts rather than print a false all-clear.
$posPath = 'QA/torah/encoding-0813/before-live-index.html'
if (Test-Path $posPath) {
  $bad = Get-Content -Raw -Encoding UTF8 $posPath
  $badG = $geresh_re.Matches($bad).Count
  $rec = $utf8.GetString($cp1255.GetBytes($bad))
  $recG = $geresh_re.Matches($rec).Count
  $posOk = $run.IsMatch($bad) -and (-not $run.IsMatch($rec)) -and ($recG -lt $badG)
  Write-Host ("control + : {0} geresh={1} -> recovered={2} flagged+confirmed={3}" -f (Split-Path $posPath -Leaf), $badG, $recG, $posOk)
  if (-not $posOk) { Write-Error 'positive control failed: the detector does not fire on known corruption. aborting.'; exit 2 }
} else {
  Write-Warning "positive control fixture missing ($posPath) -- a clean result below is unverified."
}
# healthy Hebrew: a lone geresh is a letter, not a defect, and must not flag.
# "צ׳יפ ג׳ינס ר׳" -- three real words that each legitimately carry a geresh.
$healthy = -join @(0x05E6,0x05F3,0x05D9,0x05E4,0x0020,0x05D2,0x05F3,0x05D9,0x05E0,0x05E1,0x0020,0x05E8,0x05F3 | ForEach-Object { [char]$_ })
$negOk = -not $run.IsMatch($healthy)
Write-Host ("control - : healthy Hebrew with lone gershayim flagged={0}" -f (-not $negOk))
if (-not $negOk) { Write-Error 'negative control failed: the detector condemns correct Hebrew. aborting.'; exit 2 }
Write-Host ''
# --------------------------------------------------------------------------

$rows = @()
foreach ($t in $targets) {
  $row = [ordered]@{
    number = $t.n; name = $t.name; url = $t.url
    status = $null; bytes = 0; geresh = 0; flagged = $false
    confirmed = $null; title = ''; recovered_title = ''; error = ''
  }
  try {
    # 308 must be followed by hand. HttpWebRequest on .NET Framework (what PS 5.1
    # runs on) auto-follows 301/302/303/307 but throws on 308, and seven of these
    # mounts answer 308 -- reporting them as unreachable would read as "not
    # corrupt" for exactly the pages nobody has looked at.
    $url = $t.url
    $raw = $null
    for ($hop = 0; $hop -lt 5; $hop++) {
      $req = [Net.HttpWebRequest]::Create($url)
      $req.UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) more30-qa/live-mojibake-sweep'
      $req.Timeout = 30000
      $req.AllowAutoRedirect = $true
      try {
        $resp = $req.GetResponse()
      } catch [Net.WebException] {
        $r = $_.Exception.Response
        if ($r -and [int]$r.StatusCode -eq 308) {
          $loc = $r.Headers['Location']; $r.Close()
          if (-not $loc) { throw }
          $url = (New-Object Uri([Uri]$url, $loc)).AbsoluteUri
          $row.url = $url
          continue
        }
        throw
      }
      $row.status = [int]$resp.StatusCode
      $ms = New-Object IO.MemoryStream
      $resp.GetResponseStream().CopyTo($ms)
      $resp.Close()
      $raw = $ms.ToArray()
      break
    }
    if ($null -eq $raw) { throw 'too many redirects' }
    $row.bytes = $raw.Length
    # decode as UTF-8: what the browser does, given the charset these pages declare
    $text = $utf8.GetString($raw)
  } catch {
    $row.error = $_.Exception.Message
    if ($_.Exception.Response) { $row.status = [int]$_.Exception.Response.StatusCode }
    $rows += [pscustomobject]$row
    Write-Host ("  {0,-9} {1,-6} ERROR {2}" -f $t.name, $row.status, $row.error)
    continue
  }

  $row.geresh = $geresh_re.Matches($text).Count
  $row.flagged = $run.IsMatch($text)

  $m = [regex]::Match($text, '(?is)<title[^>]*>(.*?)</title>')
  if ($m.Success) { $row.title = $m.Groups[1].Value.Trim() }

  if ($row.flagged) {
    # the round trip: cp1255 bytes of the served text, read back as UTF-8
    $recovered = $utf8.GetString($cp1255.GetBytes($text))
    # confirmed only if the recovery is itself clean -- no runs left, and the
    # geresh count collapses. a partial or noisy recovery is not a finding.
    $row.confirmed = (-not $run.IsMatch($recovered)) -and ($geresh_re.Matches($recovered).Count -lt $row.geresh)
    $rm = [regex]::Match($recovered, '(?is)<title[^>]*>(.*?)</title>')
    if ($rm.Success) { $row.recovered_title = $rm.Groups[1].Value.Trim() }
  }

  $verdict = if ($row.flagged) { if ($row.confirmed) { 'DOUBLE-ENCODED' } else { 'flagged, unconfirmed' } } else { 'clean' }
  Write-Host ("  {0,-9} {1,-4} {2,7} bytes  geresh={3,-5} {4}" -f $t.name, $row.status, $row.bytes, $row.geresh, $verdict)
  $rows += [pscustomobject]$row
}

$hits = @($rows | Where-Object { $_.confirmed -eq $true })
$flagged = @($rows | Where-Object { $_.flagged -and $_.confirmed -ne $true })
$errs = @($rows | Where-Object { $_.error })

Write-Host ''
Write-Host ("swept {0} live mounts: {1} double-encoded, {2} flagged-unconfirmed, {3} unreachable" -f $rows.Count, $hits.Count, $flagged.Count, $errs.Count)
foreach ($h in $hits) {
  Write-Host ("  {0} {1} -- served <title> {2}" -f $h.number, $h.name, $h.title)
  Write-Host ("      recovers to: {0}" -f $h.recovered_title)
}

if ($OutDir) {
  if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
  $rows | ConvertTo-Json -Depth 4 | Out-File -FilePath (Join-Path $OutDir '_results.json') -Encoding utf8
  Write-Host ("`nwrote {0}" -f (Join-Path $OutDir '_results.json'))
}

exit $(if ($hits.Count) { 1 } else { 0 })
