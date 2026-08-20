import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" id="main-content">
      <div className="page-head">
        <div>
          <h1>העורך התורני</h1>
          <p className="subtitle">עוזר AI לעריכה, הגהה, ניקוד ואימות מקורות בספרים תורניים</p>
        </div>
        <a className="pricing-link" href="https://more30.com/subscribe?app=orech">מחירון</a>
      </div>

      <div className="module-grid">
        {/*
          אזור המסמכים — הפער שהמשתמש זיהה: עד עכשיו העורך היה תיבת הדבקה
          בלבד, בלי דרך להעלות ספר ובלי ששום דבר נשמר.
        */}
        <Link href="/documents" className="module-card">
          <h2>המסמכים שלי</h2>
          <p>העלאת ספר או קובץ (‎.docx‎ · ‎.txt‎), עבודה עליו, ושמירה אוטומטית. כל מסמך במצב שלו: טיוטה, בעריכה או הושלם.</p>
          <span className="module-cta">כניסה למודול ←</span>
        </Link>

        {/*
          ⚠️ הקישור הצביע ל-/editor/htr — נתיב שלא קיים (הראוט הוא app/htr).
          Next עושה prefetch לקישורים, ולכן זה גם ייצר 404 בכל טעינת דף הבית.
        */}
        <Link href="/htr" className="module-card">
          <h2>המרת כתב יד (HTR)</h2>
          <p>העלאת צילום של כתב יד או דף סרוק, זיהוי אוטומטי, תיקון חכם ואישור אנושי לפני שילוב בספר.</p>
          <span className="module-cta">כניסה למודול ←</span>
        </Link>

        {/*
          המודול הזה היה מסומן "בפיתוח" ובלי קישור, אבל הוא פרוס ועובד:
          זיהוי הציטוטים, שליפת נוסח המקור מספריא, ההשוואה אליו והניקוד —
          כולם נבדקו חיים. כרטיס שאומר "בקרוב" על משהו שעובד מסתיר מוצר.
        */}
        <Link href="/editor" className="module-card">
          <h2>אימות מקורות וציטוטים</h2>
          <p>מדביקים טקסט, והמערכת מזהה בו ציטוטים, שולפת את נוסח המקור מספריא ומראה איפה יש סטייה. כולל ניקוד אוטומטי.</p>
          <span className="module-cta">כניסה למודול ←</span>
        </Link>
      </div>
    </main>
  );
}
