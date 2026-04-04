"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  Camera,
  Box,
  Monitor,
  Palette,
  Shapes,
  Eye,
  Smile,
  Droplets,
  Minimize2,
  Clapperboard,
  Clock,
  Star,
  Cloud,
  Flame,
  Snowflake,
  Zap,
  CircleDot,
  Moon,
  Leaf,
  ExternalLink,
} from "lucide-react";
import { generate8Images, generate8ImagesForVolnyn, downloadImageAs } from "../../actions/actions";
import type { DownloadFormat } from "../../actions/actions";
import DownloadFormatButton from "@/components/download-format-button";
import { useRef } from "react";
import { useVolnynSession } from "@/lib/volnyn-context";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS = [
  { id: "illustration", name: "Illustration", icon: Paintbrush },
  { id: "photography", name: "Photography", icon: Camera },
  { id: "3d-render", name: "3D Render", icon: Box },
  { id: "digital-art", name: "Digital Art", icon: Monitor },
  { id: "painting", name: "Painting", icon: Palette },
  { id: "abstract", name: "Abstract Art", icon: Shapes },
];

const STYLE_OPTIONS = [
  { id: "realistic", name: "Realistic", icon: Eye },
  { id: "cartoon", name: "Cartoon", icon: Smile },
  { id: "watercolor", name: "Watercolor", icon: Droplets },
  { id: "minimalist", name: "Minimalist", icon: Minimize2 },
  { id: "cinematic", name: "Cinematic", icon: Clapperboard },
  { id: "vintage", name: "Vintage", icon: Clock },
  { id: "anime", name: "Anime", icon: Star },
  { id: "surreal", name: "Surreal", icon: Cloud },
];

const COLOR_TONE_OPTIONS = [
  { id: "warm", name: "Warm Tones", icon: Flame },
  { id: "cool", name: "Cool Tones", icon: Snowflake },
  { id: "vibrant", name: "Vibrant", icon: Zap },
  { id: "muted", name: "Muted / Pastel", icon: CircleDot },
  { id: "monochrome", name: "Monochrome", icon: Moon },
  { id: "natural", name: "Natural", icon: Leaf },
];

const IMAGE_SIZE_GROUPS = [
  {
    label: "General",
    items: [
      { id: "general-square:1080x1080", name: "Square", dims: "1080 x 1080" },
      { id: "general-landscape:1920x1080", name: "Landscape", dims: "1920 x 1080" },
      { id: "general-portrait:1080x1350", name: "Portrait", dims: "1080 x 1350" },
      { id: "general-widescreen:2560x1440", name: "Widescreen", dims: "2560 x 1440" },
    ],
  },
  {
    label: "Instagram",
    items: [
      { id: "instagram-post:1080x1080", name: "Post", dims: "1080 x 1080" },
      { id: "instagram-story:1080x1920", name: "Story / Reel", dims: "1080 x 1920" },
      { id: "instagram-profile:320x320", name: "Profile Picture", dims: "320 x 320" },
    ],
  },
  {
    label: "Facebook",
    items: [
      { id: "facebook-post:1200x630", name: "Post", dims: "1200 x 630" },
      { id: "facebook-cover:1640x856", name: "Cover Photo", dims: "1640 x 856" },
      { id: "facebook-story:1080x1920", name: "Story", dims: "1080 x 1920" },
    ],
  },
  {
    label: "Twitter / X",
    items: [
      { id: "twitter-post:1600x900", name: "Post", dims: "1600 x 900" },
      { id: "twitter-header:1500x500", name: "Header", dims: "1500 x 500" },
    ],
  },
  {
    label: "YouTube",
    items: [
      { id: "youtube-thumbnail:1280x720", name: "Thumbnail", dims: "1280 x 720" },
      { id: "youtube-banner:2560x1440", name: "Channel Banner", dims: "2560 x 1440" },
    ],
  },
  {
    label: "LinkedIn",
    items: [
      { id: "linkedin-post:1200x627", name: "Post", dims: "1200 x 627" },
      { id: "linkedin-cover:1584x396", name: "Cover Photo", dims: "1584 x 396" },
    ],
  },
  {
    label: "TikTok",
    items: [
      { id: "tiktok-post:1080x1920", name: "Video / Post", dims: "1080 x 1920" },
    ],
  },
  {
    label: "Pinterest",
    items: [
      { id: "pinterest-pin:1000x1500", name: "Pin", dims: "1000 x 1500" },
    ],
  },
  {
    label: "WhatsApp",
    items: [
      { id: "whatsapp-status:1080x1920", name: "Status", dims: "1080 x 1920" },
    ],
  },
];

