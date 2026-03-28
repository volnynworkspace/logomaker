"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Plus, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BottomCTA() {
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

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-medium text-muted-foreground mb-3">
            AI Logo Builder
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Ready to build?
          </h2>

          {/* Input CTA */}
          <div className="mt-10 max-w-xl mx-auto">
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
