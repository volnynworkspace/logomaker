"use client";

import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconSparkles,
  IconPalette,
  IconHome,
  IconCreditCard,
  IconX,
  IconPhoto,
} from "@tabler/icons-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Generate",
    href: "/dashboard/generate",
    icon: IconSparkles,
  },
  {
    title: "Generate Image",
    href: "/dashboard/generate-image",
    icon: IconPhoto,
  },
  {
    title: "My Designs",
    href: "/dashboard/my-designs",
    icon: IconPalette,
  },
  {
    title: "Add Credits",
    href: "/dashboard/credits",
    icon: IconCreditCard,
  },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const handleNavClick = (href: string) => {
    if (href === "/dashboard/generate") {
      window.dispatchEvent(new CustomEvent("resetGenerateSteps"));
    }
    if (href === "/dashboard/generate-image") {
      window.dispatchEvent(new CustomEvent("resetGenerateImageSteps"));
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-background border-r border-border/50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col px-4 py-5">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-5 right-4 p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <IconX className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2 mb-8" onClick={() => handleNavClick("/")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg tracking-tight flex items-center gap-1.5">
              <span className="font-medium text-muted-foreground">Volnyn</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-bold text-foreground">LogoAI<span className="text-primary">pro</span></span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="space-y-2 pt-4 border-t border-border/50">
            <Link
              href="/"
              onClick={() => handleNavClick("/")}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <IconHome className="h-[18px] w-[18px]" />
              <span>Back to Home</span>
            </Link>

            <SignedIn>
              <div className="flex items-center gap-3 px-3 py-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.firstName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </div>
            </SignedIn>
          </div>
        </div>
      </aside>
    </>
  );
}
