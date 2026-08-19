// שרת סטטי זמני לרסטור ה-favicon. playwright כאן חוסם את פרוטוקול file:,
// ולכן המתלה מוגש מ-localhost. הרצה: node scripts/qa/_favicon-serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const HARNESS = new URL('./_favicon-raster.html', import.meta.url);

createServer(async (_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(await readFile(HARNESS));
}).listen(4599, '127.0.0.1', () => console.log('http://127.0.0.1:4599/'));
