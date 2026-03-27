"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { allLogos, downloadImage } from "../actions/actions";
import { SelectLogo } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/landing/navbar";
import LogoCard from "@/components/logo-card";
import SkeletonCard from "@/components/skeleton-card";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Example() {
  const { toast } = useToast();
  const [logos, setLogos] = useState<SelectLogo[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const fetchedLogos = await allLogos();
        if (fetchedLogos) {
          setLogos(fetchedLogos);
        } else {
          toast({
            title: "Error",
            description: "Failed to load logos",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load logos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogos();
  }, []);

  const displayedLogos = showAll ? logos : logos.slice(0, 12);

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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Generated Logos</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Logo{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Examples
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Explore stunning logos created by our community. Get inspired and create your own unique brand identity with AI.
            </p>

            <Link href="/dashboard/generate">
              <Button size="lg" className="shadow-lg shadow-primary/25">
                Create Your Logo
                <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16 max-w-4xl mx-auto"
          >
            <div className="text-center p-4 rounded-xl bg-accent/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-1">
                {isLoading ? "..." : logos.length}+
              </div>
              <div className="text-sm text-muted-foreground">Logos Created</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-accent/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-1">100%</div>
              <div className="text-sm text-muted-foreground">AI-Powered</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-accent/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-accent/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-1">Instant</div>
              <div className="text-sm text-muted-foreground">Generation</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Gallery Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {isLoading ? (
              [...Array(12)].map((_, index) => <SkeletonCard key={index} />)
            ) : logos.length > 0 ? (
              displayedLogos.map((logo, index) => (
                <motion.div
                  key={logo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <LogoCard logo={logo} onDownload={() => handleDownload(logo.image_url)} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No logos yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create an amazing logo!
                </p>
                <Link href="/dashboard/generate">
                  <Button>
                    Start Creating
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Load More Button */}
          {!isLoading && logos.length > 12 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex justify-center mt-12"
            >
              <Button
                onClick={() => setShowAll(!showAll)}
                variant="outline"
                size="lg"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                {showAll ? "Show Less" : "Load More Examples"}
                <ArrowRight className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
              </Button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
