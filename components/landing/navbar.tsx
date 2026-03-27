"use client";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { SignedOut } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "FAQs", href: "/#faq" },
    { label: "Example", href: "/example" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                LogoAI<span className="text-primary">pro</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              {!isMounted ? (
                <div className="w-[90px] h-[40px]" />
              ) : (
                <>
                  <SignedOut>
                    <SignInButton
                      signUpForceRedirectUrl="/dashboard"
                      forceRedirectUrl="/dashboard"
                      mode="modal"
                    >
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="text-sm font-medium"
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton
                      forceRedirectUrl="/dashboard"
                      mode="modal"
                    >
                      <Button 
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                      >
                        Get Started
                      </Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard">
                      <Button 
                        size="sm"
                        variant="outline"
                        className="font-medium"
                      >
                        Dashboard
                      </Button>
                    </Link>
                    <UserButton 
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 rounded-lg"
                        }
                      }}
                    />
                  </SignedIn>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg"
            >
              <div className="px-4 py-6 space-y-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {isMounted && (
                  <div className="pt-4 border-t border-border/40 space-y-3">
                    <SignedOut>
                      <SignInButton
                        signUpForceRedirectUrl="/dashboard"
                        forceRedirectUrl="/dashboard"
                        mode="modal"
                      >
                        <Button 
                          variant="ghost"
                          className="w-full justify-start text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign In
                        </Button>
                      </SignInButton>
                      <SignUpButton
                        forceRedirectUrl="/dashboard"
                        mode="modal"
                      >
                        <Button 
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Get Started
                        </Button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button 
                          variant="outline"
                          className="w-full font-medium"
                        >
                          Dashboard
                        </Button>
                      </Link>
                      <div className="flex items-center justify-center pt-2">
                        <UserButton 
                          appearance={{
                            elements: {
                              avatarBox: "w-10 h-10 rounded-lg"
                            }
                          }}
                        />
                      </div>
                    </SignedIn>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
