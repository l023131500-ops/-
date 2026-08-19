// Exercises the POST /api/agent/identify contract over real HTTP.
//
// `server/node_modules` is not installed in this checkout, so express cannot be
// loaded and routes/agent.js cannot be started. The two modules that decide the
// answer are the REAL ones (src/approvals.js, src/identify.js); only the token
// lookup and the four guards are restated here, line for line with the route.
//
// Run: node QA/kiosk/identify-0811/stub-server.mjs
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { identify, serialMatches } from '../../../apps/35-kioskfleet/server/src/identify.js';

const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE devices (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER, serial TEXT UNIQUE,
  name TEXT, device_token TEXT UNIQUE, allowed_host TEXT, home_url TEXT, idle_return_seconds INTEGER DEFAULT 0);
CREATE TABLE clients (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER, code TEXT, name TEXT,
  site_url TEXT, allowed_host TEXT, active INTEGER DEFAULT 1);
CREATE TABLE device_clients (device_id INTEGER, client_id INTEGER, PRIMARY KEY (device_id, client_id));
INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, idle_return_seconds)
  VALUES (1,'SER-1','לובי','TOK-1','hall.example.com','https://hall.example.com/',90);
INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active)
  VALUES (1,'1234','אולם הדר','https://hadar.example.com/','hadar.example.com,pay.example.com',1),
         (1,'DS7LZ','מסעדת גליל','https://galil.example.com/','galil.example.com',1);
INSERT INTO device_clients (device_id, client_id) VALUES (1,1);
`);

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    const send = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    };
    const tok = req.headers['x-device-token'] || body.deviceToken;
    const device = tok ? db.prepare('SELECT * FROM devices WHERE device_token = ?').get(tok) : null;
    if (!device) return send(401, { error: 'device token invalid' });
    if (!serialMatches(device, body.serial)) return send(409, { error: 'המכשיר אינו תואם לרישום' });
    const result = identify(device, approvedClientsForDevice(db, device.id), body.clientCode);
    if (!result.ok) return send(404, { error: 'מזהה לקוח לא מוכר במכשיר זה' });
    send(200, result.profile);
  });
});

await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/api/agent/identify`;
const call = async (headers, body) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
};

const T = { 'x-device-token': 'TOK-1' };
const cases = [
  ['no token',         await call({}, {})],
  ['bad token',        await call({ 'x-device-token': 'nope' }, {})],
  ['selection screen', await call(T, { serial: 'SER-1' })],
  ['code typed',       await call(T, { serial: 'ser-1', clientCode: ' 12-34 ' })],
  ['unapproved code',  await call(T, { clientCode: 'DS7LZ' })],
  ['serial mismatch',  await call(T, { serial: 'SER-9' })],
];
for (const [label, r] of cases) console.log(`${String(r.status).padEnd(4)} ${label.padEnd(18)} ${JSON.stringify(r.json)}`);
server.close();
