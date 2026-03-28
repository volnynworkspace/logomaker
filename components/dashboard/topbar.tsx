"use client";

import { IconMenu2 } from "@tabler/icons-react";

interface DashboardTopbarProps {
  onMenuClick?: () => void;
}

export default function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center h-14 px-4 sm:px-6 lg:px-8">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <IconMenu2 className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
