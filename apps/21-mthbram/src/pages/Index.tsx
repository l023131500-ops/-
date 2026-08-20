import Navbar from "@/components/Navbar";
import UpcomingLessonsCarousel from "@/components/UpcomingLessonsCarousel";
import LessonsDashboard from "@/components/LessonsDashboard";
import ShareDistributionBar from "@/components/ShareDistributionBar";
import JoinTeachersCTA from "@/components/JoinTeachersCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/*
        כותרת ראשית אחת ויציבה לדף, שאינה תלויה בשום נתון. היא מוסתרת חזותית
        כי העיצוב נושא את זהות האתר בלוגו ובקרוסלה — אבל קורא מסך ומנוע חיפוש
        זקוקים ל-h1 שקיים תמיד, גם כשהמאגר ריק.
      */}
      <h1 className="sr-only">מתחברים — מאגר שיעורי התורה</h1>
      <main id="main-content">
        <UpcomingLessonsCarousel />
        <LessonsDashboard />
        <ShareDistributionBar />
        <JoinTeachersCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
