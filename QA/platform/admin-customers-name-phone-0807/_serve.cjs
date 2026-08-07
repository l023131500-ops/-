// שרת סטטי זמני לצילום התצוגה המקדימה. פרוטוקול file: חסום בדפדפן הבדיקה.
const http = require('http'), fs = require('fs'), path = require('path');
const file = path.join(__dirname, '_preview.html');
http.createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(file));
}).listen(8791, '127.0.0.1', () => console.log('http://127.0.0.1:8791/'));
