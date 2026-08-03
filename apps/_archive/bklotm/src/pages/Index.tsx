import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import RightsCategories from "@/components/RightsCategories";
import CommunitySection from "@/components/CommunitySection";
import PaidServiceSection from "@/components/PaidServiceSection";
import TipsSection from "@/components/TipsSection";
import DocumentsLibrary from "@/components/DocumentsLibrary";
import InstallAppCTA from "@/components/InstallAppCTA";
import LuxManageBanner from "@/components/LuxManageBanner";
import Footer from "@/components/Footer";
import FloatingBot from "@/components/FloatingBot";
import AIAgent from "@/components/AIAgent";
import FloatingElements from "@/components/FloatingElements";


const Index = () => {
  return (
    <div className="min-h-screen relative">
      <FloatingElements />
      <Navbar />
      <HeroSection />
      <StatsSection />
      <section id="categories">
        <RightsCategories />
      </section>
      <section id="paid-service">
        <PaidServiceSection />
      </section>
      <section id="community">
        <CommunitySection />
      </section>
      <section id="tips">
        <TipsSection />
      </section>
      <section id="documents">
        <DocumentsLibrary />
      </section>
      <InstallAppCTA />
      <LuxManageBanner />
      <Footer />
      <FloatingBot />
      <AIAgent />
    </div>
  );
};

export default Index;
