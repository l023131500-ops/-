$ErrorActionPreference = 'Continue'
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw"
$url = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake"

function Probe($label, $payload) {
  $json  = $payload | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  try {
    $r = Invoke-WebRequest -Uri $url -Method POST -Headers @{ apikey = $key; Authorization = "Bearer $key" } `
                           -ContentType "application/json" -Body $bytes -UseBasicParsing
    [Console]::Out.WriteLine("$label  HTTP $([int]$r.StatusCode)  $($r.Content)")
  } catch {
    $resp = $_.Exception.Response
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    [Console]::Out.WriteLine("$label  HTTP $([int]$resp.StatusCode)  $($sr.ReadToEnd())")
  }
}

$base = @{ full_name = "QA Source"; phone = "0500000000"; email = "qa.source.0817@more30.com";
           note = "QA 0817 source_invalid live production check"; consent = "true"; situation = "young_single" }

Probe "A  source not_a_real_source_xyz" ($base + @{ kind = "treatment"; source = "not_a_real_source_xyz" })
