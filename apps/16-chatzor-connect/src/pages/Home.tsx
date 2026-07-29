import { Hero } from "@/components/home/Hero";
import { ZmanimStrip } from "@/components/home/ZmanimStrip";
import { SynagoguesPreview } from "@/components/home/SynagoguesPreview";
import { LessonsPreview } from "@/components/home/LessonsPreview";
import { ServicesPreview } from "@/components/home/ServicesPreview";

export function Home() {
  return (
    <>
      <Hero />
      <ZmanimStrip />
      <SynagoguesPreview />
      <LessonsPreview />
      <ServicesPreview />
    </>
  );
}
