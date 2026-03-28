"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Plus, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      router.push(`/dashboard/generate?prompt=${encodeURIComponent(prompt.trim())}`);
    } else {
      router.push("/dashboard/generate");
    }
  };

  const companyLogos = [
    "ElevenLabs",
    "HubSpot",
    "Stripe",
    "Zendesk",
    "Notion",
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Vibrant Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/70 via-violet-50/40 to-background" />
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-300/50 rounded-full blur-[120px]" />
        <div className="absolute top-[-5%] right-[15%] w-[500px] h-[500px] bg-violet-300/35 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-purple-200/40 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[5%] w-[300px] h-[300px] bg-fuchsia-200/25 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-32 sm:pt-40 lg:pt-48 pb-16 sm:pb-24">
        <div className="flex flex-col items-center text-center">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight"
          >
            Build something{" "}
            <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
              Iconic
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-xl"
          >
            Create professional logos and brand identities by describing your vision with AI
          </motion.p>

          {/* Input-style CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 w-full max-w-2xl"
          >
            <SignedOut>
              <SignInButton
                signUpForceRedirectUrl="/dashboard/generate"
                forceRedirectUrl="/dashboard/generate"
                mode="modal"
              >
                <div className="relative bg-white rounded-2xl shadow-xl shadow-black/5 border border-border/60 p-2 cursor-pointer hover:shadow-2xl hover:shadow-black/10 transition-shadow duration-300">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Plus className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                    <span className="text-muted-foreground text-base flex-1 text-left">
                      Enter your brand or company name...
                    </span>
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground/40" />
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <form onSubmit={handleSubmit}>
                <div className="relative bg-white rounded-2xl shadow-xl shadow-black/5 border border-border/60 p-2 hover:shadow-2xl hover:shadow-black/10 transition-shadow duration-300">
                  <div className="flex items-center gap-3 px-4 py-1">
                    <Plus className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter your brand or company name..."
                      className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none py-2"
                    />
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground/40" />
                      <button
                        type="submit"
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                      >
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </SignedIn>
          </motion.div>

          {/* Company Logos Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-20 sm:mt-28"
          >
            <p className="text-sm text-muted-foreground mb-6">
              Teams from top companies build with Volnyn LogoAIpro
            </p>
            <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
              {companyLogos.map((name) => (
                <span
                  key={name}
                  className="text-lg sm:text-xl font-bold text-foreground/30 tracking-tight"
                >
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
