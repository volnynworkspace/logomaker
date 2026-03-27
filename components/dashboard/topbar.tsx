"use client";

import { IconSparkles, IconMenu2 } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getCredits } from "@/app/actions/actions";

interface DashboardTopbarProps {
  onMenuClick?: () => void;
}

export default function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  const [credits, setCredits] = useState({ remaining: 10, limit: 10 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCredits = async () => {
    setIsRefreshing(true);
    try {
      const result = await getCredits();
      setCredits(result);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    
    // Listen for credit refresh events
    const handleCreditRefresh = () => {
      fetchCredits();
    };
    
    window.addEventListener('refreshCredits', handleCreditRefresh);
    
    return () => {
      window.removeEventListener('refreshCredits', handleCreditRefresh);
    };
  }, []);

  return (
    <header className="z-30 w-full p-4">
      <div className="border border-border/50 rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6 gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Open menu"
          >
            <IconMenu2 className="h-5 w-5" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Credits UI - Responsive */}
          <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <IconSparkles className="h-4 w-4 text-primary" />
            <span className="text-xs lg:text-sm font-semibold text-primary whitespace-nowrap">
              {credits.remaining}
              <span className="hidden sm:inline"> Credits</span>
            </span>
            <button
              onClick={fetchCredits}
              disabled={isRefreshing}
              className="p-1 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
              title="Refresh credits"
            >
              <RefreshCw className={`h-3 w-3 lg:h-4 lg:w-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

