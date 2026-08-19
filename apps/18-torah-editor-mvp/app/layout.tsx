import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'העורך התורני',
  description: 'עוזר AI לעריכה, הגהה, ניקוד ואימות מקורות בספרים תורניים',
  // ‎canonical‎ מצביע ל-more30.com ולעולם לא לכתובת הפריסה: נטפרי חוסמת
  // ‎*.vercel.app‎, וכתובת כזו באינדקס שולחת את הקוראים לדף חסימה.
  metadataBase: new URL('https://more30.com'),
  alternates: { canonical: '/orech' },
  // ‎basePath‎ אינו חל על ‎metadata.icons‎ — זה המקום היחיד ב-Next שאינו מקבל
  // אותו, ולכן הקידומת כתובה ביד. בלעדיה ה-‎href‎ היה ‎/favicon.svg‎, שנפתר מול
  // ‎more30.com‎ ולא מול ‎/orech‎, ומצייר בלשונית את הסמל של הפורטל.
  icons: { icon: '/orech/favicon.svg' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: 'https://more30.com/orech',
    title: 'העורך התורני',
    description: 'עוזר AI לעריכה, הגהה, ניקוד ואימות מקורות בספרים תורניים'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}
        <script src="https://more30.com/auth-button.js" defer />
      </body>
    </html>
  );
}
