import React from "react";
import {
  IconBrandDribbble,
  IconBrandLinkedin,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Sparkles } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Company: [
    { label: "About", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Press & media", href: "/" },
    { label: "Security", href: "/" },
  ],
  Product: [
    { label: "Logo Generator", href: "/dashboard/generate" },
    { label: "My Designs", href: "/dashboard/my-designs" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Resources: [
    { label: "Blog", href: "/" },
    { label: "Support", href: "/" },
    { label: "Guides", href: "/" },
  ],
  Legal: [
    { label: "Privacy policy", href: "/" },
    { label: "Terms of service", href: "/" },
    { label: "Cookie settings", href: "/" },
  ],
  Community: [
    { label: "Dribbble", href: "https://dribbble.com/webbuddy" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/webbuddy-agency/posts/?feedView=all" },
    { label: "YouTube", href: "https://www.youtube.com/@WebBuddyAgency" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Brand */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg tracking-tight flex items-center gap-1.5">
              <span className="font-medium text-muted-foreground">Volnyn</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-bold text-foreground">LogoAI<span className="text-primary">pro</span></span>
            </span>
          </Link>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Volnyn &middot; LogoAIpro. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://dribbble.com/webbuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dribbble"
            >
              <IconBrandDribbble className="size-5" />
            </Link>
            <Link
              href="https://www.linkedin.com/company/webbuddy-agency/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="LinkedIn"
            >
              <IconBrandLinkedin className="size-5" />
            </Link>
            <Link
              href="https://www.youtube.com/@WebBuddyAgency"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="YouTube"
            >
              <IconBrandYoutube className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
