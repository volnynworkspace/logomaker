"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown } from "lucide-react";
import type { DownloadFormat } from "@/app/actions/actions";

const FORMAT_OPTIONS: { id: DownloadFormat; label: string; desc: string }[] = [
  { id: "png", label: "PNG", desc: "Lossless, transparent" },
  { id: "jpg", label: "JPG", desc: "Smaller file size" },
  { id: "webp", label: "WebP", desc: "Modern, optimized" },
  { id: "pdf", label: "PDF", desc: "Print-ready document" },
];

interface DownloadFormatButtonProps {
  onDownload: (format: DownloadFormat) => void | Promise<void>;
  isDownloading?: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export default function DownloadFormatButton({
  onDownload,
  isDownloading = false,
  disabled = false,
  size = "default",
  className = "",
}: DownloadFormatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (format: DownloadFormat) => {
    setIsOpen(false);
    onDownload(format);
  };

  const isCompact = size === "sm";

  return (
    <div ref={dropdownRef} className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isDownloading}
        className={`w-full inline-flex items-center justify-center gap-1.5 font-medium rounded-md border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 ${
          isCompact
            ? "h-7 px-2 text-[10px]"
            : "h-10 px-4 text-sm"
        }`}
      >
        <Download className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
        {isDownloading ? "Downloading..." : "Download"}
        <ChevronDown className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} ml-auto opacity-60`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden ${
          isCompact ? "left-0 min-w-[140px]" : "left-0 right-0 min-w-[180px]"
        }`}>
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleSelect(fmt.id)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-3"
            >
              <span className="text-sm font-medium">{fmt.label}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{fmt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
