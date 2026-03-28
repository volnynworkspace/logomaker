"use client";

import { Button } from "@/components/ui/button";
import { checkHistory, downloadImage } from "../../actions/actions";
import { useEffect, useState } from "react";
import { SelectLogo } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";
import { IconSparkles } from "@tabler/icons-react";
import Link from "next/link";

export default function MyDesignsPage() {
  const { toast } = useToast();
  const [logos, setLogos] = useState<SelectLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const result = await checkHistory();
        if (!result) {
          setError("You must be signed in to view your designs.");
        } else if ("error" in result) {
          console.error("[MyDesigns] checkHistory error:", result.error);
          setError(`Failed to load designs: ${result.error}`);
        } else if (Array.isArray(result)) {
          setLogos(result);
        }
      } catch (err) {
        console.error("[MyDesigns] Unexpected error:", err);
        setError("An unexpected error occurred while loading your designs.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogos();
  }, []);

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
        description: error instanceof Error ? error.message : "An unexpected error occurred while downloading",
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
          My Designs
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage all your created logos
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {isLoading ? (
          [...Array(12)].map((_, index) => <SkeletonCard key={index} />)
        ) : error ? (
          <div className="col-span-full text-center py-16">
            <p className="text-base font-semibold mb-2 text-destructive">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : logos.length > 0 ? (
          logos.map((logo) => (
            <LogoCard
              key={logo.id}
              logo={logo}
              onDownload={() => handleDownload(logo.image_url)}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-border/60 py-16 flex flex-col items-center justify-center">
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
  );
}
