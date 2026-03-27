"use client";

import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import LogoShowcase from "@/components/landing/logo-showcase";
import Footer from "@/components/landing/footer";
import Faq from "@/components/landing/faq";
const Index = () => {
  return (
    <>
      <div className="overflow-hidden">
        {/* Background wrapper for navbar and hero */}
        <div className="relative">
          <div className="absolute inset-0 top-0 -z-10 bg-gradient-to-br from-background via-background to-primary/5 min-h-[calc(100vh+4rem)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,165,0,0.1),transparent_60%)]"></div>
          </div>
          <Navbar />
          <Hero />
        </div>

        <main className="max-w-6xl mx-auto relative z-10">
          <div className="px-4">
            <Features />
          </div>
        </main>
        <LogoShowcase />
        <main className="max-w-6xl mx-auto">
          <div className="px-4">
            <Faq />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
