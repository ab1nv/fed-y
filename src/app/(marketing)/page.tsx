import Header from "@/components/landing/header";
import Hero from "@/components/landing/hero";
import Problems from "@/components/landing/problems";
import Showcase from "@/components/landing/showcase";
import Spotlight from "@/components/landing/spotlight";
import Stats from "@/components/landing/stats";
import CtaFooter from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Problems />
        <Showcase />
        <Spotlight />
        <Stats />
        <CtaFooter />
      </main>
    </>
  );
}
