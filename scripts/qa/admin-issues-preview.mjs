// בונה תצוגה מקומית של /admin/issues מהקובץ שנשלח לייצור, עם מקור נתונים מוחלף:
// במקום supabase-js מול הרשת — מודול-דמה שמחזיר session קיים ואת ה-payload
// האמיתי שנשאב מ-core.issues. ה-HTML, ה-CSS וכל לוגיקת הציור נשארים כלשונם,
// ולכן מה שמצולם הוא הדף עצמו ולא שכפול שלו.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, '../../portal/public/admin-issues.html'), 'utf8');
const payload = readFileSync(resolve(here, '../../QA/admin/issues-payload.json'), 'utf8');

const fake = `<script>
  window.__stubData = ${payload};
</script>`;

const out = src
  .replace(
    "import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';",
    `const createClient = () => ({
        auth: { getSession: async () => ({ data: { session: { user: {} } } }) },
        rpc: async () => ({
          data: Object.assign({ generated_at: '2026-08-07T08:00:00Z', freshness: {} },
                              window.__stubData),
          error: null }),
      });`,
  )
  .replace('<body>', '<body>\n' + fake)
  .replace('<script src="https://more30.com/auth-button.js" defer></script>', '');

if (out === src) { console.error('ההחלפה לא תפסה — הקובץ השתנה'); process.exit(2); }
const dest = resolve(here, '../../QA/admin/issues-preview.html');
writeFileSync(dest, out, 'utf8');
console.log('wrote ' + dest);
