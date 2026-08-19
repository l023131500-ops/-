export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-heading text-3xl mb-6">מדיניות פרטיות</h1>
      <div className="space-y-4 text-foreground/85">
        <p>אנו מכבדים את פרטיות המשתמשים. המידע שנאסף משמש אך ורק למתן השירותים באתר.</p>
        <h2 className="font-heading text-xl mt-6">איסוף מידע</h2>
        <p>אנו אוספים פרטי התקשרות, פרטי תשלום (דרך ספק סליקה חיצוני בלבד) ופרטים שנמסרו על ידי המשתמש בעת הרשמה לשיעור או לפורום.</p>
        <h2 className="font-heading text-xl mt-6">שימוש במידע</h2>
        <p>המידע משמש למתן השירות, ליצירת קשר, ולשליחת עדכונים בלבד. לא נעביר מידע לצדדים שלישיים ללא הסכמתך.</p>
        <h2 className="font-heading text-xl mt-6">אבטחה</h2>
        <p>הנתונים מאוחסנים במערכת מאובטחת עם הצפנה. פרטי תשלום אינם נשמרים אצלנו.</p>
      </div>
    </div>
  );
}
