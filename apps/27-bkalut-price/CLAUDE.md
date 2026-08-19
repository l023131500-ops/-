# הוראות למערכת AI — פרויקט בקלות

## חשוב לקרוא לפני כל שינוי

הפרויקט מורכב משני דומיינים נפרדים המשרתים אותה אפליקציה:

| דומיין | מטרה |
|---|---|
| `bekalut.more30.com` | אתר ציבורי ללקוחות |
| `admin.bekalut.more30.com` | ממשק ניהול פנימי (צוות בלבד) |

---

## קבצים קריטיים — אל תשנה בלי להבין

### `client/src/App.tsx`

מכיל את פונקציית `isAdminSubdomain()` שמזהה לפי שם הדומיין האם המשתמש בדומיין הניהול.

- בדומיין הציבורי: נתיבי ניהול כמו `/#/login`, `/#/admin` מציגים 404
- בדומיין הניהול: כל נתיבי הניהול נגישים לאחר הזדהות
- נתיבי לקוחות פיננסיים (`/user-login`, `/me`) נגישים משני הדומיינים

**אל תסיר את:**
```typescript
function isAdminSubdomain(): boolean {
  return typeof window !== "undefined" && window.location.hostname.startsWith("admin.");
}
```

ואת הבדיקה ב-`InternalArea`:
```typescript
if (!adminSub) {
  return (
    <Switch>
      <Route path="/user-login" component={UserLoginPage} />
      <Route path="/me" component={MePage} />
      ...
    </Switch>
  );
}
```

---

### `client/src/pages/admin-login.tsx`

אחרי הזדהות מוצלחת, המשתמש מועבר ל-`/admin` (לא ל-`/`).

**אל תשנה:**
```typescript
if (result.ok) {
  setLocation("/admin"); // חובה — לא "/"
}
```

---

### `server/routes.ts`

מכיל middleware שחוסם את כל קריאות `/api/admin/*` כשהן מגיעות מהדומיין הציבורי.
פיתוח מקומי (`localhost`) פטור מהחסימה.

**אל תסיר את הבלוק:**
```typescript
app.use("/api/admin", (req, res, next) => {
  const host = req.hostname || "";
  const isDev = process.env.NODE_ENV === "development";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isDev && !isLocal && !host.startsWith("admin.")) {
    res.status(404).json({ message: "not found" });
    return;
  }
  next();
});
```

---

### `client/src/lib/utils.ts`

מכיל את `getPublicOrigin()` — פונקציה שמחזירה את כתובת האתר הציבורי.
כשנקראת מדומיין הניהול (`admin.bekalut.more30.com`), היא מסירה את `admin.` ומחזירה את הדומיין הציבורי.

**שימוש:** כל דף ניהול שבונה קישור לאתר הציבורי (השוואת מחירים, דשבורד, סורק פוטנציאל, קהילות, פרטי זכות) חייב להשתמש ב-`getPublicOrigin()` ולא ב-`window.location.origin`.

**אל תסיר:**
```typescript
export function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  const publicHost = hostname.startsWith("admin.")
    ? hostname.slice("admin.".length)
    : hostname;
  return `${protocol}//${publicHost}${port ? `:${port}` : ""}`;
}
```

---

## דפים שכבר מעודכנים עם `getPublicOrigin()`

הקבצים הבאים כבר מייבאים ומשתמשים ב-`getPublicOrigin()` — אל תחזיר אותם ל-`window.location.origin`:

- `client/src/pages/dashboard.tsx`
- `client/src/pages/price-comparison-admin.tsx`
- `client/src/pages/potential-admin.tsx`
- `client/src/pages/community-admin.tsx`
- `client/src/pages/right-detail.tsx`

---

## תשתית שרת (Nginx + PM2)

- האפליקציה רצה על PM2 בשם `bkalut` מהתיקייה `/var/www/bkalut-app/`
- Nginx מנהל שני וירטואל הוסטים: הדומיין הציבורי (5000) והדומיין הניהולי (5000)
- הפרדת ה-UI בין הדומיינים נעשית **בקוד** (לא ב-Nginx) דרך `isAdminSubdomain()`

## פרסום לשרת

```bash
cd /var/www/bkalut-app && git pull && npm run build && pm2 restart bkalut
```
