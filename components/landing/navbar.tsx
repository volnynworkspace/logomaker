"use client";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { SignedOut } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl tracking-tight flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">Volnyn</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-bold text-foreground">LogoAI<span className="text-primary">pro</span></span>
              </span>
            </Link>

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
                      <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                        Log in
                      </button>
                    </SignInButton>
                    <SignUpButton
                      forceRedirectUrl="/dashboard"
                      mode="modal"
                    >
                      <Button
                        size="sm"
                        className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-5 font-medium text-sm"
                      >
                        Get started
                      </Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard">
                      <Button
                        size="sm"
                        className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-5 font-medium text-sm"
                      >
                        Dashboard
                      </Button>
                    </Link>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8 rounded-full"
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
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
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
              className="md:hidden border-t border-border/40 bg-background"
            >
              <div className="px-4 py-6 space-y-1">
                {isMounted && (
                  <div className="space-y-3">
                    <SignedOut>
                      <SignInButton
                        signUpForceRedirectUrl="/dashboard"
                        forceRedirectUrl="/dashboard"
                        mode="modal"
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-center text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Log in
                        </Button>
                      </SignInButton>
                      <SignUpButton
                        forceRedirectUrl="/dashboard"
                        mode="modal"
                      >
                        <Button
                          className="w-full bg-foreground text-background hover:bg-foreground/90"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Get started
                        </Button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
                        >
                          Dashboard
                        </Button>
                      </Link>
                      <div className="flex items-center justify-center pt-2">
                        <UserButton
                          appearance={{
                            elements: {
                              avatarBox: "w-10 h-10 rounded-full"
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
