#!/usr/bin/env bash
# מעלה את קבצי מערכת העיצוב ל-Supabase Storage (bucket ציבורי: design)
# שימוש:  ./upload.sh
set -e
cd "$(dirname "$0")"

SB="https://bieebmnmkffwbqlsfozh.supabase.co"
# מפתח anon ציבורי (הרשאת כתיבה ל-bucket design מוגדרת ב-RLS)
ANON="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWVibW5ta2Zmd2JxbHNmb3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDc0NDIsImV4cCI6MjA5NDI4MzQ0Mn0.QIo-mnp3yuUIfh6R8nbT3SOLX_6aRsZ-FWOpEMgoUww}"

echo "→ בונה מחדש מ-tokens.json"
node build.js

upload() {
  local file="$1" ctype="$2"
  echo "→ מעלה $file"
  local http_code
  http_code="$(curl -s -o /tmp/bkalot-design-upload-response.$$ -w "%{http_code}" \
    -X POST "$SB/storage/v1/object/design/$file" \
    -H "Authorization: Bearer $ANON" -H "apikey: $ANON" \
    -H "Content-Type: $ctype" -H "x-upsert: true" \
    --data-binary @"$file")"
  echo "  [HTTP $http_code]"
  if [[ "$http_code" != 2* ]]; then
    echo "✗ ההעלאה נכשלה עבור $file (HTTP $http_code):" >&2
    cat /tmp/bkalot-design-upload-response.$$ >&2
    rm -f /tmp/bkalot-design-upload-response.$$
    exit 1
  fi
  rm -f /tmp/bkalot-design-upload-response.$$
}

upload bkalot-theme.css "text/css"
upload tokens.json      "application/json"
echo "✓ הועלה. כתובת ציבורית:"
echo "  $SB/storage/v1/object/public/design/bkalot-theme.css"
