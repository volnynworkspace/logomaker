"use client";

import React from "react";
import { motion } from "framer-motion";

const stats = [
  {
    value: "36M+",
    label: "logos created on Volnyn LogoAIpro",
  },
  {
    value: "200K+",
    label: "logos generated per day on Volnyn LogoAIpro",
  },
  {
    value: "300M",
    label: "visits per day to Volnyn LogoAIpro applications",
  },
];

export default function Stats() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Volnyn LogoAIpro in numbers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Millions of builders are already turning ideas into reality
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-border/60 bg-card p-8 sm:p-10 text-center"
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                {stat.value}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
