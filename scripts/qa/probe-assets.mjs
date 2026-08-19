/**
 * Fetch a route and check every asset it references actually resolves.
 *
 * A page can answer 200 with a perfectly valid HTML shell while every script it
 * needs 404s — which is exactly how /crm and /gesher were serving blank pages
 * that no status-code check would flag.
 *
 *   node scripts/qa/probe-assets.mjs /crm /gesher
 */
const ORIGIN = 'https://more30.com';
const routes = process.argv.slice(2);

for (const p of routes) {
  const res = await fetch(ORIGIN + p, { redirect: 'follow' });
  const html = await res.text();
  console.log(`\n=== ${p}  HTTP ${res.status}  ${html.length} bytes  final=${res.url}`);

  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|mjs))"/g)].map((m) => m[1]);
  if (!refs.length) {
    console.log('   no script/style references found in the HTML');
  }
  const seen = new Set();
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const url = ref.startsWith('http')
      ? ref
      : ORIGIN + (ref.startsWith('/') ? ref : `${p.replace(/\/$/, '')}/${ref}`);
    let status = 'ERR';
    try {
      status = (await fetch(url, { method: 'GET' })).status;
    } catch (e) {
      status = 'fetch failed';
    }
    console.log(`   ${String(status).padEnd(5)} ${url}`);
  }
}
