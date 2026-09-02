import Layout from "@/components/Layout";
import HeroSection from "@/components/home/HeroSection";
import BenefitsSection from "@/components/home/BenefitsSection";
import TipsSection from "@/components/home/TipsSection";
import FeaturedMaterialsSection from "@/components/home/FeaturedMaterialsSection";
import CounterSection from "@/components/home/CounterSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <BenefitsSection />
      <TipsSection />
      <FeaturedMaterialsSection />
      <CounterSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
