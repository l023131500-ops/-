$dist   = 'C:\Users\USER\Downloads\more30\apps\27-bkalut-price\dist\public'
$deploy = 'C:\Users\USER\Downloads\more30\_deploy\mechiron-more30\public\mechiron'
$oldJs  = 'index-DcMphBNb.js'
$newJs  = 'index-ur-RA18k.js'
$html   = Join-Path $deploy 'index.html'

# BOM check before touching anything
$bytes = [IO.File]::ReadAllBytes($html)
$hadBom = ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
Write-Output ('index.html had BOM: ' + $hadBom)

Copy-Item (Join-Path $dist ('assets\' + $newJs)) (Join-Path $deploy ('assets\' + $newJs)) -Force

$text = [IO.File]::ReadAllText($html, [Text.Encoding]::UTF8)
if ($text -notmatch [regex]::Escape($oldJs)) { throw ('old asset name not found in index.html: ' + $oldJs) }
$text = $text.Replace($oldJs, $newJs)
$enc = New-Object Text.UTF8Encoding($hadBom)
[IO.File]::WriteAllText($html, $text, $enc)

Remove-Item (Join-Path $deploy ('assets\' + $oldJs)) -Force

Write-Output 'assets after staging:'
Get-ChildItem (Join-Path $deploy 'assets') | ForEach-Object { '  ' + $_.Name + '  ' + $_.Length }
Write-Output 'script tag now:'
Select-String -Path $html -Pattern 'assets/index-' | ForEach-Object { '  ' + $_.Line.Trim() }
Write-Output ('index.html bytes now: ' + (Get-Item $html).Length)
