// Candidate picker for the non-text contrast step: WCAG 1.4.11 wants 3:1
// between a control's boundary and BOTH surfaces it touches — the card outside
// it and the field fill inside it. Prints the ratio for each candidate against
// both, so the value is chosen from the number rather than by eye.
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (hex) => {
  const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const LIGHT = { card: '#ffffff', field: '#fbfcfe', focus: '#ffffff' };
const DARK = { card: '#131c2e', field: '#0d1626', focus: '#16203a' };

console.log('=== current ===');
console.log('light border #e4e9f2 vs card', f(ratio('#e4e9f2', LIGHT.card)), '| vs field', f(ratio('#e4e9f2', LIGHT.field)));
console.log('dark  border #2f3f60 vs card', f(ratio('#2f3f60', DARK.card)), '| vs field', f(ratio('#2f3f60', DARK.field)));
console.log('btn-danger #ef4444 on #fee2e2', f(ratio('#ef4444', '#fee2e2')));
console.log('alert-error #b91c1c on #fee2e2', f(ratio('#b91c1c', '#fee2e2')));

console.log('\n=== light border candidates (need >=3:1 vs #fff and vs #fbfcfe) ===');
for (const c of ['#949aa5', '#8d94a1', '#8a92a1', '#858e9e', '#7e8798', '#6b7688']) {
  console.log(c, 'vs card', f(ratio(c, LIGHT.card)), '| vs field', f(ratio(c, LIGHT.field)), '| vs focus', f(ratio(c, LIGHT.focus)));
}

console.log('\n=== dark border candidates (need >=3:1 vs #131c2e and vs #0d1626) ===');
for (const c of ['#5a6a8c', '#61708f', '#657593', '#6b7b9a', '#7182a2', '#77879f']) {
  console.log(c, 'vs card', f(ratio(c, DARK.card)), '| vs field', f(ratio(c, DARK.field)), '| vs focus', f(ratio(c, DARK.focus)));
}

console.log('\n=== accent as focus border ===');
console.log('#2a61e8 vs #fff', f(ratio('#2a61e8', '#ffffff')), '| vs dark card', f(ratio('#2a61e8', DARK.card)), '| vs dark focus fill', f(ratio('#2a61e8', DARK.focus)));

console.log('\n=== btn-danger text candidates on #fee2e2 ===');
for (const c of ['#b91c1c', '#c02626', '#c62828']) console.log(c, f(ratio(c, '#fee2e2')));
