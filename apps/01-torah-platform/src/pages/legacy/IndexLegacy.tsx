import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedLessons from "@/components/FeaturedLessons";
import SynagogueShowcase from "@/components/SynagogueShowcase";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import BulkUploadBanner from "@/components/BulkUploadBanner";
import SynagogueBanner from "@/components/SynagogueBanner";
import StudyDayBanner from "@/components/StudyDayBanner";
import DonationBanner from "@/components/DonationBanner";
import Footer from "@/components/Footer";
import FloatingChatBot from "@/components/FloatingChatBot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturedLessons />
      <SynagogueShowcase />
      <FAQSection />
      <ContactSection />
      <SynagogueBanner />
      <BulkUploadBanner />
      <StudyDayBanner />
      <DonationBanner />
      <Footer />
      <FloatingChatBot />
    </div>
  );
};

export default Index;
