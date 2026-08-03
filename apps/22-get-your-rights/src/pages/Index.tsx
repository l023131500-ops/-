import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import RightsCategories from "@/components/RightsCategories";
import CommunitySection from "@/components/CommunitySection";
import PaidServiceSection from "@/components/PaidServiceSection";
import Footer from "@/components/Footer";
import FloatingElements from "@/components/FloatingElements";
import { Suspense, lazy } from "react";

/*
  שני הווידג'טים הצפים נטענים בנפרד. שניהם אינם נראים בציור הראשון —
  הם כפתורים בפינות — ובתוכם יושבות שתי ההוצאות הגדולות של החבילה:
  `react-markdown` (רינדור תשובות הסוכן, על כל שרשרת micromark) ובודק
  הזכויות המלא. מי שרק גולל בעמוד לא צריך להוריד אותם כדי לראות אותו.
*/
const FloatingBot = lazy(() => import("@/components/FloatingBot"));
const AIAgent = lazy(() => import("@/components/AIAgent"));


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
      
      <Footer />
      <Suspense fallback={null}>
        <FloatingBot />
        <AIAgent />
      </Suspense>
    </div>
  );
};

export default Index;
