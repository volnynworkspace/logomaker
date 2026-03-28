"use client";

import { checkHistory } from "../actions/actions";
import { useEffect, useState } from "react";
import { SelectLogo } from "@/db/schema";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";
import { downloadImage } from "../actions/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  IconSparkles,
  IconPalette,
  IconRocket,
  IconCalendarMonth,
  IconClock,
} from "@tabler/icons-react";

export default function DashboardPage() {
  const { toast } = useToast();
  const [logos, setLogos] = useState<SelectLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchLogos = async () => {
      const result = await checkHistory();
      if (Array.isArray(result)) {
        setLogos(result as SelectLogo[]);
      }
      setIsLoading(false);
    };
    fetchLogos();
  }, []);

  const totalDesigns = logos.length;
  const thisWeekDesigns = logos.filter(logo => {
    const logoDate = new Date(logo.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logoDate >= weekAgo;
  }).length;

  const thisMonthDesigns = logos.filter(logo => {
    const logoDate = new Date(logo.createdAt);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return logoDate >= monthAgo;
  }).length;

  const handleDownload = async (imageUrl: string) => {
    setIsDownloading(true);
    try {
      const result = await downloadImage(imageUrl);
      if (result.success && result.data) {
        const a = document.createElement("a");
        a.href = result.data;
        a.download = `logo.webp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({
          title: "Download started",
          description: "Your logo is being downloaded",
        });
      } else {
        throw new Error("Failed to download logo");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome Back
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your logo designs and create new ones
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconPalette className="h-4.5 w-4.5 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalDesigns}</div>
          <p className="text-sm text-muted-foreground mt-0.5">Total Designs</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IconClock className="h-4.5 w-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{thisWeekDesigns}</div>
          <p className="text-sm text-muted-foreground mt-0.5">This Week</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <IconCalendarMonth className="h-4.5 w-4.5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{thisMonthDesigns}</div>
          <p className="text-sm text-muted-foreground mt-0.5">This Month</p>
        </div>

        <Link href="/dashboard/generate" className="group">
          <div className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-all h-full flex flex-col items-center justify-center text-center gap-2 hover:border-primary/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <IconRocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Create New</span>
          </div>
        </Link>
      </div>

      {/* Recent Designs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Designs</h2>
          <Link href="/dashboard/my-designs">
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              View All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, index) => <SkeletonCard key={index} />)
          ) : logos.length > 0 ? (
            logos.slice(0, 6).map((logo) => (
              <LogoCard
                key={logo.id}
                logo={logo}
                onDownload={handleDownload}
              />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 py-12 flex flex-col items-center justify-center">
              <IconSparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold mb-1">No designs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start creating amazing logos
              </p>
              <Link href="/dashboard/generate">
                <Button size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                  <IconSparkles className="h-3.5 w-3.5" />
                  Create Logo
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
