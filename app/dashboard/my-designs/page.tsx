"use client";

import { Button } from "@/components/ui/button";
import { checkHistory, checkImageHistory, downloadImageAs } from "../../actions/actions";
import type { DownloadFormat } from "../../actions/actions";
import DownloadFormatButton from "@/components/download-format-button";
import { useEffect, useState } from "react";
import { SelectLogo } from "@/db/schema";
import { SelectGeneratedImage } from "@/db/image-schema";
import { useToast } from "@/hooks/use-toast";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";
import { IconSparkles, IconPhoto } from "@tabler/icons-react";
import Link from "next/link";

type ActiveTab = "logos" | "images";

export default function MyDesignsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("logos");
  const [logos, setLogos] = useState<SelectLogo[]>([]);
  const [images, setImages] = useState<SelectGeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImagesLoading, setIsImagesLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [imagesFetched, setImagesFetched] = useState(false);

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

  // Fetch images lazily when tab is first switched to
  useEffect(() => {
    if (activeTab === "images" && !imagesFetched) {
      setIsImagesLoading(true);
      const fetchImages = async () => {
        try {
          const result = await checkImageHistory();
          if (!result) {
            setImagesError("You must be signed in to view your images.");
          } else if ("error" in result) {
            setImagesError(`Failed to load images: ${result.error}`);
          } else if (Array.isArray(result)) {
            setImages(result);
          }
        } catch (err) {
          console.error("[MyDesigns] Image fetch error:", err);
          setImagesError("An unexpected error occurred while loading your images.");
        } finally {
          setIsImagesLoading(false);
          setImagesFetched(true);
        }
      };
      fetchImages();
    }
  }, [activeTab, imagesFetched]);

  const handleDownload = async (imageUrl: string, format: DownloadFormat, basename?: string) => {
    setIsDownloading(true);
    try {
      const result = await downloadImageAs(imageUrl, format);
      if (result.success && result.data) {
        const a = document.createElement("a");
        a.href = result.data;
        a.download = `${basename || "design"}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({
          title: "Download started",
          description: "Your file is being downloaded",
        });
      } else {
        throw new Error("Failed to download");
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
          View and manage all your created designs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("logos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "logos"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconSparkles className="h-4 w-4" />
          Logos
        </button>
        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "images"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconPhoto className="h-4 w-4" />
          Images
        </button>
      </div>

      {/* Content */}
      {activeTab === "logos" ? (
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
                onDownload={(url, fmt) => handleDownload(url, fmt, "logo")}
              />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 py-16 flex flex-col items-center justify-center">
              <IconSparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold mb-1">No logos yet</h3>
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {isImagesLoading ? (
            [...Array(12)].map((_, index) => <SkeletonCard key={index} />)
          ) : imagesError ? (
            <div className="col-span-full text-center py-16">
              <p className="text-base font-semibold mb-2 text-destructive">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{imagesError}</p>
            </div>
          ) : images.length > 0 ? (
            images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square rounded-xl border border-border/60 overflow-hidden bg-accent/30"
              >
                <img
                  src={image.image_url}
                  alt={image.prompt.slice(0, 50)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                  <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <DownloadFormatButton
                      size="sm"
                      className="w-full"
                      onDownload={(fmt) => handleDownload(image.image_url, fmt, `image-${image.style}`)}
                    />
                  </div>
                </div>
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-2">
                  <span className="text-white text-[10px] font-medium line-clamp-1">{image.category} &middot; {image.style}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 py-16 flex flex-col items-center justify-center">
              <IconPhoto className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold mb-1">No images yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start generating amazing images
              </p>
              <Link href="/dashboard/generate-image">
                <Button size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                  <IconPhoto className="h-3.5 w-3.5" />
                  Generate Image
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
