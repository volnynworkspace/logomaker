"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { checkHistory, downloadImage } from "../../actions/actions";
import { useEffect, useState } from "react";
import { SelectLogo } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";

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
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          My Designs
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage all your created logos
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {isLoading ? (
          [...Array(12)].map((_, index) => <SkeletonCard key={index} />)
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <p className="text-lg font-semibold mb-2 text-destructive">Something went wrong</p>
            <p className="text-muted-foreground mb-4">{error}</p>
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
          <div className="col-span-full text-center py-12">
            <p className="text-lg font-semibold mb-2">No designs yet</p>
            <p className="text-muted-foreground mb-4">
              Start creating amazing logos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

