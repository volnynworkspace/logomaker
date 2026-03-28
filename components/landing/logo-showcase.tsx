"use client";

import React from "react";
import { artworkData } from "@/constants/data";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart } from "lucide-react";

const showcaseLogos = artworkData.slice(0, 8).map((item, i) => ({
  ...item,
  name: [
    "Iconstack",
    "Attendflow",
    "Creativale",
    "Pilates Circle",
    "Opus AI",
    "NeuroTunes",
    "Schedula",
    "Createspace",
  ][i],
  description: [
    "60,000+ Free SVG I...",
    "Event marketing ma...",
    "All-in-One CRM, AI As...",
    "Move, full-circle.",
    "Every successful ap...",
    "Adaptive music stro...",
    "All-in-One Content...",
    "AI Media Made Sim...",
  ][i],
  likes: [921, 816, 981, 827, 424, 320, 246, 187][i],
}));

export default function LogoShowcase() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Discover creations
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Explore what others are building
            </p>
          </div>
          <Link
            href="/dashboard/my-designs"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {showcaseLogos.map((logo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="group cursor-pointer"
            >
              {/* Card Image */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border/60 mb-3">
                <img
                  src={logo.imageUrl}
                  alt={logo.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              {/* Card Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {logo.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {logo.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{logo.likes}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile "View all" */}
        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/dashboard/my-designs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
      </div>
    </section>
  );
}
