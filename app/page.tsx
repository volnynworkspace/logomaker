"use client";

import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import HowItWorks from "@/components/landing/how-it-works";
import LogoShowcase from "@/components/landing/logo-showcase";
import Stats from "@/components/landing/stats";
import BottomCTA from "@/components/landing/bottom-cta";
import Footer from "@/components/landing/footer";

const Index = () => {
  return (
    <div className="overflow-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <LogoShowcase />
      <Stats />
      <BottomCTA />
      <Footer />
    </div>
  );
};

export default Index;
