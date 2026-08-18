// Find darkest-possible shade (via HSL lightness reduction) of each fund
// brand color that still reaches 4.5:1 white-text contrast, preserving hue.
const colors = {
  clalit: [0, 160, 175],
  meuhedet: [91, 168, 41],
  leumit: [245, 127, 32],
  none: [123, 139, 149], // --text-faint, used for t-best[data-fund=none]
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastVsWhite(rgb) {
  return (1 + 0.05) / (lum(rgb) + 0.05);
}

for (const [name, rgb] of Object.entries(colors)) {
  const [h, s] = rgbToHsl(...rgb);
  let l = rgbToHsl(...rgb)[2];
  let out = rgb;
  while (contrastVsWhite(out) < 4.5 && l > 0) {
    l -= 0.005;
    out = hslToRgb(h, s, l);
  }
  console.log(`${name}: ${rgb} (${contrastVsWhite(rgb).toFixed(2)}:1) -> rgb(${out}) (${contrastVsWhite(out).toFixed(2)}:1) #${out.map(v=>v.toString(16).padStart(2,'0')).join('')}`);
}
