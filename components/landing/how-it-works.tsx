"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Wand2, Rocket } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Start with an idea",
    description:
      "Describe the logo you want to create or drop in screenshots and references for inspiration.",
  },
  {
    icon: Wand2,
    title: "Watch it come to life",
    description:
      "See your vision transform into a professional logo in real-time as AI builds it for you.",
  },
  {
    icon: Rocket,
    title: "Refine and ship",
    description:
      "Iterate on your creation with simple feedback and download it in high quality with one click.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left Side - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-5/12 flex-shrink-0"
          >
            <div className="relative aspect-square max-w-[400px] mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-violet-50 to-purple-100 rounded-3xl" />
              <div className="absolute inset-4 bg-gradient-to-br from-indigo-200/60 to-violet-200/60 rounded-2xl flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] opacity-80 blur-sm" />
                <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-2xl" />
              </div>
            </div>
          </motion.div>

          {/* Right Side - Steps */}
          <div className="flex-1 space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-10"
            >
              Meet Volnyn LogoAIpro
            </motion.h2>

            <div className="space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
