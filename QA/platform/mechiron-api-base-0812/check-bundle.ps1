param([string]$File)
$c = Get-Content $File -Raw
Write-Output 'base expression in the emitted bundle:'
[regex]::Matches($c, '.{90}__PORT_5000__.{90}') | ForEach-Object { $_.Value }
Write-Output ''
$q  = [char]34
$bt = [char]96
Write-Output ('bare fetch(' + $q + '/api/  = ' + ([regex]::Matches($c, [regex]::Escape('fetch(' + $q + '/api/'))).Count)
Write-Output ('bare fetch(' + $bt + '/api/  = ' + ([regex]::Matches($c, [regex]::Escape('fetch(' + $bt + '/api/'))).Count)
Write-Output ('literal ' + $q + '/mechiron' + $q + ' = ' + ([regex]::Matches($c, [regex]::Escape($q + '/mechiron' + $q))).Count)
