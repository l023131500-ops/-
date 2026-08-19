$rq = [System.Net.WebRequest]::Create('https://more30.com/mechiron/?cb=diff1')
$rq.Method = 'GET'; $rq.Timeout = 30000
$resp = $rq.GetResponse(); $sr = New-Object IO.StreamReader($resp.GetResponseStream())
$live = $sr.ReadToEnd(); $resp.Close()
$disk = Get-Content 'C:\Users\USER\Downloads\more30\_deploy\mechiron-more30\public\mechiron\index.html' -Raw
$liveLines = $live -split "`r?`n"
$diskLines = $disk -split "`r?`n"
Write-Output ('live lines: ' + $liveLines.Count + '   disk lines: ' + $diskLines.Count)
$d = Compare-Object $liveLines $diskLines -SyncWindow 400
foreach ($x in $d) {
  $tag = if ($x.SideIndicator -eq '=>') { 'DISK-ONLY ' } else { 'LIVE-ONLY ' }
  $t = $x.InputObject.Trim()
  if ($t.Length -gt 150) { $t = $t.Substring(0,150) + ' ...' }
  Write-Output ($tag + $t)
}
