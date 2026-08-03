import Layout from "@/components/Layout";
import HeroSection from "@/components/home/HeroSection";
import BenefitsSection from "@/components/home/BenefitsSection";
import TipsSection from "@/components/home/TipsSection";
import CounterSection from "@/components/home/CounterSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <BenefitsSection />
      <TipsSection />
      <CounterSection />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
