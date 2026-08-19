import Layout from "@/components/Layout";
import HeroSection from "@/components/home/HeroSection";
import BenefitsSection from "@/components/home/BenefitsSection";
import TipsSection from "@/components/home/TipsSection";
import CounterSection from "@/components/home/CounterSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <BenefitsSection />
      <TipsSection />
      <CounterSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
