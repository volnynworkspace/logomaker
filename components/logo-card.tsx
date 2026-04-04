import { useState } from "react";

import { SelectLogo } from "@/db/schema";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import DownloadFormatButton from "@/components/download-format-button";
import type { DownloadFormat } from "@/app/actions/actions";

interface LogoCardProps {
  logo: SelectLogo;
  onDownload: (imageUrl: string, format: DownloadFormat) => void;
}

const LogoCard = ({ logo, onDownload }: LogoCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card className="group">
      <CardContent className="w-full p-0">
        <div className="w-full rounded-t-md overflow-hidden aspect-square relative bg-muted/30">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          <img
            src={logo.image_url}
            alt={`${logo.username}'s logo`}
            className={`w-full h-full object-contain group-hover:scale-105 transition-all duration-700 ease-in-out
              ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div
          className={`border-t p-2 transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="text-xs font-medium truncate">{logo.username}</h3>
            <span className="text-[10px] text-muted-foreground">
              {new Date(logo.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-1 mb-1.5">
            <div
              className="w-3 h-3 border rounded"
              style={{ backgroundColor: logo.primary_color }}
              title="Primary Color"
            />
            <div
              className="w-3 h-3 border rounded"
              style={{ backgroundColor: logo.background_color }}
              title="Background Color"
            />
          </div>
          <DownloadFormatButton
            size="sm"
            className="w-full"
            onDownload={(fmt) => onDownload(logo.image_url, fmt)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoCard;
