"use client";

import React from "react";
import { features } from "@/constants/data";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Discover templates
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Start your next project with a template
            </p>
          </div>
          <Link
            href="/example"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group cursor-pointer"
            >
              {/* Card Image */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-3 border border-border/60">
                <img
                  src={feature.imageUrl}
                  alt={feature.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              {/* Card Text */}
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {feature.smallHeading}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mobile "View all" */}
        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/example"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
      </div>
    </section>
  );
}