interface ImageVariation {
  url: string;
  style: string;
  success: boolean;
}

const TOTAL_STEPS = 6;

export default function GenerateImagePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("illustration");
  const [selectedStyle, setSelectedStyle] = useState("realistic");
  const [selectedColorTone, setSelectedColorTone] = useState("vibrant");
  const [selectedSize, setSelectedSize] = useState("general-square:1080x1080");
  const [selectedQuality, setSelectedQuality] = useState<"standard" | "hd">("hd");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageVariation[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingToVolnyn, setIsSendingToVolnyn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const volnynSession = useVolnynSession();

  // Reset to step 1 when sidebar link is clicked
  useEffect(() => {
    const handleReset = () => {
      setCurrentStep(1);
      setGeneratedImages([]);
      setSelectedImageIndex(null);
      setLoading(false);
    };
    window.addEventListener("resetGenerateImageSteps", handleReset);
    return () => window.removeEventListener("resetGenerateImageSteps", handleReset);
  }, []);

  const isFormValid = useMemo(() => prompt.trim().length >= 10, [prompt]);

  const canProceedToNextStep = useMemo(() => {
    switch (currentStep) {
      case 1: return prompt.trim().length >= 10;
      case 2: return selectedCategory !== "";
      case 3: return selectedStyle !== "";
      case 4: return selectedColorTone !== "";
      case 5: return true;
      default: return false;
    }
  }, [currentStep, prompt, selectedCategory, selectedStyle, selectedColorTone]);

  const nextStep = () => {
    if (canProceedToNextStep && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1 && currentStep <= 5) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    { number: 1, label: "Prompt", completed: prompt.trim().length >= 10 },
    { number: 2, label: "Category", completed: selectedCategory !== "" },
    { number: 3, label: "Style", completed: selectedStyle !== "" },
    { number: 4, label: "Color", completed: selectedColorTone !== "" },
    { number: 5, label: "Details", completed: true },
    { number: 6, label: "Result", completed: selectedImageIndex !== null },
  ];

  const startProgressAnimation = useCallback(() => {
    const startTime = Date.now();
    const estimatedMs = 30000;
    setProgress(0);
    setShowResults(false);
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const raw = Math.min(elapsed / estimatedMs, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.min(92, Math.round(eased * 100)));
    }, 150);
  }, []);

  const stopProgressAnimation = useCallback((success: boolean) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (success) {
      setProgress(100);
      setTimeout(() => setShowResults(true), 600);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isFormValid) return;
    setLoading(true);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    setShowResults(false);
    setCurrentStep(6);
    startProgressAnimation();

    try {
      const sizeDims = selectedSize.split(':')[1] || '1080x1080';
      const formData = {
        prompt,
        category: selectedCategory,
        style: selectedStyle,
        colorTone: selectedColorTone,
        size: sizeDims,
        quality: selectedQuality,
        additionalInfo,
      } as const;

      const result = volnynSession.isVolnynSession
        ? await generate8ImagesForVolnyn(
            formData,
            volnynSession.volnynUserId,
            volnynSession.timestamp,
            volnynSession.signature,
            volnynSession.callbackUrl,
            volnynSession.context
          )
        : await generate8Images(formData);

      if (result.success && result.images.length > 0) {
        setGeneratedImages(result.images);
        stopProgressAnimation(true);
        if (!volnynSession.isVolnynSession) {
          window.dispatchEvent(new CustomEvent("refreshCredits"));
        }
      } else {
        throw new Error(result.error || "Failed to generate images");
      }
    } catch (error) {
      stopProgressAnimation(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      setCurrentStep(5);
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedCategory, selectedStyle, selectedColorTone, selectedSize, selectedQuality, additionalInfo, isFormValid, toast, startProgressAnimation, stopProgressAnimation]);

  const handleSelectImage = useCallback((image: ImageVariation, index: number) => {
    if (!image.success || !image.url) return;
    setSelectedImageIndex(index);
  }, []);

  const handleDownload = useCallback(async (format: DownloadFormat) => {
    const image = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : generatedImages.find(i => i.success);
    if (!image?.url) return;
    setIsDownloading(true);
    try {
      const result = await downloadImageAs(image.url, format);
      if (result.success && result.data) {
        const a = document.createElement("a");
        a.href = result.data;
        a.download = `image-${image.style.toLowerCase().replace(/\s+/g, "-")}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: "Download started", description: "Your image is being downloaded" });
      } else {
        throw new Error("Failed to download image");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [selectedImageIndex, generatedImages, toast]);

  const handleSendToVolnyn = useCallback(async () => {
    const image = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;
    if (!image?.url || !volnynSession.isVolnynSession) return;
    setIsSendingToVolnyn(true);
    try {
      const response = await fetch("/api/volnyn-image-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: image.url,
          volnynUserId: volnynSession.volnynUserId,
          timestamp: volnynSession.timestamp,
          callbackUrl: volnynSession.callbackUrl,
          signature: volnynSession.signature,
          context: volnynSession.context,
        }),
      });
      const data = await response.json();
      if (data.success && data.redirect_url) {
        toast({ title: "Image sent!", description: "Redirecting back to your website..." });
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 1000);
      } else {
        throw new Error(data.message || "Failed to send image");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send image",
        variant: "destructive",
      });
    } finally {
      setIsSendingToVolnyn(false);
    }
  }, [selectedImageIndex, generatedImages, volnynSession, toast]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Describe your image</h2>
              <p className="text-sm text-muted-foreground">
                Be specific about subjects, composition, and details
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium">Image Description <span className="text-destructive">*</span></label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A serene mountain landscape at sunset with a crystal clear lake reflecting the sky, surrounded by pine trees..."
                className="flex-1 min-h-[140px] sm:min-h-[180px] text-sm border p-4 resize-none"
                autoFocus
              />
              <p className={`text-xs ${prompt.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"}`}>
                {prompt.trim().length}/10 characters minimum
              </p>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Choose a category</h2>
              <p className="text-sm text-muted-foreground">
                Select the type of image you want to generate
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORY_OPTIONS.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 sm:p-5 rounded-xl border flex flex-col items-center gap-2.5 text-center transition-all ${
                      selectedCategory === cat.id
                        ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                        : "border-border hover:border-foreground/30 hover:bg-accent/50"
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 ${selectedCategory === cat.id ? "text-foreground" : "text-muted-foreground"}`} />
                    <div className="font-medium text-sm">{cat.name}</div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Choose a style</h2>
              <p className="text-sm text-muted-foreground">
                Select the artistic style for your image
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STYLE_OPTIONS.map((style) => {
                const IconComponent = style.icon;
                return (
                  <motion.button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 sm:p-5 rounded-xl border flex flex-col items-center gap-2.5 text-center transition-all ${
                      selectedStyle === style.id
                        ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                        : "border-border hover:border-foreground/30 hover:bg-accent/50"
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 ${selectedStyle === style.id ? "text-foreground" : "text-muted-foreground"}`} />
                    <div className="font-medium text-sm">{style.name}</div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Choose a Color Tone</h2>
              <p className="text-sm text-muted-foreground">
                Set the mood and color palette of your image
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_TONE_OPTIONS.map((tone) => {
                const IconComponent = tone.icon;
                return (
                  <motion.button
                    key={tone.id}
                    onClick={() => setSelectedColorTone(tone.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      selectedColorTone === tone.id
                        ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                        : "border-border hover:border-foreground/30 hover:bg-accent/50"
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${selectedColorTone === tone.id ? "text-foreground" : "text-muted-foreground"}`} />
                    <div className="font-medium text-xs">{tone.name}</div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Size, Quality & Details</h2>
              <p className="text-sm text-muted-foreground">
                Fine-tune your generation settings
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Image Size</label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="h-12 border">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {IMAGE_SIZE_GROUPS.map((group, gi) => (
                      <div key={group.label}>
                        {gi > 0 && <SelectSeparator />}
                        <SelectGroup>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <span className="flex items-center justify-between gap-3 w-full">
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.dims}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <Select value={selectedQuality} onValueChange={(value: "standard" | "hd") => setSelectedQuality(value)}>
                  <SelectTrigger className="h-12 border">
                    <SelectValue placeholder="Select Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium">Additional Details (optional)</label>
              <Textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Any extra instructions, specific elements, lighting preferences, or references..."
                className="flex-1 min-h-[100px] sm:min-h-[120px] text-sm border p-4 resize-none"
              />
            </div>
          </motion.div>
        );

      case 6: {
        const circumference = 2 * Math.PI * 54;

        if (!showResults) {
          return (
            <motion.div
              key="step-6-loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 py-8"
            >
              <div className="relative">
                <svg className="w-32 h-32 sm:w-40 sm:h-40" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-muted/20" />
                  <circle
                    cx="60" cy="60" r="54" fill="none" strokeWidth="6"
                    className="stroke-foreground"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress / 100)}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{progress}%</span>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {progress < 30 ? "Creating your images..." : progress < 70 ? "Crafting unique variations..." : progress < 100 ? "Almost there..." : "Done!"}
                </p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </motion.div>
          );
        }

        const successfulImages = generatedImages.filter((i) => i.success && i.url);
        return (
          <motion.div
            key="step-6-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Choose Your Image</h2>
              <p className="text-sm text-muted-foreground">
                Click an image to select it, then download
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              {successfulImages.map((image, index) => {
                const realIndex = generatedImages.indexOf(image);
                return (
                  <motion.button
                    key={realIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    onClick={() => handleSelectImage(image, realIndex)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative aspect-square rounded-xl border overflow-hidden transition-all group ${
                      selectedImageIndex === realIndex
                        ? "border-foreground ring-2 ring-foreground/20 shadow-lg"
                        : "border-border hover:border-foreground/40 cursor-pointer"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`${image.style} variation`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-2 py-1">
                      <span className="text-white text-[10px] sm:text-xs font-medium">{image.style}</span>
                    </div>
                    {selectedImageIndex === realIndex && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-background" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {volnynSession.isVolnynSession ? (
                <>
                  <Button
                    onClick={handleSendToVolnyn}
                    disabled={selectedImageIndex === null || isSendingToVolnyn}
                    size="lg"
                    className="flex-1 gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isSendingToVolnyn ? "Sending..." : "Use This Image"}
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !isFormValid}
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                </>
              ) : (
                <>
                  <DownloadFormatButton
                    onDownload={handleDownload}
                    disabled={selectedImageIndex === null}
                    isDownloading={isDownloading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !isFormValid}
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                </>
              )}
            </div>

            {selectedImageIndex === null && (
              <p className="text-center text-xs text-muted-foreground">
                {volnynSession.isVolnynSession
                  ? "Select an image above to send it to your website"
                  : "Select an image above to enable Download"}
              </p>
            )}
          </motion.div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Generate Image</h1>
        <p className="text-muted-foreground mt-1">
          Create stunning AI-generated images with multiple style variations
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-2">
        <div className="flex items-center gap-1">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    currentStep >= step.number
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  } ${currentStep === step.number ? "ring-2 ring-foreground/20 ring-offset-2 ring-offset-background" : ""}`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`mt-1.5 text-[10px] sm:text-xs font-medium ${
                  currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px flex-1 mb-5 ${
                  currentStep > step.number ? "bg-foreground" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-8 min-h-[460px] flex flex-col">
        {/* Back button on step 6 results */}
        {currentStep === 6 && showResults && (
          <button
            onClick={() => { setCurrentStep(5); setShowResults(false); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

        {/* Navigation */}
        {currentStep <= 5 && (
          <div className="flex justify-between mt-auto pt-6">
            <Button
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="outline"
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNextStep}
                className="gap-2 bg-foreground text-background hover:bg-foreground/90"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!isFormValid || loading}
                className="gap-2 bg-foreground text-background hover:bg-foreground/90"
              >
                {loading ? (
                  <>
                    Generating...
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Generate Images
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
