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
      <UpcomingLessonsCarousel />
      <LessonsDashboard />
      <ShareDistributionBar />
      <JoinTeachersCTA />
      <Footer />
    </div>
  );
};

export default Index;
