"use client";

import { Card, CardContent } from "@/components/ui/card";
import { checkHistory } from "../actions/actions";
import { useEffect, useState } from "react";
import { SelectLogo } from "@/db/schema";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";
import { Download } from "lucide-react";
import { downloadImage } from "../actions/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  IconSparkles,
  IconPalette,
  IconTrendingUp,
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

  // Calculate analytics
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
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Welcome Back 👋
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your logo designs and create new ones
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/50 bg-card hover:shadow-xl transition-all duration-300 hover:border-primary/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IconPalette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {totalDesigns}
              </span>
            </div>
            <h3 className="font-semibold text-xs sm:text-sm">Total Designs</h3>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card hover:shadow-xl transition-all duration-300 hover:border-green-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <IconClock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent">
                {thisWeekDesigns}
              </span>
            </div>
            <h3 className="font-semibold text-xs sm:text-sm">This Week</h3>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card hover:shadow-xl transition-all duration-300 hover:border-blue-500/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <IconCalendarMonth className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {thisMonthDesigns}
              </span>
            </div>
            <h3 className="font-semibold text-xs sm:text-sm">This Month</h3>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card hover:shadow-xl transition-all duration-300 hover:border-primary/20 cursor-pointer group">
          <Link href="/dashboard/generate">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 p-2 sm:p-3 mb-1 sm:mb-2 shadow-lg group-hover:shadow-xl transition-shadow">
                  <IconRocket className="h-full w-full text-white" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm">Create New</h3>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Designs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold">Recent Designs</h2>
          <Link href="/dashboard/my-designs">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
            <Card className="col-span-full border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <IconSparkles className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-1">No designs yet</h3>
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Start creating amazing logos
                </p>
                <Link href="/dashboard/generate">
                  <Button size="sm" className="gap-2">
                    <IconSparkles className="h-3 w-3" />
                    Create Logo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

