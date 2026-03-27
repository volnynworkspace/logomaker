import React from "react";
import {
  IconBrandDribbble,
  IconBrandLinkedin,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Sparkles } from "lucide-react";
import FooterGradient from "../ui/footer-gradient";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-border/40 mt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-dot-black/[0.2] z-0"></div>
      <FooterGradient />

      {/* Navigation & Links Section */}
      <div className="relative z-10 border-t border-border/40 bg-background/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start">
              <Link 
                href="/" 
                className="flex items-center gap-2 group mb-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  LogoAI<span className="text-primary">pro</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground text-center md:text-left max-w-xs">
                AI-powered logo design that transforms your ideas into stunning brand identities.
              </p>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              <Link
                href="/example"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Example
              </Link>
              <Link
                href="/#features"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Features
              </Link>
              <Link
                href="/#faq"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                FAQs
              </Link>
            </nav>

            {/* Social Links */}
            <div className="flex gap-3">
              <Link
                href="https://dribbble.com/webbuddy"
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/10 transition-all"
                aria-label="Dribbble"
              >
                <IconBrandDribbble className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="https://www.linkedin.com/company/webbuddy-agency/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/10 transition-all"
                aria-label="LinkedIn"
              >
                <IconBrandLinkedin className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="https://www.youtube.com/@WebBuddyAgency"
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/10 transition-all"
                aria-label="YouTube"
              >
                <IconBrandYoutube className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} LogoAIpro. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Powered by AI • Built with ❤️
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
