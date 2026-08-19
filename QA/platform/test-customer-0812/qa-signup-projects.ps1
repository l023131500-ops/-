# QA - priority 1B: create the test customer in every Supabase project a live
# system authenticates against, not only the platform hub.
#
# Uses the public signup endpoint with each project's own anon/publishable key
# (the same key its site ships to the browser) - so this is exactly the path a
# real visitor takes, and it proves signup is open there.
# Then it signs in with the same credentials: that is the priority 1A check
# "register -> log out -> log in" on each project's auth.
#
# Idempotent: an existing user answers 422 user_already_exists and the script
# falls through to the login check.
#
# System 08 (bkalut-app, project pwcswdfgorvlpdflzylm) is PROTECTED and is
# deliberately absent from this list.
$ErrorActionPreference = 'Stop'
$EMAIL = 'test@more30.com'
$PASS  = 'More30Test2026'
$fullName = -join (0x05DC,0x05E7,0x05D5,0x05D7,0x0020,0x05D1,0x05D3,0x05D9,0x05E7,0x05D4 | ForEach-Object { [char]$_ })

$projects = @(
  @{ ref='bieebmnmkffwbqlsfozh'; key='sb_publishable_Gq1FeBEuPYp6XMWV5pF5-A_6WEwXYMn'; systems='01 torah, 02 tamlul, 03 modaot, 10 bkalot, 18 orech' },
  @{ ref='csjekrvukbdznetsrodj'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzamVrcnZ1a2Jkem5ldHNyb2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDM2NTIsImV4cCI6MjA5NTk3OTY1Mn0.L904gM3-_J7k7WvEDMhR53nzKRND-M_odJtJEePopuk'; systems='06 briut, 12 smel, 17 chizukim, 27 mechiron' },
  @{ ref='hkkkynyoigzlttpynoeo'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhra2t5bnlvaWd6bHR0cHlub2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzY5OTcsImV4cCI6MjA5MzE1Mjk5N30.uhMjlMCUqYtw4aUHjoR8AWU8zLNK2Vu_24XGOPNV_uM'; systems='15 egod' },
  @{ ref='trerolyveytzgksawrme'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZXJvbHl2ZXl0emdrc2F3cm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzIxOTIsImV4cCI6MjA4ODA0ODE5Mn0.7DIrO5ZkyqyJqhTkVwyAx9x7riBEFqPxJNVEetj_3ko'; systems='22 zchuyot' },
  @{ ref='mwljkonwdeuaahsigjdp'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGprb253ZGV1YWFoc2lnamRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTE3ODUsImV4cCI6MjA4OTE4Nzc4NX0.pFtvfeg1uDviXOxqPe4OwD6ea1J92Bwan98zfZ04lIg'; systems='24 galil' },
  @{ ref='jhbeelzvjvhnkxldqvxx'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYmVlbHp2anZobmt4bGRxdnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTE0OTYsImV4cCI6MjA5NjY4NzQ5Nn0.z8-MIcsrhjw8SAiM7wX9RYu-BfevfvbrzaTAsthji2M'; systems='30 crm' },
  @{ ref='ygaqqnuyfnumezxxmtbh'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYXFxbnV5Zm51bWV6eHhtdGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDM2MjMsImV4cCI6MjA5NjE3OTYyM30.Y1okrqcxAHOHpXmSseyPfkZDG8dFlPjMyA20NAhzpEI'; systems='31 gesher' },
  @{ ref='aypsqqvfohekxxuqsmrw'; key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHNxcXZmb2hla3h4dXFzbXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODc4ODksImV4cCI6MjA4ODU2Mzg4OX0.YGTe03rAooCzM_ydVS_0vhEUxVmk4YNL3p-VUkRh2Eg'; systems='21 mthbram' }
)

function Try-Post($url, $key, $obj) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
  try {
    $r = Invoke-WebRequest -Uri $url -Method POST -UseBasicParsing `
         -Headers @{ apikey = $key; 'Content-Type' = 'application/json' } -Body $bytes
    return @{ status = $r.StatusCode; body = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    $body = ''
    if ($resp) {
      $st = $resp.GetResponseStream()
      $body = (New-Object System.IO.StreamReader($st)).ReadToEnd()
      return @{ status = $resp.StatusCode.value__; body = $body }
    }
    return @{ status = 0; body = $_.Exception.Message }
  }
}

$out = @()
foreach ($p in $projects) {
  $base = "https://$($p.ref).supabase.co"
  $signup = Try-Post "$base/auth/v1/signup" $p.key @{ email=$EMAIL; password=$PASS; data=@{ full_name=$fullName; phone='0500000000' } }
  $login  = Try-Post "$base/auth/v1/token?grant_type=password" $p.key @{ email=$EMAIL; password=$PASS }
  $lj = $null; try { $lj = $login.body | ConvertFrom-Json } catch {}
  $sj = $null; try { $sj = $signup.body | ConvertFrom-Json } catch {}
  $out += [pscustomobject]@{
    project      = $p.ref
    systems      = $p.systems
    signup_status= $signup.status
    signup_note  = $sj.error_code
    login_status = $login.status
    user_id      = $lj.user.id
    confirmed_at = $lj.user.email_confirmed_at
    login_error  = $lj.error_code
  }
}
$out | ConvertTo-Json -Depth 4
