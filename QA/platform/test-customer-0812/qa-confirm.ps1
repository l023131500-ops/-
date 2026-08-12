# QA - priority 1B, second half: confirm the mailbox.
# test@more30.com is a real inbox routed to Resend, so the confirmation mails
# the eight projects sent are readable. This opens each verify link exactly as
# clicking the button in the mail would, then re-runs the login on every project.
# Links come from the mails and expire - re-read the inbox before re-running.
$ErrorActionPreference = 'Continue'

$links = @(
  @{ project='csjekrvukbdznetsrodj'; url='https://csjekrvukbdznetsrodj.supabase.co/auth/v1/verify?token=da3bfa4a0f5899b0d3184534a75437db92d5e429ab53ec0880911cab&type=signup&redirect_to=http://localhost:3000' },
  @{ project='bieebmnmkffwbqlsfozh'; url='https://bieebmnmkffwbqlsfozh.supabase.co/auth/v1/verify?token=b077ae56bf49312d7089f309a0588b89a14f191586ec8787d847c727&type=signup&redirect_to=https://more30.com' },
  @{ project='lovable-1'; url='https://lnk.md.lovable-app.email/c/eJw80MvK2zAUBOCnkXcy0jm6LrQo_Pg1gi5HiYkTCVsJuE9fTEs3s5uPYUrQWk4UpHVGC0Avp0coNuWsBVWTXMo2JVWEJOts9NHU4qc1gAAjnISrouWsLAir0GEl9KANU-JV5q19Y9qIx95nesV1m7bwGKMfDH8xWBgsj-fzeb7Ptt5_b2P0892ozcenxxQPmnNjsMTPeDBYvvIK2td6Mlx2KutOedxGY_jz1wR9qfpyNSx0b_8HzLF3Bma0J70Z_sRatJI-GpGtouxrFMWA0aC0zFGBqYgGtfJovUzaOpe9zxYv4uzE8OdY7-9Pn_7xtxcdR7zTbS1BxeiSQ8O9A8-VkMCTwMyzSZK8JnSUpj0MOsb1UdsJxZzbaxoBHVgQvnIFBbnK1XFXkuDepaSqU1Ikmr4B_gQAAP___VeCGg' },
  @{ project='lovable-2'; url='https://lnk.auth.lovable-app.email/c/eJw0zkmupDAQBNDTmJ2Rp7STBYuWSlyjlLbTBf8zCUx91e1b9LCJRUjxFLn3Xe5cw70O6EEZ20Ez9jqhAoNasdEOHUEIBUoJPpP22sdm6o0yXqE2fybQdpYCsIcAxmeHLJyiq47tvL0pzixp31teaJqbuR9r3U9hfwkzCDMsP_PX97b-ZL6IxnN6feW9Pa-dIp3cpk2Y4ZaEGd76Dj6m8hF2ODhPB6f6rJuwj7-mgVuF2wUzvGieZmaZtnXlVOV4xf9_Wtp3YXzdvnkV9uEUAfpiQ0xMTocYCwOhDqi4eLCYkMF7jIZcvOvi2DHpm_jsLOzjnF7rtTf_-OfC50kvfk65twjYReUlJsPSFY0SQ0EJkbgD1aFPqTn6ymcVTi3bwVa1aVua2oPyqCAriV1m6bQ2El0pMjgNYLEz0brm3ZvfAQAA___F14gN' },
  @{ project='lovable-3'; url='https://lnk.auth.lovable-app.email/c/eJw0zsGupCAQheGnwR0GCihlwWKSjq_RKaC4eq_dOoqmu59-YmZmc3bny58D-uxtw0F3PToFxnfNGHzE2FOf0TtkdqAgkUaTIzL6krCZAihA1Wu4Lq5rrQY0VuXEAIkoCavoqGM7LyfFmSWta8sPmuZmDmOt6y7MLwGDgOF7jMzz5_w-x-fPa86_z9er3Y-VIu3cpkXAcEkChlNfw9tU3sIMG-dp41TvdRHm9tcEd6nuch0MnzQe76XKRBvL8Yj_Y1paVwFYlx9-CnMjw13hTGjAaDQOjCvZWlI-MnYOo-07KLrE3lCO0UAhdF7TRbxXFua2T1_PY23-8fcH7zt98X3KIZJSyBmky6mXlrCTkaOTznLSPnYFgZotVN6rsOqxbGxUm5ZHU0PMQADJSrBGSeuLlR50kqX3KRrduVJKcwb4EwAA__-IuIpB' },
  @{ project='lovable-4'; url='https://lnk.mail.lovable-app.email/c/eJw00MGuozAMBdCvCbug4JAQL7IYqeI3KjtxCpoWeBCq1_n6EZp5Gy8s3aOrm2MuaBuJ3RC8M2ARmyniMKC3JM50kCgIc3DCJg9kex-SaeYIBrwJHVwRh60vTF6CZPKMQ4eqNy-an-1zfRM_RdO2tXJ9mmecat0OZX8pGBWMnwd9fS3npyznS_58f78qT-1xbsR0SJtWBSOddVIwvrvryD6Xj7LjLnneJdV7XZW9_TPBXaq7XAfjJKzTuiySqp5O_unS0rYp8HX9LYuytzBQYco4QCl9Z3NGNOL7PqdCgJA6TqkLzgAa7hlRABECuIv4bKLs7Zgfy7k1__n7S46DHnKfc0zWZQzoNHfB6t6x18hI2hEB9aV4dtDsscpRr8HWXaxp0_pqaiQYSnYla5sFdG-BNYMfdDGuuECFsjPNO8LfAAAA__-64omu' },
  @{ project='lovable-5'; url='https://lnk.md.lovable-app.email/c/eJw00E2O2zAMBeDTyDsbFPXrhRYFBr5GQEnU2Jh4rFhKOrl9YbTdcMX34eHlYIwcOEjnrQHUIIc1ZKldNghJOywzK8VZSQDmWXEiZ4ctIKAFL_GKgJwwJvZeZiDMjD4KDXue7seL4p1HqnXinbb7cA9r77UJ9UvgInChd22Px6scK3_9_DwfbT9_T-1ZKVLjKR3Xy7OvApeXvA6fW3kLtZyct5NTv_VDqI-_JppLNZdrcNn7Gk_a_3eYqFaBth9f_C3Uh3UStLM5msKRpQWVcs7FWl9wRmO9dybabMoM7FxmpFwczXAR78pCfbTt8_tZh3_8befW6JNvWw5z1IWijeOsvBm18Wb0BWFMWJJzyYFycjhD59avmY6TFUzp2IceilGktZtHSVRGbZhHL6GM7Jk0Z1ViwuEV8E8AAAD__3mVhWY' }
)

foreach ($l in $links) {
  try {
    $r = Invoke-WebRequest -Uri $l.url -UseBasicParsing -MaximumRedirection 5
    "$($l.project): HTTP $($r.StatusCode)  final=$($r.BaseResponse.ResponseUri)"
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { "$($l.project): HTTP $($resp.StatusCode.value__)  final=$($resp.ResponseUri)" }
    else { "$($l.project): $($_.Exception.Message)" }
  }
}
