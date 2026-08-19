// One-off recovery: pull the fallbackTips Hebrew strings out of the deployed
// egod bundle. The source copy was destroyed locally by a PowerShell 5.1
// encoding mistake (Get-Content -Raw reads ANSI; writing that back as UTF-8
// double-encodes, and a second pass through CP1252 replaced every Hebrew
// character with '?'). The deployed bundle predates that and still has them.
const res = await fetch('https://more30.com/egod/assets/index-DLwfr8TJ.js');
const js = await res.text();

// The array is minified but the shape survives: four objects with id f1..f4.
const idx = js.indexOf('"f1"');
if (idx === -1) {
  console.error('f1 not found in bundle');
  process.exit(1);
}
const slice = js.slice(Math.max(0, idx - 200), idx + 2200);
console.log(slice);
