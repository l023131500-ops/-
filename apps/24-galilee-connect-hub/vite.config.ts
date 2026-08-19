import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  base: "/galil/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['placeholder.svg', 'robots.txt'],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'מחוברים — יהדות וקהילה',
        short_name: 'מחוברים',
        description: 'מרכז המידע התורני והקהילתי של חצור הגלילית',
        theme_color: '#0f766e',
        background_color: '#f0fdfa',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        // ‎scope‎ נגזר אוטומטית מ-‎base‎ ויוצא ‎/galil/‎; ‎start_url‎ ו-‎icons[].src‎
        // אינם — התוסף כותב אותם כלשונם. כשהיו ‎/‎ ו-‎/pwa-*.png‎ הם נפתרו מול
        // שורש ‎more30.com‎: ‎start_url‎ נפל מחוץ ל-‎scope‎ ושני האייקונים החזירו
        // 404. הם חייבים לשאת את הקידומת במפורש.
        start_url: '/galil/',
        icons: [
          // ‎pwa-192.png‎ הוסר: הוא היה 1024x1024 במשקל 645 ק״ב והצהיר על עצמו
          // 192 — כל מבקר iOS הוריד אותו לשווא. ‎pwa-512.png‎ הוא 97 ק״ב.
          { src: '/galil/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/galil/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
