import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0d1b3e',
        navy2: '#122a5e',
        indigo: '#1e3a8a',
        // White on the old #0ea5a4 measured 3.03:1 — below AA, on the primary
        // call-to-action and 38 other places. Rather than special-casing each
        // one, `teal` is now the darker tone that was already in the palette as
        // `tealD` (4.95:1), so every existing bg-teal passes untouched and the
        // brand does not shift. `tealD` moves down to keep a distinct hover.
        teal: '#0b7d7c',
        tealD: '#0e6e6c',
        gold: '#c8a24a',
        goldL: '#e6c988',
        ink: '#1a2233',
        muted: '#5b6577',
        line: '#e3e8f0',
        bgsoft: '#f6f8fc',
      },
      fontFamily: {
        heebo: ['Heebo', 'Assistant', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(13,27,62,0.06)',
        lift: '0 18px 40px rgba(13,27,62,0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
