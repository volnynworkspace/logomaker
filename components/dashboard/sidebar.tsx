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
} from "@tabler/icons-react";
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
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-72 p-4 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full border border-border/50 rounded-2xl bg-card shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col p-4">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-6 right-6 p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <IconX className="h-5 w-5" />
          </button>

          {/* Logo Section */}
          <div className="mb-6">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 group" onClick={() => handleNavClick("/")}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-colors rounded-xl" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  L
                </div>
              </div>
              <span className="text-xl font-bold">LogoAIpro</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform",
                    isActive ? "scale-105" : "group-hover:scale-105"
                  )} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="space-y-1.5">
            <Link
              href="/"
              onClick={() => handleNavClick("/")}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
            >
              <IconHome className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
            
            <SignedIn>
              <div className="px-3 py-3 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center gap-3">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.firstName || user?.username || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.primaryEmailAddress?.emailAddress || "No email"}
                    </p>
                  </div>
                </div>
              </div>
            </SignedIn>
          </div>
        </div>
      </aside>
    </>
  );
}

