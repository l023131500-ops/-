export default function Accessibility() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-heading text-3xl mb-6">הצהרת נגישות</h1>
      <div className="space-y-4 text-foreground/85">
        <p>האתר תוכנן לעמוד בתקנות הנגישות (ת״י 5568 ברמה AA).</p>
        <h2 className="font-heading text-xl mt-6">תכונות נגישות</h2>
        <ul className="list-disc pr-6 space-y-1">
          <li>תמיכה מלאה בניווט באמצעות מקלדת</li>
          <li>טקסט חלופי לתמונות</li>
          <li>ניגודיות צבעים גבוהה</li>
          <li>מבנה כותרות תקין</li>
          <li>תמיכה בקוראי מסך</li>
        </ul>
        <h2 className="font-heading text-xl mt-6">פניות בנושא נגישות</h2>
        <p>נמצא בעיית נגישות? צרו קשר בטלפון 02-3131600 או בדוא״ל a023131600@gmail.com</p>
      </div>
    </div>
  );
}
