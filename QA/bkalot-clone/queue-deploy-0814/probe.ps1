# queue-deploy-0814/probe.ps1 — מדידת הפריסה של admin.html עם כפתור «הכנס לתור».
# הקובץ נשמר בלי BOM ולכן העברית נבנית מקודי תווים ולא נכתבת כליטרל
# (ps1-without-bom-parsed-as-cp1255: הליטרל היה נקרא כ-cp1255 בזמן parse).
# הפלט דרך [Console]::Out — Tee-Object לא היה קולט אותו.
$ProgressPreference = 'SilentlyContinue'
function W($s) { [Console]::Out.WriteLine($s) }
function He([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }

$r = Invoke-WebRequest -Uri 'https://more30.com/bkalot-studio/admin' -UseBasicParsing
$c = $r.Content
W ("LIVE status={0} chars={1} utf8bytes={2}" -f $r.StatusCode, $c.Length, [System.Text.Encoding]::UTF8.GetByteCount($c))

# «הכנס לתור» — תווית הכפתור שהצעד הזה מביא לייצור
$label = He 0x05D4,0x05DB,0x05E0,0x05E1,0x0020,0x05DC,0x05EA,0x05D5,0x05E8
W ("live has queue-button label: " + $c.Contains($label))

foreach ($t in @('queueNote','queueErr','no_consent','no_contact','no_address',
                 'channel_unsupported','document_empty','queue_row_missing',
                 'queue_status','queue_mode','showDocument','sandbox')) {
  W ("live has {0}: {1}" -f $t, $c.Contains($t))
}

# שפיות קידוד: אלף אמיתי קיים, ואין סימני כפל-קידוד cp1255
W ("aleph count: " + ([regex]::Matches($c, [string][char]0x05D0)).Count)
W ("mojibake markers: " + ([regex]::Matches($c, [string][char]0x00D7)).Count)

foreach ($u in @('https://more30.com/bkalot-studio','https://more30.com/')) {
  $x = Invoke-WebRequest -Uri $u -UseBasicParsing
  W ("{0} -> {1} utf8bytes={2}" -f $u, $x.StatusCode, [System.Text.Encoding]::UTF8.GetByteCount($x.Content))
}
