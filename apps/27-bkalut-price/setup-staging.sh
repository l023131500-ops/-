#!/bin/bash
# סקריפט הגדרת סביבת טסט — test.bekalut.more30.com
# הרצה: bash setup-staging.sh

set -e

REPO="https://github.com/l023131500-ops/bkalut-app.git"
STAGING_DIR="/www/wwwroot/bkalut-staging"
BRANCH="dev"
PORT=5001
DOMAIN="test.bekalut.more30.com"

echo "=== שלב 1: שכפול הריפוזיטורי ==="
if [ -d "$STAGING_DIR" ]; then
  echo "תיקייה קיימת — מושך עדכונים..."
  cd "$STAGING_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone "$REPO" "$STAGING_DIR"
  cd "$STAGING_DIR"
  git checkout "$BRANCH"
fi

echo "=== שלב 2: התקנת תלויות ==="
npm install

echo "=== שלב 3: יצירת קובץ .env ==="
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "PORT=$PORT" >> .env
  echo ""
  echo "⚠️  חשוב: ערכי את /www/wwwroot/bkalut-staging/.env והוסיפי:"
  echo "   YEMOT_API_KEY=..."
  echo "   ELEVENLABS_API_KEY=..."
  echo "   וכל שאר המפתחות הנדרשים"
else
  echo "קובץ .env קיים — לא דורס"
  # רק מוודאים שהפורט נכון
  sed -i "s/^PORT=.*/PORT=$PORT/" .env
fi

echo "=== שלב 4: הפעלה עם PM2 ==="
if pm2 describe bkalut-staging > /dev/null 2>&1; then
  echo "מפעיל מחדש..."
  pm2 restart bkalut-staging
else
  echo "מפעיל בפעם הראשונה..."
  pm2 start npm --name "bkalut-staging" -- start
fi
pm2 save

echo "=== שלב 5: הגדרת Nginx ==="
NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"

if [ ! -f "$NGINX_CONF" ]; then
  cat > "$NGINX_CONF" << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
  nginx -t && nginx -s reload
  echo "Nginx הוגדר לדומיין $DOMAIN"
else
  echo "הגדרת Nginx כבר קיימת"
fi

echo ""
echo "✅ הושלם!"
echo "   סביבת הטסט זמינה בכתובת: http://$DOMAIN"
echo "   לוגים: pm2 logs bkalut-staging"
echo "   עדכון קוד בעתיד: cd $STAGING_DIR && git pull origin $BRANCH && pm2 restart bkalut-staging"
