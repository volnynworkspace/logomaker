"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  RefreshCw,
  Check,
  Pencil,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Circle,
  Monitor,
  Building2,
  Paintbrush,
  Shapes,
} from "lucide-react";
import { generate8Logos, downloadImage } from "../../actions/actions";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_MODEL = "black-forest-labs/flux-schnell" as const;
import { useToast } from "@/hooks/use-toast";

const EDITOR_STORAGE_KEY = "logoai_editor_data";

const STYLE_OPTIONS = [
  { id: "minimal", name: "Minimal", icon: Circle, details: "Flashy, attention grabbing, bold, futuristic, and eye-catching. Use vibrant neon colors with metallic, shiny, and glossy accents." },
  { id: "tech", name: "Technology", icon: Monitor, details: "highly detailed, sharp focus, cinematic, photorealistic, Minimalist, clean, sleek, neutral color pallete with subtle accents, clean lines, shadows, and flat." },
  { id: "corporate", name: "Corporate", icon: Building2, details: "modern, forward-thinking, flat design, geometric shapes, clean lines, natural colors with subtle accents, use strategic negative space to create visual interest." },
  { id: "creative", name: "Creative", icon: Paintbrush, details: "playful, lighthearted, bright bold colors, rounded shapes, lively." },
  { id: "abstract", name: "Abstract", icon: Shapes, details: "abstract, artistic, creative, unique shapes, patterns, and textures to create a visually interesting and wild logo." },
  { id: "flashy", name: "Flashy", icon: Sparkles, details: "Flashy, attention grabbing, bold, futuristic, and eye-catching. Use vibrant neon colors with metallic, shiny, and glossy accents." },
];

const SIZE_OPTIONS = [
  { id: "256x256", name: "Small (256x256)" },
  { id: "512x512", name: "Medium (512x512)" },
  { id: "1024x1024", name: "Large (1024x1024)" },
];

interface LogoVariation {
  url: string;
  style: string;
  success: boolean;
}

