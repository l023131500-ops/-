export default function Mourning() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-heading text-3xl md:text-4xl mb-6">מדריך אבלות</h1>
      <div className="space-y-6 text-foreground/85">
        <section>
          <h2 className="font-heading text-2xl mb-2">קריעה</h2>
          <p>מנהג הקריעה הוא ביטוי לאבל על קרוב משפחה. הקריעה נעשית לפני הקבורה, בעמידה, בצד שמאל למת קרוב (חוץ מהורים — בצד ימין).</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">שבעה</h2>
          <p>שבעת ימי האבל מתחילים מיד אחרי הקבורה. בימים אלו האבל יושב בבית, נמנע מיציאה, מרחיצה, מנעלי עור, ומיחסי אישות.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">שלושים</h2>
          <p>שלושים יום מהקבורה — אסור בתספורת, גיהוץ, ובשמחות. על הורים — שנה שלמה.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">קדיש ויארצייט</h2>
          <p>הבן (או קרוב) אומר קדיש 11 חודשים על הורים, ו-30 יום על קרובים אחרים. יום השנה (יארצייט) נקבע לפי תאריך הפטירה העברי.</p>
        </section>
        <section className="border-t pt-6">
          <p className="text-sm text-muted-foreground">לכל שאלה בענייני אבלות — צור קשר עם המועצה הדתית או הרב המקומי.</p>
        </section>
      </div>
    </div>
  );
}
