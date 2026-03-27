"use client";

import React from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { IconPencil, IconStar, IconEdit, IconWand } from "@tabler/icons-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {

  const features = [
    { icon: IconPencil, text: "Generate professional logos in seconds with AI" },
    { icon: IconStar, text: "Multiple style options: Minimal, Tech, Corporate, Creative & more" },
    { icon: IconEdit, text: "Customize colors, sizes, and quality to match your brand" },
    { icon: IconWand, text: "Complete ownership - use your logo anywhere, anytime" },
  ];

  return (
    <section className="relative overflow-hidden bg-transparent">
      <div className="max-w-6xl mx-auto px-4 pt-32 sm:pt-40 lg:pt-48 pb-12 sm:pb-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-center">
          {/* Left Side - Text and CTA */}
          <div className="order-2 lg:order-1 w-full lg:flex-1 lg:max-w-[500px] lg:min-h-[500px] flex-shrink-0 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight">
                  <span className="block">Create Professional</span>
                  <span className="block">Logos Instantly</span>
              </h1>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Enter your company name, choose your style and preferences, and watch our AI create a unique logo in seconds.
                </p>
              </div>

            {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="size-3.5 text-primary" />
                     </div>
                      <span className="text-sm text-foreground font-medium">{feature.text}</span>
                    </motion.div>
                );
              })}
              </div>

             {/* CTA Button */}
              <div className="pt-4">
               <SignedOut>
                 <SignInButton
                   signUpForceRedirectUrl="/dashboard"
                   forceRedirectUrl="/dashboard"
                   mode="modal"
                 >
                    <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl">
                      Create Your Logo Now
                   </Button>
                 </SignInButton>
               </SignedOut>
               <SignedIn>
                 <Link href="/dashboard/generate">
                    <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl">
                      Create Your Logo Now
                   </Button>
                 </Link>
               </SignedIn>
              </div>

             {/* Social Proof */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1">
                 {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-5 fill-green-500 text-green-500" />
                 ))}
               </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">4.5</span> out of 5{" "}
                 <span className="font-semibold text-foreground">126,964</span> reviews
               </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Hero Video */}
          <div className="relative order-1 lg:order-2 w-full lg:flex-1 lg:max-w-[600px] h-[400px] sm:h-[500px] lg:h-[500px] flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-full rounded-lg overflow-hidden bg-background flex items-center justify-center"
            >
              <video
                src="/hero-video.webm"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
