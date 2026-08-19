$ErrorActionPreference = 'Continue'
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw"
$url = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake"

# הערך הלא-מספרי נבנה מנקודות-קוד ולא נכתב בקובץ: .ps1 בלי BOM נקרא כ-cp1255
# והעברית מתעוותת בזמן הפירוש. seven = "שבע"
$seven = [string][char]0x05E9 + [char]0x05D1 + [char]0x05E2

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

$base = @{ full_name = "QA overflow"; phone = "0501234599"; email = "test@more30.com"; source = "form" }

Probe "A  treatment 999999999999" ($base + @{ kind = "treatment"; situation = "young_single"; topic_no = "999999999999" })
Probe "B  treatment 2147483647   " ($base + @{ kind = "treatment"; situation = "young_single"; topic_no = "2147483647" })
Probe "C  treatment 2147483648   " ($base + @{ kind = "treatment"; situation = "young_single"; topic_no = "2147483648" })
Probe "D  treatment non-numeric  " ($base + @{ kind = "treatment"; situation = "young_single"; topic_no = $seven })
Probe "E  treatment 7            " ($base + @{ kind = "treatment"; situation = "young_single"; topic_no = "7" })
Probe "F  info 999999999999      " ($base + @{ kind = "info"; topic_no = "999999999999" })
