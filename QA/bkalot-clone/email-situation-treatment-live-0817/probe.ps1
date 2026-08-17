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

# A: email_invalid — kind=info, malformed email (fires regardless of kind; checked before the treatment branch)
Probe "A  email_invalid (kind=info, email=not-an-email)" (@{
  kind = "info"; source = "form"; full_name = "QA Email"; phone = "0500000001";
  email = "not-an-email"; note = "QA 0817 email_invalid live production check"; consent = "true"
})

# B: email_required_for_treatment — kind=treatment, email omitted entirely (null passes email_invalid's guard, then treatment branch requires it)
Probe "B  email_required_for_treatment (kind=treatment, no email field)" (@{
  kind = "treatment"; source = "form"; full_name = "QA Email"; phone = "0500000002";
  note = "QA 0817 email_required_for_treatment live production check"; consent = "true"
})

# C: situation_required_for_treatment — kind=treatment, valid email, situation omitted
Probe "C  situation_required_for_treatment (kind=treatment, email set, no situation)" (@{
  kind = "treatment"; source = "form"; full_name = "QA Email"; phone = "0500000003";
  email = "qa.situation.0817@more30.com"; note = "QA 0817 situation_required_for_treatment live production check";
  consent = "true"
})