const TOTAL_STEPS = 6;

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("minimal");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [selectedSize, setSelectedSize] = useState<"256x256" | "512x512" | "1024x1024">("1024x1024");
  const [selectedQuality, setSelectedQuality] = useState<"standard" | "hd">("hd");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLogos, setGeneratedLogos] = useState<LogoVariation[]>([]);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Pre-fill from hero input prompt query param
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt) {
      setCompanyName(prompt);
      setCurrentStep(2);
    }
  }, [searchParams]);

  // Reset to step 1 when sidebar "Generate" link is clicked
  useEffect(() => {
    const handleReset = () => {
      setCurrentStep(1);
      setGeneratedLogos([]);
      setSelectedLogoIndex(null);
      setLoading(false);
    };
    window.addEventListener("resetGenerateSteps", handleReset);
    return () => window.removeEventListener("resetGenerateSteps", handleReset);
  }, []);

  const isFormValid = useMemo(() => companyName.trim().length > 0, [companyName]);

  const canProceedToNextStep = useMemo(() => {
    switch (currentStep) {
      case 1: return companyName.trim().length > 0;
      case 2: return selectedStyle !== "";
      case 3: return primaryColor !== "" && backgroundColor !== "";
      case 4: return !!selectedSize && !!selectedQuality;
      case 5: return true;
      default: return false;
    }
  }, [currentStep, companyName, selectedStyle, primaryColor, backgroundColor, selectedSize, selectedQuality]);

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
    { number: 1, label: "Name", completed: companyName.trim().length > 0 },
    { number: 2, label: "Style", completed: selectedStyle !== "" },
    { number: 3, label: "Colors", completed: primaryColor !== "" && backgroundColor !== "" },
    { number: 4, label: "Size", completed: !!selectedSize && !!selectedQuality },
    { number: 5, label: "Details", completed: true },
    { number: 6, label: "Result", completed: selectedLogoIndex !== null },
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
    setGeneratedLogos([]);
    setSelectedLogoIndex(null);
    setShowResults(false);
    setCurrentStep(6);
    startProgressAnimation();

    try {
      const result = await generate8Logos({
        companyName,
        style: selectedStyle,
        symbolPreference: "modern and professional",
        primaryColor,
        secondaryColor: backgroundColor,
        model: DEFAULT_MODEL,
        size: selectedSize,
        quality: selectedQuality,
        additionalInfo,
      });

      if (result.success && result.logos.length > 0) {
        setGeneratedLogos(result.logos);
        stopProgressAnimation(true);
        window.dispatchEvent(new CustomEvent("refreshCredits"));
      } else {
        throw new Error(result.error || "Failed to generate logos");
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
  }, [companyName, selectedStyle, primaryColor, backgroundColor, selectedSize, selectedQuality, additionalInfo, isFormValid, toast, startProgressAnimation, stopProgressAnimation]);

  const handleSelectLogo = useCallback((logo: LogoVariation, index: number) => {
    if (!logo.success || !logo.url) return;
    setSelectedLogoIndex(index);
  }, []);

  const handleEditLogo = useCallback(() => {
    const logo = selectedLogoIndex !== null ? generatedLogos[selectedLogoIndex] : null;
    if (!logo?.url) return;
    const editorData = {
      imageUrl: logo.url,
      companyName,
      primaryColor,
      backgroundColor,
      style: logo.style,
      model: DEFAULT_MODEL,
      size: selectedSize,
      quality: selectedQuality,
    };
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editorData));
    router.push("/dashboard/editor");
  }, [selectedLogoIndex, generatedLogos, companyName, primaryColor, backgroundColor, selectedSize, selectedQuality, router]);

  const handleDownload = useCallback(async () => {
    const logo = selectedLogoIndex !== null ? generatedLogos[selectedLogoIndex] : generatedLogos.find(l => l.success);
    if (!logo?.url) return;
    setIsDownloading(true);
    try {
      const result = await downloadImage(logo.url);
      if (result.success && result.data) {
        const a = document.createElement("a");
        a.href = result.data;
        a.download = `${companyName.trim()}-logo-${logo.style.toLowerCase().replace(/\s+/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: "Download started", description: "Your logo is being downloaded" });
      } else {
        throw new Error("Failed to download logo");
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
  }, [selectedLogoIndex, generatedLogos, companyName, toast]);

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
              <h2 className="text-xl sm:text-2xl font-semibold">What&apos;s your brand name?</h2>
              <p className="text-sm text-muted-foreground">
                Enter the name you want to appear in your logo
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Brand Name <span className="text-destructive">*</span></label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Bella & Co., Volnyn, Swamz..."
                className="h-12 text-base border border-border"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && canProceedToNextStep) nextStep();
                }}
              />
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
              <h2 className="text-xl sm:text-2xl font-semibold">Choose a style</h2>
              <p className="text-sm text-muted-foreground">
                Select the design style that matches your brand
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <h2 className="text-xl sm:text-2xl font-semibold">Choose Your Colors</h2>
              <p className="text-sm text-muted-foreground">
                Pick the perfect colors for your logo
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-none hover:border-foreground/30 transition-colors"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setPrimaryColor(v);
                    }}
                    placeholder="#2563EB"
                    className="h-12 border font-mono text-sm uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-none hover:border-foreground/30 transition-colors"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setBackgroundColor(v);
                    }}
                    placeholder="#FFFFFF"
                    className="h-12 border font-mono text-sm uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="flex justify-center pt-2">
              <div
                className="w-32 h-32 rounded-2xl border border-border flex items-center justify-center transition-colors duration-300"
                style={{ backgroundColor }}
              >
                <div
                  className="text-2xl font-bold transition-colors duration-300"
                  style={{ color: primaryColor }}
                >
                  {companyName.trim() || "Logo"}
                </div>
              </div>
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
              <h2 className="text-xl sm:text-2xl font-semibold">Size & Quality</h2>
              <p className="text-sm text-muted-foreground">
                Choose the output size and quality
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Image Size</label>
                <Select value={selectedSize} onValueChange={(value: "256x256" | "512x512" | "1024x1024") => setSelectedSize(value)}>
                  <SelectTrigger className="h-12 border">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.name}
                      </SelectItem>
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
              <h2 className="text-xl sm:text-2xl font-semibold">Additional Details</h2>
              <p className="text-sm text-muted-foreground">
                Tell us more about your brand (optional)
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Describe your brand personality, target audience, or any specific preferences..."
                className="flex-1 min-h-[140px] sm:min-h-[180px] text-sm border p-4 resize-none"
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
                  {progress < 30 ? "Designing your logos..." : progress < 70 ? "Crafting unique variations..." : progress < 100 ? "Almost there..." : "Done!"}
                </p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </motion.div>
          );
        }

        const successfulLogos = generatedLogos.filter((l) => l.success && l.url);
        return (
          <motion.div
            key="step-6-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5 flex-1 flex flex-col"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Choose Your Logo</h2>
              <p className="text-sm text-muted-foreground">
                Click a logo to select it, then edit or download
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              {successfulLogos.map((logo, index) => {
                const realIndex = generatedLogos.indexOf(logo);
                return (
                  <motion.button
                    key={realIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    onClick={() => handleSelectLogo(logo, realIndex)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative aspect-square rounded-xl border overflow-hidden transition-all group ${
                      selectedLogoIndex === realIndex
                        ? "border-foreground ring-2 ring-foreground/20 shadow-lg"
                        : "border-border hover:border-foreground/40 cursor-pointer"
                    }`}
                  >
                    <img
                      src={logo.url}
                      alt={`${logo.style} logo`}
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-2 py-1">
                      <span className="text-white text-[10px] sm:text-xs font-medium">{logo.style}</span>
                    </div>
                    {selectedLogoIndex === realIndex && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-background" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleEditLogo}
                disabled={selectedLogoIndex === null}
                size="lg"
                className="flex-1 gap-2 bg-foreground text-background hover:bg-foreground/90"
              >
                <Pencil className="w-4 h-4" />
                Edit in Studio
              </Button>
              <Button
                onClick={handleDownload}
                disabled={selectedLogoIndex === null || isDownloading}
                variant="outline"
                size="lg"
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "Downloading..." : "Download"}
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
            </div>

            {selectedLogoIndex === null && (
              <p className="text-center text-xs text-muted-foreground">
                Select a logo above to enable Edit and Download
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Generate Logo</h1>
        <p className="text-muted-foreground mt-1">
          Create unique professional logo variations with AI
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
                    Generate Logos
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
