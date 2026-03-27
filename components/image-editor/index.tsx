"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  MousePointer2,
  Type,
  Square,
  Circle as CircleIcon,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Save,
  Wand2,
  ImageOff,
  ArrowLeft,
  Loader2,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  ChevronUp,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  ScanText,
  Shapes,
  Triangle,
  Star,
  Diamond,
  Minus,
  Pentagon,
  Hexagon,
} from "lucide-react";
import { saveEditedLogo, reEditWithAI, downloadImage } from "@/app/actions/actions";
import { sanitizeSvgForFabric } from "@/lib/svg-sanitizer";

const CANVAS_SIZE = 520;

const FONT_OPTIONS = [
  // Sans-Serif
  { name: "Arial", category: "Sans-Serif" },
  { name: "Poppins", category: "Sans-Serif" },
  { name: "Inter", category: "Sans-Serif" },
  { name: "Montserrat", category: "Sans-Serif" },
  { name: "Raleway", category: "Sans-Serif" },
  { name: "Open Sans", category: "Sans-Serif" },
  { name: "Lato", category: "Sans-Serif" },
  { name: "Nunito", category: "Sans-Serif" },
  { name: "Rubik", category: "Sans-Serif" },
  { name: "Work Sans", category: "Sans-Serif" },
  { name: "DM Sans", category: "Sans-Serif" },
  { name: "Space Grotesk", category: "Sans-Serif" },
  { name: "Outfit", category: "Sans-Serif" },
  { name: "Manrope", category: "Sans-Serif" },
  { name: "Plus Jakarta Sans", category: "Sans-Serif" },
  // Serif
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "Libre Baskerville", category: "Serif" },
  { name: "Cormorant Garamond", category: "Serif" },
  { name: "Cinzel", category: "Serif" },
  { name: "EB Garamond", category: "Serif" },
  { name: "Bitter", category: "Serif" },
  // Display
  { name: "Oswald", category: "Display" },
  { name: "Bebas Neue", category: "Display" },
  { name: "Anton", category: "Display" },
  { name: "Righteous", category: "Display" },
  { name: "Archivo Black", category: "Display" },
  { name: "Fredoka", category: "Display" },
  // Script / Handwriting
  { name: "Dancing Script", category: "Script" },
  { name: "Pacifico", category: "Script" },
  { name: "Caveat", category: "Script" },
  { name: "Great Vibes", category: "Script" },
  { name: "Sacramento", category: "Script" },
  { name: "Satisfy", category: "Script" },
  // Monospace
  { name: "Roboto Mono", category: "Monospace" },
  { name: "JetBrains Mono", category: "Monospace" },
  { name: "Space Mono", category: "Monospace" },
  { name: "Fira Code", category: "Monospace" },
];

type Tool = "select" | "text" | "shapes";

// Processed component returned by /api/process-components
export interface ProcessedComponent {
  label: string;
  type: string;
  text?: string;
  role?: string;
  bbox: { x: number; y: number; w: number; h: number };
  color?: string;
  croppedImage: string; // base64 data URL of cropped, bg-removed PNG
  fontInfo?: {
    text: string;
    fontStyle: string;
    googleFont: string;
    color: string;
    isBold: boolean;
    isItalic: boolean;
  };
  svgPath?: string;     // SVG path d="" data for icons
  svgViewBox?: string;  // viewBox for proper scaling
}

export interface EditorData {
  imageUrl: string;
  companyName: string;
  primaryColor: string;
  backgroundColor: string;
  style: string;
  model: "black-forest-labs/flux-schnell" | "black-forest-labs/flux-dev";
  size: "256x256" | "512x512" | "1024x1024";
  quality: "standard" | "hd";
  blueprint?: {
    width: number;
    height: number;
    backgroundColor: string;
    components: Array<{
      type: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      text?: string;
      fontFamily?: string;
      fontWeight?: string;
      fontStyle?: string;
      fontSize?: number;
      svgPath?: string;
      svgViewBox?: string;
      svgContent?: string;
      svgPaths?: Array<{ path: string; fill: string; viewBox: string }>;
      iconDescription?: string;
      iconBase64?: string; // Raster fallback when SVG vectorization fails
    }>;
  };
}

function ToolBtn({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {icon}
    </button>
  );
}

export default function ImageEditor({ data, processedComponents, isSegmenting }: { data: EditorData; processedComponents?: ProcessedComponent[]; isSegmenting?: boolean }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const fabricLibRef = useRef<any>(null); // Stores the imported fabric module

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [selectedObjType, setSelectedObjType] = useState<string>("");

  // Styling state
  const [bgColor, setBgColor] = useState(data.backgroundColor || "#ffffff");
  const [bgRemoved, setBgRemoved] = useState(false);
  const [shapeColor, setShapeColor] = useState("#2563EB");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [objOpacity, setObjOpacity] = useState(100);

  // Image filter state
  const [imgBrightness, setImgBrightness] = useState(0);
  const [imgContrast, setImgContrast] = useState(0);
  const [imgSaturation, setImgSaturation] = useState(0);

  // UI state
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showProps, setShowProps] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // AI Breakdown layers — populated after segmentation
  const [componentLayers, setComponentLayers] = useState<Array<{
    id: string;
    label: string;
    type: string;
    thumbnail: string;
    fabricObj: any;
  }>>([]);

  // History
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isHistoryActionRef = useRef(false);

  const { toast } = useToast();

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const saveToHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isHistoryActionRef.current) return;
    const json = JSON.stringify(canvas.toJSON(["selectable", "evented"]));
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    updateHistoryState();
  }, [updateHistoryState]);

  // ─── Load image onto canvas ───────────────────────────────────────────────
  const loadImageOntoCanvas = useCallback(
    async (src: string, removeExistingImages = false) => {
      const { fabric } = await import("fabric");
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Download as base64 first to avoid CORS issues
      let imageSrc = src;
      if (!src.startsWith("data:")) {
        try {
          const result = await downloadImage(src);
          if (result.success && result.data) imageSrc = result.data;
        } catch (_) {
          // fallback to original URL
        }
      }

      if (removeExistingImages) {
        const imgs = canvas.getObjects("image");
        imgs.forEach((img: any) => canvas.remove(img));
      }

      (fabric as any).Image.fromURL(imageSrc, (img: any) => {
        const scale = Math.min(
          (CANVAS_SIZE * 0.9) / img.width,
          (CANVAS_SIZE * 0.9) / img.height
        );
        img.set({
          left: (CANVAS_SIZE - img.width * scale) / 2,
          top: (CANVAS_SIZE - img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockUniScaling: false,
          lockMovementX: false,
          lockMovementY: false,
          borderColor: "#6366f1",
          cornerColor: "#6366f1",
          cornerSize: 8,
          transparentCorners: false,
          hoverCursor: "grab",
          moveCursor: "grabbing",
        });
        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
        setIsLoadingImage(false);
        saveToHistory();
      });
    },
    [saveToHistory]
  );

  // ─── Helper: dynamically load a Google Font ──────────────────────────────
  const loadGoogleFont = useCallback(async (fontFamily: string): Promise<void> => {
    const id = `gf-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) {
      // Font link already injected — wait for fonts to be ready
      await document.fonts.ready;
      return;
    }
    return new Promise<void>((resolve) => {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
      link.onload = () => document.fonts.ready.then(() => resolve());
      link.onerror = () => resolve(); // Don't block on failure
      document.head.appendChild(link);
    });
  }, []);

  // ─── Helper: extract dominant foreground color from transparent canvas ───
  const extractDominantColor = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number): string => {
    const data = ctx.getImageData(0, 0, w, h).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 64) { // Non-transparent pixel
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
        count++;
      }
    }
    if (count === 0) return '#000000';
    const r = Math.round(rSum / count).toString(16).padStart(2, '0');
    const g = Math.round(gSum / count).toString(16).padStart(2, '0');
    const b = Math.round(bSum / count).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }, []);

  // ─── Load pre-processed components as individual Fabric.js layers ───────────
  // Components arrive from the server already cropped, bg-removed, and alpha-snapped.
  // This function just positions them on the canvas and handles text→IText conversion.
  const loadProcessedComponentsOnCanvas = useCallback(
    async (src: string, components: ProcessedComponent[]) => {
      const { fabric } = await import("fabric");
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Clear existing objects (e.g. the full AI image loaded during background segmentation)
      canvas.clear();
      canvas.setBackgroundColor(bgColor, () => {});
      setComponentLayers([]);
      setSelectedObj(null);

      // Download full image to detect background color and dimensions
      let imageSrc = src;
      if (!src.startsWith("data:")) {
        try {
          const result = await downloadImage(src);
          if (result.success && result.data) imageSrc = result.data;
        } catch (_) { /* fallback */ }
      }

      const htmlImg = new Image();
      await new Promise<void>((resolve, reject) => {
        htmlImg.onload = () => resolve();
        htmlImg.onerror = reject;
        htmlImg.src = imageSrc;
      });

      const imgW = htmlImg.naturalWidth || htmlImg.width;
      const imgH = htmlImg.naturalHeight || htmlImg.height;

      // ── Detect background color — use blueprint value if available, else sample corners ──
      if (data.blueprint?.backgroundColor) {
        setBgColor(data.blueprint.backgroundColor);
      } else {
        const tmpCvs = document.createElement("canvas");
        tmpCvs.width = imgW;
        tmpCvs.height = imgH;
        const tmpCtx = tmpCvs.getContext("2d", { willReadFrequently: true })!;
        tmpCtx.drawImage(htmlImg, 0, 0);

        const samplePx = (x: number, y: number) => {
          const p = tmpCtx.getImageData(x, y, 1, 1).data;
          return [p[0], p[1], p[2]] as [number, number, number];
        };
        const edgeSamples = [
          samplePx(2, 2), samplePx(imgW - 3, 2),
          samplePx(2, imgH - 3), samplePx(imgW - 3, imgH - 3),
        ];
        const bgR = Math.round(edgeSamples.reduce((s, c) => s + c[0], 0) / 4);
        const bgG = Math.round(edgeSamples.reduce((s, c) => s + c[1], 0) / 4);
        const bgB = Math.round(edgeSamples.reduce((s, c) => s + c[2], 0) / 4);
        const bgHex = `#${bgR.toString(16).padStart(2, "0")}${bgG.toString(16).padStart(2, "0")}${bgB.toString(16).padStart(2, "0")}`;
        setBgColor(bgHex);
      }

      // Scale to fit canvas
      const scale = Math.min(
        (CANVAS_SIZE * 0.9) / imgW,
        (CANVAS_SIZE * 0.9) / imgH
      );
      const offsetX = (CANVAS_SIZE - imgW * scale) / 2;
      const offsetY = (CANVAS_SIZE - imgH * scale) / 2;

      const commonProps = {
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockUniScaling: false,
        borderColor: "#6366f1",
        cornerColor: "#6366f1",
        cornerSize: 8,
        transparentCorners: false,
        hoverCursor: "grab" as const,
        moveCursor: "grabbing" as const,
      };

      let loadedCount = 0;
      const collectedLayers: Array<{ id: string; label: string; type: string; thumbnail: string; fabricObj: any }> = [];

      for (const comp of components) {
        // bbox is already in original image pixel space (from server processing)
        const canvasLeft = offsetX + comp.bbox.x * scale;
        const canvasTop = offsetY + comp.bbox.y * scale;

        // ── TEXT COMPONENT: render as editable IText using server-provided fontInfo ──
        if (comp.type === 'text' && comp.fontInfo?.text) {
          let addedAsText = false;
          try {
            const fi = comp.fontInfo;
            await loadGoogleFont(fi.googleFont);

            const displayH = comp.bbox.h * scale;
            const fontSize = Math.max(10, Math.round(displayH * 0.8));

            // Use font detection color, fall back to segmentation color, then pixel extraction
            let fill = fi.color && fi.color !== '#000000' ? fi.color : (comp.color || '#000000');
            if (fill === '#000000' && comp.croppedImage) {
              try {
                const colorImg = new Image();
                await new Promise<void>((res) => { colorImg.onload = () => res(); colorImg.src = comp.croppedImage; });
                const colorCvs = document.createElement("canvas");
                colorCvs.width = colorImg.width; colorCvs.height = colorImg.height;
                const colorCtx = colorCvs.getContext("2d", { willReadFrequently: true })!;
                colorCtx.drawImage(colorImg, 0, 0);
                fill = extractDominantColor(colorCtx, colorImg.width, colorImg.height);
              } catch { /* keep existing fill */ }
            }

            // Calculate fontSize that fits the text within the bbox width
            // Start with height-based size, then adjust down if text overflows width
            const targetW = comp.bbox.w * scale;
            let finalFontSize = fontSize;

            const textObj = new (fabric as any).IText(fi.text, {
              left: canvasLeft,
              top: canvasTop,
              fontFamily: fi.googleFont,
              fontSize: finalFontSize,
              fill,
              fontWeight: fi.isBold ? 'bold' : 'normal',
              fontStyle: fi.isItalic ? 'italic' : 'normal',
              ...commonProps,
              scaleX: 1,
              scaleY: 1,
            });

            canvas.add(textObj);
            // If text is wider than bbox, reduce fontSize to fit (not scaleX)
            const actualW = textObj.width || 1;
            if (actualW > targetW && actualW > 0) {
              finalFontSize = Math.max(10, Math.round(finalFontSize * (targetW / actualW)));
              textObj.set('fontSize', finalFontSize);
            }

            textObj._componentLabel = comp.label;
            textObj._componentType = 'text';
            textObj._componentRole = comp.role || '';
            collectedLayers.push({
              id: `layer-${loadedCount}`,
              label: comp.role === 'tagline' ? `${comp.label} (tagline)` : comp.label,
              type: 'text',
              thumbnail: comp.croppedImage,
              fabricObj: textObj,
            });
            loadedCount++;
            addedAsText = true;
          } catch {
            // Font rendering failed — fall through to image loading below
          }

          if (addedAsText) continue;
        }

        // ── ICON / DECORATION: create Fabric.Path objects directly from SVG path data ──
        // This guarantees editable fill — each path is a native Fabric object.
        // NO rasterization, NO loadSVGFromString — manual path creation for full control.
        const svgContent: string | undefined = (comp as any).svgContent;
        const svgPaths: Array<{ path: string; fill: string; viewBox: string }> | undefined = (comp as any).svgPaths;
        if ((comp.type === 'icon' || comp.type === 'decoration') && (svgContent || comp.svgPath || svgPaths)) {
          let addedAsSvg = false;
          try {
            const targetW = comp.bbox.w * scale;
            const targetH = comp.bbox.h * scale;

            // Extract path data from SVG content or use pre-extracted svgPaths
            let pathEntries: Array<{ d: string; fill: string }> = [];
            let viewBox = '0 0 1024 1024';

            if (svgPaths && svgPaths.length > 0) {
              // Pre-extracted paths (best — already parsed server-side)
              pathEntries = svgPaths.map(p => ({ d: p.path, fill: p.fill || comp.color || '#000000' }));
              viewBox = svgPaths[0].viewBox || '0 0 1024 1024';
            } else if (svgContent) {
              // Parse SVG content to extract paths manually
              const sanitized = sanitizeSvgForFabric(svgContent);
              const vbMatch = sanitized.match(/viewBox="([^"]+)"/);
              viewBox = vbMatch ? vbMatch[1] : '0 0 1024 1024';

              // Extract all path d="" and fill="" attributes
              const pathRegex = /<path[^>]*>/gi;
              let match;
              while ((match = pathRegex.exec(sanitized)) !== null) {
                const tag = match[0];
                const dMatch = tag.match(/\bd="([^"]+)"/);
                const fillMatch = tag.match(/\bfill="([^"]+)"/);
                if (dMatch && dMatch[1].length > 5) {
                  const fill = fillMatch ? fillMatch[1] : (comp.color || '#000000');
                  // Skip paths that are just background fills
                  if (fill.toLowerCase() !== 'none') {
                    pathEntries.push({ d: dMatch[1], fill });
                  }
                }
              }
            } else if (comp.svgPath) {
              pathEntries = [{ d: comp.svgPath, fill: comp.color || '#000000' }];
              viewBox = comp.svgViewBox || '0 0 100 100';
            }

            if (pathEntries.length > 0) {
              // Parse viewBox to get coordinate space
              const vbParts = viewBox.split(/[\s,]+/).map(Number);
              const vbX = vbParts[0] || 0;
              const vbY = vbParts[1] || 0;
              const vbW = vbParts[2] || 1024;
              const vbH = vbParts[3] || 1024;

              // Create Fabric.Path for each SVG path
              const fabricPaths: any[] = [];
              for (const entry of pathEntries) {
                try {
                  const pathObj = new (fabric as any).Path(entry.d, {
                    fill: entry.fill,
                    stroke: '',
                    strokeWidth: 0,
                    selectable: false, // individual paths not selectable — group is
                    evented: false,
                  });
                  fabricPaths.push(pathObj);
                } catch (pathErr) {
                  console.warn(`[canvas] Skipping invalid path for "${comp.label}":`, pathErr);
                }
              }

              if (fabricPaths.length > 0) {
                // Group all paths into a single selectable object
                const group = new (fabric as any).Group(fabricPaths, {
                  left: canvasLeft,
                  top: canvasTop,
                  ...commonProps,
                });

                // Scale group to match target bbox dimensions
                const groupBounds = group.getBoundingRect();
                if (groupBounds.width > 0 && groupBounds.height > 0) {
                  group.set({
                    scaleX: targetW / groupBounds.width,
                    scaleY: targetH / groupBounds.height,
                  });
                }

                group._componentLabel = comp.label;
                group._componentType = comp.type;
                canvas.add(group);

                // Generate SVG thumbnail for layer panel
                const thumbSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${pathEntries.map(p => `<path d="${p.d}" fill="${p.fill}"/>`).join('')}</svg>`;
                const svgThumb = `data:image/svg+xml,${encodeURIComponent(thumbSvg)}`;

                collectedLayers.push({
                  id: `layer-${loadedCount}`,
                  label: comp.label,
                  type: comp.type,
                  thumbnail: svgThumb,
                  fabricObj: group,
                });
                loadedCount++;
                addedAsSvg = true;
                console.log(`[canvas] ${fabricPaths.length} SVG paths loaded for "${comp.label}" (type: group)`);
              }
            }
          } catch (err) {
            console.error(`[canvas] SVG path creation failed for "${comp.label}":`, err);
          }

          if (addedAsSvg) continue;
        }

        // ── FALLBACK: load as PNG image layer, or colored rect if no image ──
        if (comp.croppedImage) {
          await new Promise<void>((resolve) => {
            (fabric as any).Image.fromURL(comp.croppedImage, (imgObj: any) => {
              imgObj.set({
                left: canvasLeft,
                top: canvasTop,
                scaleX: scale,
                scaleY: scale,
                ...commonProps,
              });
              imgObj._componentLabel = comp.label;
              imgObj._componentType = comp.type;
              canvas.add(imgObj);
              collectedLayers.push({
                id: `layer-${loadedCount}`,
                label: comp.label,
                type: comp.type,
                thumbnail: comp.croppedImage,
                fabricObj: imgObj,
              });
              loadedCount++;
              resolve();
            });
          });
        } else {
          // Blueprint component without svgPath/fontInfo — render as colored rectangle
          const rectObj = new (fabric as any).Rect({
            left: canvasLeft,
            top: canvasTop,
            width: comp.bbox.w * scale,
            height: comp.bbox.h * scale,
            fill: comp.color || '#CCCCCC',
            rx: 4,
            ry: 4,
            ...commonProps,
          });
          rectObj._componentLabel = comp.label;
          rectObj._componentType = comp.type;
          canvas.add(rectObj);
          collectedLayers.push({
            id: `layer-${loadedCount}`,
            label: comp.label,
            type: comp.type,
            thumbnail: '',
            fabricObj: rectObj,
          });
          loadedCount++;
        }
      }

      // ── Fallback: if no components were loaded, load full image as single layer ──
      if (loadedCount === 0) {
        const logoScale = Math.min((CANVAS_SIZE * 0.9) / imgW, (CANVAS_SIZE * 0.9) / imgH);
        const logoLeft = (CANVAS_SIZE - imgW * logoScale) / 2;
        const logoTop = (CANVAS_SIZE - imgH * logoScale) / 2;

        await new Promise<void>((resolve) => {
          (fabric as any).Image.fromURL(imageSrc, (imgObj: any) => {
            imgObj.set({ left: logoLeft, top: logoTop, scaleX: logoScale, scaleY: logoScale, ...commonProps });
            imgObj._componentLabel = 'Logo';
            imgObj._componentType = 'icon';
            canvas.add(imgObj);
            collectedLayers.push({ id: 'layer-0', label: 'Logo', type: 'icon', thumbnail: imageSrc, fabricObj: imgObj });
            resolve();
          });
        });
      }

      // ── Post-placement layout engine: fix overlaps and align text under icon ──
      if (collectedLayers.length > 1) {
        // Priority: icon(4) > brand text(3) > tagline(2) > decoration(1)
        const getPriority = (layer: typeof collectedLayers[0]) => {
          if (layer.type === 'icon') return 4;
          if (layer.type === 'text' && layer.fabricObj?._componentRole === 'brand') return 3;
          if (layer.type === 'text') return 2;
          return 1;
        };

        // Sort by priority descending
        const sorted = [...collectedLayers].sort((a, b) => getPriority(b) - getPriority(a));

        // Resolve overlaps: higher-priority keeps position, lower gets pushed
        for (let i = 0; i < sorted.length; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            const aObj = sorted[i].fabricObj;
            const bObj = sorted[j].fabricObj;
            if (!aObj || !bObj) continue;

            const a = aObj.getBoundingRect(true);
            const b = bObj.getBoundingRect(true);

            // Check overlap
            const overlapX = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
            if (overlapX <= 0 || overlapY <= 0) continue;

            console.log(`[layout] Overlap detected: "${sorted[i].label}" vs "${sorted[j].label}" — pushing "${sorted[j].label}"`);

            // Push lower-priority object away
            if (overlapY <= overlapX) {
              // Vertical push
              const bCenter = b.top + b.height / 2;
              const aCenter = a.top + a.height / 2;
              if (bCenter <= aCenter) {
                // b above a — move b up
                bObj.set('top', bObj.top - overlapY);
              } else {
                // b below a — move b down
                bObj.set('top', bObj.top + overlapY);
              }
            } else {
              // Horizontal push
              const bCenter = b.left + b.width / 2;
              const aCenter = a.left + a.width / 2;
              if (bCenter <= aCenter) {
                bObj.set('left', bObj.left - overlapX);
              } else {
                bObj.set('left', bObj.left + overlapX);
              }
            }
            bObj.setCoords();
          }
        }

        // Ensure all objects stay within canvas bounds
        for (const layer of collectedLayers) {
          const obj = layer.fabricObj;
          if (!obj) continue;
          const bounds = obj.getBoundingRect(true);
          if (bounds.left < 0) { obj.set('left', obj.left - bounds.left + 2); obj.setCoords(); }
          if (bounds.top < 0) { obj.set('top', obj.top - bounds.top + 2); obj.setCoords(); }
          if (bounds.left + bounds.width > CANVAS_SIZE) {
            obj.set('left', obj.left - (bounds.left + bounds.width - CANVAS_SIZE) - 2);
            obj.setCoords();
          }
          if (bounds.top + bounds.height > CANVAS_SIZE) {
            obj.set('top', obj.top - (bounds.top + bounds.height - CANVAS_SIZE) - 2);
            obj.setCoords();
          }
        }
      }

      setComponentLayers(collectedLayers);
      canvas.renderAll();
      setIsLoadingImage(false);
      saveToHistory();
    },
    [saveToHistory, loadGoogleFont, extractDominantColor]
  );

  // ─── Debug: toggle bbox visualization overlay ─────────────────────────────
  const toggleDebugBboxes = useCallback(async (show: boolean) => {
    const { fabric } = await import("fabric");
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove existing debug rectangles
    const debugObjs = canvas.getObjects().filter((o: any) => o._isDebugBbox);
    debugObjs.forEach((o: any) => canvas.remove(o));

    if (!show) {
      canvas.requestRenderAll();
      return;
    }

    // Draw colored bboxes for each component layer
    const colorMap: Record<string, string> = {
      icon: 'rgba(34, 197, 94, 0.3)',       // green
      text: 'rgba(59, 130, 246, 0.3)',       // blue
      decoration: 'rgba(168, 85, 247, 0.3)', // purple
    };
    const strokeMap: Record<string, string> = {
      icon: '#22c55e',
      text: '#3b82f6',
      decoration: '#a855f7',
    };

    for (const layer of componentLayers) {
      const obj = layer.fabricObj;
      if (!obj) continue;
      const bounds = obj.getBoundingRect(true);

      const rect = new (fabric as any).Rect({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        fill: colorMap[layer.type] || 'rgba(255, 0, 0, 0.2)',
        stroke: strokeMap[layer.type] || '#ef4444',
        strokeWidth: 2,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      rect._isDebugBbox = true;

      // Add label
      const label = new (fabric as any).Text(
        `${layer.type.toUpperCase()}: ${layer.label}`,
        {
          left: bounds.left + 2,
          top: bounds.top - 14,
          fontSize: 11,
          fill: strokeMap[layer.type] || '#ef4444',
          fontFamily: 'monospace',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        }
      );
      label._isDebugBbox = true;

      canvas.add(rect);
      canvas.add(label);
    }

    // Check for overlaps and highlight them in red
    for (let i = 0; i < componentLayers.length; i++) {
      for (let j = i + 1; j < componentLayers.length; j++) {
        const a = componentLayers[i].fabricObj?.getBoundingRect(true);
        const b = componentLayers[j].fabricObj?.getBoundingRect(true);
        if (!a || !b) continue;

        const overlapX = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
        const overlapY = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
        if (overlapX > 2 && overlapY > 2) {
          const ox = Math.max(a.left, b.left);
          const oy = Math.max(a.top, b.top);
          const overlapRect = new (fabric as any).Rect({
            left: ox,
            top: oy,
            width: overlapX,
            height: overlapY,
            fill: 'rgba(239, 68, 68, 0.5)',
            stroke: '#ef4444',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            excludeFromExport: true,
          });
          overlapRect._isDebugBbox = true;
          canvas.add(overlapRect);
        }
      }
    }

    canvas.requestRenderAll();
  }, [componentLayers]);

  // Sync debug overlay when debugMode changes
  useEffect(() => {
    toggleDebugBboxes(debugMode);
  }, [debugMode, toggleDebugBboxes]);

  // ─── Initialize canvas ────────────────────────────────────────────────────
  useEffect(() => {
    let canvas: any;
    let mounted = true;

    const init = async () => {
      const { fabric } = await import("fabric");
      fabricLibRef.current = fabric; // Store for use in event handlers

      // Fix Fabric.js v5 bug: it sets ctx.textBaseline = 'alphabetical' (invalid).
      // Patch the CanvasRenderingContext2D setter to auto-correct the typo.
      if (!(CanvasRenderingContext2D.prototype as any)._textBaselinePatched) {
        const desc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'textBaseline');
        if (desc && desc.set) {
          const originalSet = desc.set;
          Object.defineProperty(CanvasRenderingContext2D.prototype, 'textBaseline', {
            ...desc,
            set(value: string) {
              originalSet.call(this, value === 'alphabetical' ? 'alphabetic' : value);
            },
          });
        }
        (CanvasRenderingContext2D.prototype as any)._textBaselinePatched = true;
      }

      if (!canvasElRef.current || !mounted) return;

      canvas = new (fabric as any).Canvas(canvasElRef.current, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: data.backgroundColor || "#ffffff",
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = canvas;

      // Events
      canvas.on("object:modified", saveToHistory);
      // Clamp objects so they can't be dragged fully off-canvas
      canvas.on("object:moving", (e: any) => {
        const obj = e.target;
        if (!obj) return;
        const bound = obj.getBoundingRect(true);
        const margin = 20; // allow partial off-canvas but not fully hidden
        if (bound.left + bound.width < margin) obj.left = margin - bound.width + (obj.left - bound.left);
        if (bound.top + bound.height < margin) obj.top = margin - bound.height + (obj.top - bound.top);
        if (bound.left > CANVAS_SIZE - margin) obj.left = CANVAS_SIZE - margin + (obj.left - bound.left);
        if (bound.top > CANVAS_SIZE - margin) obj.top = CANVAS_SIZE - margin + (obj.top - bound.top);
        obj.setCoords();
      });
      const syncSelection = (obj: any) => {
        if (!obj) return;
        setSelectedObj(obj);
        setSelectedObjType(obj.type ?? "");
        setObjOpacity(Math.round((obj.opacity ?? 1) * 100));
        if (obj.type === "i-text") {
          setTextColor(obj.fill || "#000000");
          setFontSize(obj.fontSize || 32);
          setFontFamily(obj.fontFamily || "Arial");
        } else if (obj.type === "rect" || obj.type === "circle" || obj.type === "triangle" || obj.type === "polygon" || obj.type === "line") {
          setShapeColor(typeof obj.fill === "string" ? obj.fill : "");
          setStrokeColor(obj.stroke || "#000000");
          setStrokeWidth(obj.strokeWidth ?? 2);
        } else if (obj.type === "image") {
          // Sync current filter values
          const filters: any[] = obj.filters || [];
          const bf = filters.find((f: any) => f.type === "Brightness");
          const cf = filters.find((f: any) => f.type === "Contrast");
          const sf = filters.find((f: any) => f.type === "Saturation");
          setImgBrightness(bf?.brightness ?? 0);
          setImgContrast(cf?.contrast ?? 0);
          setImgSaturation(sf?.saturation ?? 0);
        }
      };
      canvas.on("selection:created", (e: any) => syncSelection(e.selected?.[0]));
      canvas.on("selection:updated", (e: any) => syncSelection(e.selected?.[0]));
      canvas.on("selection:cleared", () => {
        setSelectedObj(null);
        setSelectedObjType("");
      });

      // Route through loadProcessedComponentsOnCanvas when processedComponents was passed
      // (even if empty — fallback inside guarantees a selectable layer always appears).
      // Only use loadImageOntoCanvas when the prop was never passed (undefined = no pipeline ran).
      if (mounted) {
        if (processedComponents !== undefined) {
          await loadProcessedComponentsOnCanvas(data.imageUrl, processedComponents);
        } else {
          await loadImageOntoCanvas(data.imageUrl);
        }
      }
    };

    init();
    return () => {
      mounted = false;
      canvas?.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When background segmentation completes, reload canvas with editable component layers
  const prevProcessedRef = useRef<ProcessedComponent[] | undefined>(undefined);
  useEffect(() => {
    const prev = prevProcessedRef.current;
    prevProcessedRef.current = processedComponents;

    // Only trigger when transitioning from undefined (no components) to a populated array
    if (prev === undefined && processedComponents && processedComponents.length > 0) {
      console.log('[ImageEditor] Background segmentation complete — reloading canvas with', processedComponents.length, 'editable components');
      loadProcessedComponentsOnCanvas(data.imageUrl, processedComponents);
    }
  }, [processedComponents, data.imageUrl, loadProcessedComponentsOnCanvas]);

  // Sync bg color — transparent when background is removed
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (bgRemoved) {
      canvas.setBackgroundColor("", () => canvas.renderAll());
    } else {
      canvas.setBackgroundColor(bgColor, () => canvas.renderAll());
    }
  }, [bgColor, bgRemoved]);

  // Sync active tool → canvas cursor/selection mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (activeTool === "select") {
      canvas.defaultCursor = "default";
      canvas.hoverCursor = "grab";
      canvas.isDrawingMode = false;
      canvas.selection = true;
      // Re-enable movement on all objects
      canvas.getObjects().forEach((obj: any) => {
        if (obj.selectable !== false) {
          obj.lockMovementX = false;
          obj.lockMovementY = false;
        }
      });
    } else {
      canvas.defaultCursor = "crosshair";
      canvas.hoverCursor = "crosshair";
      canvas.isDrawingMode = false;
      canvas.selection = false;
    }
    canvas.renderAll();
  }, [activeTool]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tool actions ─────────────────────────────────────────────────────────
  const addText = useCallback(async () => {
    const { fabric } = await import("fabric");
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (fontFamily !== "Arial") await loadGoogleFont(fontFamily);
    const text = new (fabric as any).IText("Edit me", {
      left: CANVAS_SIZE / 2 - 40,
      top: CANVAS_SIZE / 2 - 16,
      fontSize: 32,
      fill: textColor,
      fontFamily,
      lockMovementX: false,
      lockMovementY: false,
      hoverCursor: "grab",
      moveCursor: "grabbing",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setActiveTool("select");
    saveToHistory();
  }, [textColor, fontFamily, loadGoogleFont, saveToHistory]);

  const shapeDefaults = useCallback(() => ({
    fill: "transparent",
    stroke: strokeColor,
    strokeWidth,
    strokeUniform: true,
    lockMovementX: false,
    lockMovementY: false,
    hoverCursor: "grab",
    moveCursor: "grabbing",
  }), [strokeColor, strokeWidth]);

  const addShapeToCanvas = useCallback((obj: any) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setActiveTool("select");
    saveToHistory();
  }, [saveToHistory]);

  const addRect = useCallback(async () => {
    const { fabric } = await import("fabric");
    const rect = new (fabric as any).Rect({
      left: CANVAS_SIZE / 2 - 60, top: CANVAS_SIZE / 2 - 40,
      width: 120, height: 80, rx: 4, ry: 4,
      ...shapeDefaults(),
    });
    addShapeToCanvas(rect);
  }, [shapeDefaults, addShapeToCanvas]);

  const addCircle = useCallback(async () => {
    const { fabric } = await import("fabric");
    const circle = new (fabric as any).Circle({
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 50,
      radius: 50,
      ...shapeDefaults(),
    });
    addShapeToCanvas(circle);
  }, [shapeDefaults, addShapeToCanvas]);

  const addTriangle = useCallback(async () => {
    const { fabric } = await import("fabric");
    const tri = new (fabric as any).Triangle({
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 50,
      width: 100, height: 90,
      ...shapeDefaults(),
    });
    addShapeToCanvas(tri);
  }, [shapeDefaults, addShapeToCanvas]);

  const addStar = useCallback(async () => {
    const { fabric } = await import("fabric");
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 50 : 22;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push({ x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) });
    }
    const star = new (fabric as any).Polygon(pts, {
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 50,
      ...shapeDefaults(),
    });
    addShapeToCanvas(star);
  }, [shapeDefaults, addShapeToCanvas]);

  const addDiamond = useCallback(async () => {
    const { fabric } = await import("fabric");
    const pts = [
      { x: 50, y: 0 }, { x: 100, y: 60 },
      { x: 50, y: 120 }, { x: 0, y: 60 },
    ];
    const diamond = new (fabric as any).Polygon(pts, {
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 60,
      ...shapeDefaults(),
    });
    addShapeToCanvas(diamond);
  }, [shapeDefaults, addShapeToCanvas]);

  const addLine = useCallback(async () => {
    const { fabric } = await import("fabric");
    const line = new (fabric as any).Line(
      [CANVAS_SIZE / 2 - 80, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 80, CANVAS_SIZE / 2],
      { stroke: strokeColor, strokeWidth: Math.max(strokeWidth, 2), selectable: true, hasControls: true, hoverCursor: "grab", moveCursor: "grabbing" }
    );
    addShapeToCanvas(line);
  }, [strokeColor, strokeWidth, addShapeToCanvas]);

  const addPentagon = useCallback(async () => {
    const { fabric } = await import("fabric");
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (2 * Math.PI / 5) * i - Math.PI / 2;
      pts.push({ x: 50 + 50 * Math.cos(a), y: 50 + 50 * Math.sin(a) });
    }
    const pent = new (fabric as any).Polygon(pts, {
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 50,
      ...shapeDefaults(),
    });
    addShapeToCanvas(pent);
  }, [shapeDefaults, addShapeToCanvas]);

  const addHexagon = useCallback(async () => {
    const { fabric } = await import("fabric");
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push({ x: 50 + 50 * Math.cos(a), y: 50 + 50 * Math.sin(a) });
    }
    const hex = new (fabric as any).Polygon(pts, {
      left: CANVAS_SIZE / 2 - 50, top: CANVAS_SIZE / 2 - 50,
      ...shapeDefaults(),
    });
    addShapeToCanvas(hex);
  }, [shapeDefaults, addShapeToCanvas]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o: any) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
    saveToHistory();
  }, [saveToHistory]);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current--;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
      isHistoryActionRef.current = false;
      updateHistoryState();
    });
  }, [updateHistoryState]);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current++;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
      isHistoryActionRef.current = false;
      updateHistoryState();
    });
  }, [updateHistoryState]);

  // ─── OCR: Extract text from image as editable layers ────────────────────
  const makeTextEditable = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    setIsExtractingText(true);
    toast({
      title: "Analyzing image…",
      description: "Detecting text — this may take a few seconds on first run.",
    });

    try {
      // Export current canvas at 1× for OCR (coordinates map directly to canvas space)
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });

      // Lazy-load Tesseract so it doesn't bloat the initial bundle
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: () => {} });
      const result = await worker.recognize(dataUrl);
      const words = (result.data as any).words as any[];
      await worker.terminate();

      if (!words || words.length === 0) {
        toast({
          title: "No text detected",
          description: "Could not find readable text. Try the Text tool to add manually.",
          variant: "destructive",
        });
        return;
      }

      // Build a temp canvas to sample pixel colors for background covers
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = CANVAS_SIZE;
      tmpCanvas.height = CANVAS_SIZE;
      const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true })!;
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dataUrl;
      });
      tmpCtx.drawImage(img, 0, 0);

      const { fabric } = await import("fabric");
      let extracted = 0;

      for (const word of words) {
        if (word.confidence < 45 || !word.text.trim()) continue;

        const { x0, y0, x1, y1 } = word.bbox;
        const bw = x1 - x0;
        const bh = y1 - y0;
        if (bw < 4 || bh < 4) continue;

        // ── Sample background color from just outside the left/right edges ──
        const sLeft = tmpCtx.getImageData(Math.max(0, x0 - 6), Math.round(y0 + bh / 2), 1, 1).data;
        const sRight = tmpCtx.getImageData(Math.min(CANVAS_SIZE - 1, x1 + 6), Math.round(y0 + bh / 2), 1, 1).data;
        const bgR = Math.round((sLeft[0] + sRight[0]) / 2);
        const bgG = Math.round((sLeft[1] + sRight[1]) / 2);
        const bgB = Math.round((sLeft[2] + sRight[2]) / 2);
        const coverColor = `rgb(${bgR},${bgG},${bgB})`;

        // ── Sample text color from center of bbox ──
        const cPx = tmpCtx.getImageData(Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), 1, 1).data;
        const textColor = `rgb(${cPx[0]},${cPx[1]},${cPx[2]})`;

        // Cover the original text with a filled rectangle
        const cover = new (fabric as any).Rect({
          left: x0 - 2,
          top: y0 - 1,
          width: bw + 4,
          height: bh + 2,
          fill: coverColor,
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });

        // Create an editable text object at the same position
        const fontSize = Math.max(10, Math.round(bh * 0.8));
        const itext = new (fabric as any).IText(word.text.trim(), {
          left: x0,
          top: y0,
          fontSize,
          fontFamily: "Arial, sans-serif",
          fill: textColor,
          editable: true,
          hasControls: true,
          hasBorders: true,
          borderColor: "#6366f1",
          cornerColor: "#6366f1",
          cornerSize: 6,
          transparentCorners: false,
          lockMovementX: false,
          lockMovementY: false,
          hoverCursor: "grab",
          moveCursor: "grabbing",
        });

        canvas.add(cover);
        canvas.add(itext);
        extracted++;
      }

      if (extracted > 0) {
        canvas.renderAll();
        saveToHistory();
        toast({
          title: `${extracted} text element${extracted > 1 ? "s" : ""} extracted!`,
          description: "Double-click any text on the canvas to edit it directly.",
        });
      } else {
        toast({
          title: "No readable text found",
          description: "Try the Text tool to add text manually.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Text extraction failed",
        description: "Please try again or add text manually.",
        variant: "destructive",
      });
    } finally {
      setIsExtractingText(false);
    }
  }, [saveToHistory, toast]);

  const removeBackground = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsRemovingBg(true);
    try {
      const images = canvas.getObjects("image");
      if (!images.length) {
        toast({ title: "No image on canvas", variant: "destructive" });
        return;
      }
      const imgObj = images[0];
      const el = imgObj.getElement() as HTMLImageElement;

      const tmp = document.createElement("canvas");
      tmp.width = el.naturalWidth || el.width;
      tmp.height = el.naturalHeight || el.height;
      const ctx = tmp.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(el, 0, 0);

      const imgData = ctx.getImageData(0, 0, tmp.width, tmp.height);
      const d = imgData.data;

      // Sample 4 corners for background color
      const corners = [
        { r: d[0], g: d[1], b: d[2] },
        { r: d[(tmp.width - 1) * 4], g: d[(tmp.width - 1) * 4 + 1], b: d[(tmp.width - 1) * 4 + 2] },
        { r: d[(tmp.height - 1) * tmp.width * 4], g: d[(tmp.height - 1) * tmp.width * 4 + 1], b: d[(tmp.height - 1) * tmp.width * 4 + 2] },
        { r: d[(tmp.height * tmp.width - 1) * 4], g: d[(tmp.height * tmp.width - 1) * 4 + 1], b: d[(tmp.height * tmp.width - 1) * 4 + 2] },
      ];
      const bgR = corners.reduce((a, c) => a + c.r, 0) / 4;
      const bgG = corners.reduce((a, c) => a + c.g, 0) / 4;
      const bgB = corners.reduce((a, c) => a + c.b, 0) / 4;

      const tolerance = 45;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.sqrt(
          Math.pow(d[i] - bgR, 2) +
            Math.pow(d[i + 1] - bgG, 2) +
            Math.pow(d[i + 2] - bgB, 2)
        );
        if (dist < tolerance) d[i + 3] = 0;
      }
      ctx.putImageData(imgData, 0, 0);

      const { fabric } = await import("fabric");
      const newDataUrl = tmp.toDataURL("image/png");

      (fabric as any).Image.fromURL(newDataUrl, (newImg: any) => {
        newImg.set({
          left: imgObj.left,
          top: imgObj.top,
          scaleX: imgObj.scaleX,
          scaleY: imgObj.scaleY,
          angle: imgObj.angle ?? 0,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          borderColor: "#6366f1",
          cornerColor: "#6366f1",
          cornerSize: 8,
          transparentCorners: false,
          hoverCursor: "grab",
          moveCursor: "grabbing",
        });
        canvas.remove(imgObj);
        canvas.add(newImg);
        canvas.sendToBack(newImg);
        // Clear canvas background for true transparency
        setBgRemoved(true);
        canvas.setBackgroundColor("", () => canvas.renderAll());
        saveToHistory();
        toast({ title: "Background removed!", description: "Logo is now fully transparent." });
      });
    } catch {
      toast({
        title: "Failed to remove background",
        description: "Could not process the image.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingBg(false);
    }
  }, [saveToHistory, toast]);

  const updateSelectedProp = useCallback(
    (prop: string, value: any) => {
      const canvas = fabricRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj) return;
      obj.set(prop as any, value);
      canvas.renderAll();
      saveToHistory();
    },
    [saveToHistory]
  );

  // ─── Image-specific: filters, flip, reset ────────────────────────────────
  const applyImageFilter = useCallback(
    async (filterName: string, value: number) => {
      const { fabric } = await import("fabric");
      const canvas = fabricRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj || obj.type !== "image") return;

      if (!obj.filters) obj.filters = [];

      // Remove existing filter of this type, then push updated one
      obj.filters = obj.filters.filter((f: any) => f.type !== filterName);
      if (value !== 0) {
        const FilterClass = (fabric as any).Image.filters[filterName];
        if (FilterClass) {
          obj.filters.push(new FilterClass({ [filterName.toLowerCase()]: value }));
        }
      }
      obj.applyFilters();
      canvas.renderAll();
    },
    []
  );

  const applyPresetFilter = useCallback(
    async (preset: "grayscale" | "sepia" | "invert" | "reset") => {
      const { fabric } = await import("fabric");
      const canvas = fabricRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj || obj.type !== "image") return;

      // Reset sliders
      setImgBrightness(0);
      setImgContrast(0);
      setImgSaturation(0);

      if (preset === "reset") {
        obj.filters = [];
      } else if (preset === "grayscale") {
        obj.filters = [new (fabric as any).Image.filters.Grayscale()];
      } else if (preset === "sepia") {
        obj.filters = [new (fabric as any).Image.filters.Sepia()];
      } else if (preset === "invert") {
        obj.filters = [new (fabric as any).Image.filters.Invert()];
      }

      obj.applyFilters();
      canvas.renderAll();
      saveToHistory();
    },
    [saveToHistory]
  );

  const flipImage = useCallback(
    (axis: "X" | "Y") => {
      const canvas = fabricRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj || obj.type !== "image") return;
      if (axis === "X") obj.set("flipX", !obj.flipX);
      else obj.set("flipY", !obj.flipY);
      canvas.renderAll();
      saveToHistory();
    },
    [saveToHistory]
  );

  // ─── Export ───────────────────────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Temporarily ensure canvas bg is cleared when bgRemoved, then restore
    const prevBg = canvas.backgroundColor;
    if (bgRemoved) canvas.backgroundColor = "";
    const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    canvas.backgroundColor = prevBg;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.companyName || "logo"}-edited.png`;
    a.click();
    toast({ title: "PNG downloaded!" });
  }, [data.companyName, bgRemoved, toast]);

  const exportSVG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const prevBg = canvas.backgroundColor;
    if (bgRemoved) canvas.backgroundColor = "";
    const svg = canvas.toSVG();
    canvas.backgroundColor = prevBg;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.companyName || "logo"}-edited.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "SVG downloaded!" });
  }, [data.companyName, bgRemoved, toast]);

  // ─── Save to MongoDB ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      // Ensure transparent bg is preserved during export
      const prevBg = canvas.backgroundColor;
      if (bgRemoved) canvas.backgroundColor = "";
      const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 });
      canvas.backgroundColor = prevBg;
      const result = await saveEditedLogo({
        imageDataUrl: dataUrl,
        primaryColor: data.primaryColor,
        backgroundColor: bgRemoved ? "transparent" : bgColor,
      });
      if (result.success) {
        toast({ title: "Saved!", description: "Edited logo saved to My Designs." });
        window.dispatchEvent(new CustomEvent("refreshCredits"));
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [bgColor, bgRemoved, data.primaryColor, toast]);

  // ─── Helper: detect if prompt is a color-only request ────────────────────
  const parseColorRequest = useCallback((prompt: string): string | null => {
    const p = prompt.toLowerCase().trim();
    // Match patterns like: "make it red", "change color to blue", "color: #FF0000", "red color", "#2563EB"
    const hexMatch = p.match(/#([0-9a-f]{3,8})\b/i);
    if (hexMatch) return `#${hexMatch[1].length === 3 ? hexMatch[1].split('').map(c => c + c).join('') : hexMatch[1]}`;

    const colorKeywords: Record<string, string> = {
      'red': '#EF4444', 'blue': '#3B82F6', 'green': '#22C55E', 'yellow': '#EAB308',
      'orange': '#F97316', 'purple': '#A855F7', 'pink': '#EC4899', 'black': '#000000',
      'white': '#FFFFFF', 'gold': '#D4AF37', 'silver': '#C0C0C0', 'navy': '#1E3A5F',
      'teal': '#14B8A6', 'indigo': '#6366F1', 'cyan': '#06B6D4', 'magenta': '#D946EF',
      'brown': '#92400E', 'maroon': '#7F1D1D', 'olive': '#65A30D', 'coral': '#F87171',
    };

    // Only treat as color request if prompt is short and contains color keywords
    const isColorRequest = /\b(make\s*it|change\s*(color\s*)?to|color[:\s]|in\s+|set\s*(to)?)\b/i.test(p) || p.split(/\s+/).length <= 2;
    if (!isColorRequest) return null;

    for (const [name, hex] of Object.entries(colorKeywords)) {
      if (p.includes(name)) return hex;
    }
    return null;
  }, []);

  // ─── Helper: replace icon on canvas ────────────────────────────────────────
  const replaceIconOnCanvas = useCallback(async (
    oldObj: any,
    svgPaths: Array<{ path: string; fill: string; viewBox: string }>,
    fillColor?: string,
  ) => {
    const canvas = fabricRef.current;
    const { fabric } = await import("fabric");
    if (!canvas) throw new Error('Canvas not available');

    const oldLeft = oldObj.left;
    const oldTop = oldObj.top;
    const oldLabel = oldObj._componentLabel;
    const oldType = oldObj._componentType;
    const oldBounds = oldObj.getBoundingRect();

    const newPaths: any[] = [];
    for (const entry of svgPaths) {
      try {
        newPaths.push(new (fabric as any).Path(entry.path, {
          fill: fillColor || entry.fill || '#000000',
          stroke: '',
          strokeWidth: 0,
          selectable: false,
          evented: false,
        }));
      } catch { /* skip */ }
    }
    if (newPaths.length === 0) throw new Error('No valid SVG paths');

    const newGroup = new (fabric as any).Group(newPaths, {
      left: oldLeft,
      top: oldTop,
      selectable: true, hasControls: true, hasBorders: true,
      lockMovementX: false, lockMovementY: false, lockUniScaling: false,
      borderColor: "#6366f1", cornerColor: "#6366f1", cornerSize: 8,
      transparentCorners: false, hoverCursor: "grab", moveCursor: "grabbing",
    });

    const newBounds = newGroup.getBoundingRect();
    if (newBounds.width > 0 && newBounds.height > 0) {
      newGroup.set({
        scaleX: oldBounds.width / newBounds.width,
        scaleY: oldBounds.height / newBounds.height,
      });
    }

    newGroup._componentLabel = oldLabel;
    newGroup._componentType = oldType;

    canvas.remove(oldObj);
    canvas.add(newGroup);
    canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();

    // Update layers
    const thumbSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${svgPaths[0].viewBox}">${svgPaths.map(p => `<path d="${p.path}" fill="${fillColor || p.fill}"/>`).join('')}</svg>`;
    setComponentLayers(prev => prev.map(layer =>
      layer.fabricObj === oldObj
        ? { ...layer, fabricObj: newGroup, thumbnail: `data:image/svg+xml,${encodeURIComponent(thumbSvg)}` }
        : layer
    ));

    setSelectedObj(newGroup);
    setSelectedObjType(newGroup.type ?? '');
    return newGroup;
  }, []);

  // ─── AI Re-edit ───────────────────────────────────────────────────────────
  // Smart routing:
  //   1. Icon selected + color request → instant color change (no API call)
  //   2. Icon selected + description → regenerate icon via Recraft
  //   3. Text selected → update text content/color/font via AI interpretation
  //   4. Nothing selected → full logo regeneration
  const handleAiReEdit = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Enter a prompt first", variant: "destructive" });
      return;
    }

    const isIconSelected = selectedObj && (
      selectedObj._componentType === 'icon' ||
      selectedObj._componentType === 'decoration'
    );
    const isTextSelected = selectedObj && selectedObj._componentType === 'text';

    setIsAiLoading(true);
    try {
      // ── CASE 1: Icon selected ──
      if (isIconSelected) {
        const requestedColor = parseColorRequest(aiPrompt);

        if (requestedColor) {
          // ── 1a: Color-only change — instant, no API call ──
          const canvas = fabricRef.current;
          if (!canvas) throw new Error('Canvas not available');

          if (selectedObj.type === 'path') {
            selectedObj.set('fill', requestedColor);
            selectedObj.dirty = true;
          } else if (selectedObj.type === 'group' && selectedObj._objects) {
            for (const child of selectedObj._objects) {
              if (child.type === 'path' && child.fill !== 'none') {
                child.set('fill', requestedColor);
                child.dirty = true;
              }
            }
            selectedObj.dirty = true;
          }
          canvas.requestRenderAll();
          saveToHistory();
          toast({ title: "Color updated!", description: `Icon color changed to ${requestedColor}` });
          setAiPrompt("");
        } else {
          // Icon regeneration not available — only color changes are supported
          toast({ title: "Not supported", description: "Icon regeneration is not available. Try changing the icon color instead.", variant: "destructive" });
          setAiPrompt("");
        }

      // ── CASE 2: Text selected ──
      } else if (isTextSelected) {
        const canvas = fabricRef.current;
        if (!canvas) throw new Error('Canvas not available');
        const prompt = aiPrompt.trim().toLowerCase();

        // Check for color change
        const requestedColor = parseColorRequest(aiPrompt);
        if (requestedColor) {
          selectedObj.set('fill', requestedColor);
          canvas.requestRenderAll();
          saveToHistory();
          toast({ title: "Text color updated!", description: `Changed to ${requestedColor}` });
          setAiPrompt("");
        }
        // Check for text content change: "change text to X", "rename to X", "text: X"
        else if (/\b(change\s*(text|name)?\s*to|rename\s*to|text[:\s]|write|say)\b/i.test(prompt)) {
          const textMatch = aiPrompt.match(/(?:change\s*(?:text|name)?\s*to|rename\s*to|text[:\s]|write|say)\s*["""]?(.+?)["""]?\s*$/i);
          if (textMatch) {
            const newText = textMatch[1].replace(/^["']+|["']+$/g, '').trim();
            selectedObj.set('text', newText);
            canvas.requestRenderAll();
            saveToHistory();
            toast({ title: "Text updated!", description: `Changed to "${newText}"` });
            setAiPrompt("");
          }
        }
        // Check for font change: "make it bold", "use Playfair Display", "italic"
        else if (/\b(bold|italic|underline|font|playfair|poppins|montserrat|cinzel|dancing|pacifico|roboto|libre|baskerville)\b/i.test(prompt)) {
          if (/\bbold\b/i.test(prompt)) selectedObj.set('fontWeight', selectedObj.fontWeight === 'bold' ? 'normal' : 'bold');
          if (/\bitalic\b/i.test(prompt)) selectedObj.set('fontStyle', selectedObj.fontStyle === 'italic' ? 'normal' : 'italic');
          if (/\bunderline\b/i.test(prompt)) selectedObj.set('underline', !selectedObj.underline);

          // Font family detection
          const fontMap: Record<string, string> = {
            'poppins': 'Poppins', 'montserrat': 'Montserrat', 'playfair': 'Playfair Display',
            'dancing': 'Dancing Script', 'cinzel': 'Cinzel', 'libre': 'Libre Baskerville',
            'baskerville': 'Libre Baskerville', 'pacifico': 'Pacifico', 'roboto': 'Roboto Mono',
          };
          for (const [key, font] of Object.entries(fontMap)) {
            if (prompt.includes(key)) {
              await loadGoogleFont(font);
              selectedObj.set('fontFamily', font);
              break;
            }
          }

          // Font size: "bigger", "smaller", "size 48", "larger"
          if (/\b(bigger|larger|increase)\b/i.test(prompt)) selectedObj.set('fontSize', (selectedObj.fontSize || 32) + 8);
          if (/\b(smaller|decrease|reduce)\b/i.test(prompt)) selectedObj.set('fontSize', Math.max(8, (selectedObj.fontSize || 32) - 8));
          const sizeMatch = prompt.match(/\bsize\s*(\d+)/i);
          if (sizeMatch) selectedObj.set('fontSize', Math.max(8, Math.min(200, parseInt(sizeMatch[1]))));

          canvas.requestRenderAll();
          saveToHistory();
          toast({ title: "Text style updated!" });
          setAiPrompt("");
        }
        // Fallback: treat as text content replacement
        else {
          selectedObj.set('text', aiPrompt.trim());
          canvas.requestRenderAll();
          saveToHistory();
          toast({ title: "Text updated!", description: `Changed to "${aiPrompt.trim()}"` });
          setAiPrompt("");
        }

      // ── CASE 3: Nothing selected → full logo regeneration ──
      } else {
        const result = await reEditWithAI({
          companyName: data.companyName,
          style: data.style,
          primaryColor: data.primaryColor,
          secondaryColor: bgColor,
          model: data.model,
          size: data.size,
          quality: data.quality,
          additionalInfo: aiPrompt,
          symbolPreference: "modern and professional",
        });

        if (result.success && result.url) {
          await loadImageOntoCanvas(result.url, true);
          toast({ title: "Regenerated!", description: "Logo updated with AI." });
          window.dispatchEvent(new CustomEvent("refreshCredits"));
          setAiPrompt("");
        } else {
          throw new Error(result.error);
        }
      }
    } catch (e) {
      toast({
        title: "AI edit failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  }, [aiPrompt, bgColor, data, selectedObj, parseColorRequest, replaceIconOnCanvas, loadImageOntoCanvas, toast, saveToHistory]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-background" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card rounded-t-xl">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/generate">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div className="w-px h-5 bg-border" />
          <span className="font-semibold">Logo Editor</span>
          {data.companyName && (
            <span className="text-muted-foreground text-sm hidden sm:inline">— {data.companyName}</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Saving…" : "Save to My Designs"}
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 border-r bg-card flex flex-col items-center py-4 gap-1 shrink-0">
          <ToolBtn
            icon={<MousePointer2 className="w-5 h-5" />}
            label="Select & Move — click or drag any element"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          />
          <ToolBtn
            icon={<Type className="w-5 h-5" />}
            label="Add Text (T)"
            active={activeTool === "text"}
            onClick={() => { setActiveTool("text"); addText(); }}
          />
          <ToolBtn
            icon={<Shapes className="w-5 h-5" />}
            label="Shapes — open shape picker"
            active={activeTool === "shapes"}
            onClick={() => setActiveTool(activeTool === "shapes" ? "select" : "shapes")}
          />

          <div className="w-8 h-px bg-border my-1" />

          {/* Background color picker */}
          <div className="relative" title="Canvas Background Color">
            <label className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent transition-colors">
              <div
                className="w-6 h-6 rounded border-2 border-border shadow-sm"
                style={bgRemoved
                  ? { backgroundImage: "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }
                  : { backgroundColor: bgColor }
                }
              />
              <input
                type="color"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); setBgRemoved(false); }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          <ToolBtn
            icon={
              isRemovingBg ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageOff className="w-5 h-5" />
              )
            }
            label="Remove Background"
            onClick={removeBackground}
            disabled={isRemovingBg}
          />

          <div className="w-8 h-px bg-border my-1" />

          <ToolBtn
            icon={<Trash2 className="w-5 h-5" />}
            label="Delete Selected (Del)"
            onClick={deleteSelected}
          />
          <ToolBtn
            icon={<Undo2 className="w-5 h-5" />}
            label="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo}
          />
          <ToolBtn
            icon={<Redo2 className="w-5 h-5" />}
            label="Redo (Ctrl+Y)"
            onClick={redo}
            disabled={!canRedo}
          />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 overflow-auto p-4">
          <div
            className="relative rounded-lg overflow-hidden shadow-2xl border border-border"
            style={bgRemoved ? {
              backgroundImage: "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%)",
              backgroundSize: "16px 16px",
            } : undefined}
          >
            {isLoadingImage && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 rounded-lg gap-3"
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading image…</span>
              </div>
            )}
            <canvas ref={canvasElRef} />
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="w-56 border-l bg-card flex flex-col overflow-y-auto shrink-0">

          {/* ── Segmentation progress indicator ── */}
          {isSegmenting && componentLayers.length === 0 && (
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Preparing editable components...</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5">
                You can move and resize the logo while we process
              </p>
            </div>
          )}

          {/* ── AI Breakdown panel — shown only when components are loaded ── */}
          {componentLayers.length > 0 && (
            <>
              <button
                className="flex items-center justify-between px-4 py-3 border-b text-sm font-semibold hover:bg-accent transition-colors"
                onClick={() => setShowBreakdown((p) => !p)}
              >
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                  AI Breakdown
                </span>
                {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showBreakdown && (
                <div className="p-3 space-y-2 border-b">
                  <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => setDebugMode(e.target.checked)}
                      className="rounded border-muted"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Debug bboxes
                    </span>
                  </label>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    {componentLayers.length} component{componentLayers.length !== 1 ? "s" : ""} — click to select
                  </p>
                  {componentLayers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => {
                        const canvas = fabricRef.current;
                        if (!canvas || !layer.fabricObj) return;
                        if (!canvas.getObjects().includes(layer.fabricObj)) return;
                        canvas.setActiveObject(layer.fabricObj);
                        canvas.requestRenderAll();
                        setSelectedObj(layer.fabricObj);
                        setSelectedObjType(layer.fabricObj.type ?? "");
                      }}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all hover:border-primary/60 hover:bg-primary/5 ${
                        selectedObj === layer.fabricObj
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-md border border-border overflow-hidden shrink-0 bg-muted/30 flex items-center justify-center">
                        {layer.thumbnail ? (
                          <img src={layer.thumbnail} alt={layer.label} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[8px] text-muted-foreground uppercase">{layer.type}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-medium truncate">{layer.label}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{layer.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Shapes picker — shown when shapes tool is active */}
          {activeTool === "shapes" && (
            <div className="border-b">
              <div className="px-4 py-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Shape</p>
              </div>
              <div className="grid grid-cols-4 gap-1 p-3">
                {[
                  { icon: <Square className="w-5 h-5" />, label: "Rectangle", action: addRect },
                  { icon: <CircleIcon className="w-5 h-5" />, label: "Circle", action: addCircle },
                  { icon: <Triangle className="w-5 h-5" />, label: "Triangle", action: addTriangle },
                  { icon: <Diamond className="w-5 h-5" />, label: "Diamond", action: addDiamond },
                  { icon: <Star className="w-5 h-5" />, label: "Star", action: addStar },
                  { icon: <Pentagon className="w-5 h-5" />, label: "Pentagon", action: addPentagon },
                  { icon: <Hexagon className="w-5 h-5" />, label: "Hexagon", action: addHexagon },
                  { icon: <Minus className="w-5 h-5" />, label: "Line", action: addLine },
                ].map((s) => (
                  <button
                    key={s.label}
                    title={s.label}
                    onClick={s.action}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s.icon}
                    <span className="text-[9px] leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Properties header */}
          <button
            className="flex items-center justify-between px-4 py-3 border-b text-sm font-semibold hover:bg-accent transition-colors"
            onClick={() => setShowProps((p) => !p)}
          >
            Properties
            {showProps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showProps && (
            <div className="p-4 space-y-5">
              {/* Add element color */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  New Element Color
                </p>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className="w-7 h-7 rounded-md border-2 border-border shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: shapeColor }}
                  />
                  <span className="text-sm text-muted-foreground">Click to pick</span>
                  <input
                    type="color"
                    value={shapeColor}
                    onChange={(e) => {
                      setShapeColor(e.target.value);
                      setTextColor(e.target.value);
                    }}
                    className="opacity-0 absolute w-0 h-0"
                  />
                </label>
              </div>

              {/* Selected object controls */}
              {selectedObj && (
                <>
                  <div className="w-full h-px bg-border" />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Selected:{" "}
                      {selectedObj?._componentLabel
                        ? selectedObj._componentLabel
                        : selectedObjType === "i-text"
                        ? "Text"
                        : selectedObjType === "image"
                        ? "Logo Image"
                        : selectedObjType === "polygon"
                        ? "Shape"
                        : selectedObjType === "line"
                        ? "Line"
                        : selectedObjType.charAt(0).toUpperCase() + selectedObjType.slice(1)}
                    </p>

                    {/* Opacity */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Opacity — {objOpacity}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={objOpacity}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setObjOpacity(v);
                          updateSelectedProp("opacity", v / 100);
                        }}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Text-specific controls */}
                    {selectedObjType === "i-text" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Font Size</label>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const s = Math.max(8, fontSize - 2);
                                setFontSize(s);
                                updateSelectedProp("fontSize", s);
                              }}
                            >
                              −
                            </Button>
                            <span className="flex-1 text-center text-sm font-semibold">
                              {fontSize}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const s = Math.min(200, fontSize + 2);
                                setFontSize(s);
                                updateSelectedProp("fontSize", s);
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {/* Font Family */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Font Family</label>
                          <select
                            value={fontFamily}
                            onChange={async (e) => {
                              const font = e.target.value;
                              setFontFamily(font);
                              // System fonts don't need loading
                              if (font !== "Arial") {
                                await loadGoogleFont(font);
                              }
                              updateSelectedProp("fontFamily", font);
                            }}
                            className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                            style={{ fontFamily }}
                          >
                            {(() => {
                              const categories = [...new Set(FONT_OPTIONS.map(f => f.category))];
                              return categories.map(cat => (
                                <optgroup key={cat} label={cat}>
                                  {FONT_OPTIONS.filter(f => f.category === cat).map(f => (
                                    <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                                      {f.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ));
                            })()}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Text Color</label>
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => {
                              setTextColor(e.target.value);
                              updateSelectedProp("fill", e.target.value);
                            }}
                            className="w-full h-8 rounded-md cursor-pointer border border-border"
                          />
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={selectedObj?.fontWeight === "bold" ? "default" : "outline"}
                            className="flex-1 h-7"
                            onClick={() =>
                              updateSelectedProp(
                                "fontWeight",
                                selectedObj?.fontWeight === "bold" ? "normal" : "bold"
                              )
                            }
                          >
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedObj?.fontStyle === "italic" ? "default" : "outline"}
                            className="flex-1 h-7"
                            onClick={() =>
                              updateSelectedProp(
                                "fontStyle",
                                selectedObj?.fontStyle === "italic" ? "normal" : "italic"
                              )
                            }
                          >
                            <Italic className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedObj?.underline ? "default" : "outline"}
                            className="flex-1 h-7"
                            onClick={() => updateSelectedProp("underline", !selectedObj?.underline)}
                          >
                            <Underline className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Icon / SVG Group color — directly sets fill on each Path child */}
                    {(selectedObjType === "group" || selectedObjType === "path") && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Icon Color</label>
                        <input
                          type="color"
                          value={(() => {
                            // Read current fill from first path in group
                            if (selectedObj?.type === 'path') return selectedObj.fill || '#000000';
                            if (selectedObj?._objects) {
                              for (const child of selectedObj._objects) {
                                if (child.type === 'path' && child.fill && child.fill !== 'none') {
                                  return child.fill;
                                }
                              }
                            }
                            return '#000000';
                          })()}
                          onChange={(e) => {
                            const canvas = fabricRef.current;
                            if (!canvas || !selectedObj) return;
                            const newColor = e.target.value;

                            if (selectedObj.type === 'path') {
                              // Single path — direct fill
                              selectedObj.set('fill', newColor);
                              selectedObj.dirty = true;
                            } else if (selectedObj.type === 'group' && selectedObj._objects) {
                              // Group of paths — set fill on every path child
                              for (const child of selectedObj._objects) {
                                if (child.type === 'path' && child.fill !== 'none') {
                                  child.set('fill', newColor);
                                  child.dirty = true;
                                }
                              }
                              selectedObj.dirty = true;
                            }

                            canvas.requestRenderAll();
                            saveToHistory();
                          }}
                          className="w-full h-8 rounded-md cursor-pointer border border-border"
                        />
                      </div>
                    )}

                    {/* Shape-specific controls */}
                    {(selectedObjType === "rect" || selectedObjType === "circle" || selectedObjType === "triangle" || selectedObjType === "polygon" || selectedObjType === "line") && (
                      <div className="space-y-3">
                        {/* Border / Stroke Color */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Border Color</label>
                          <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => {
                              setStrokeColor(e.target.value);
                              updateSelectedProp("stroke", e.target.value);
                            }}
                            className="w-full h-8 rounded-md cursor-pointer border border-border"
                          />
                        </div>

                        {/* Border Width */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Border Width — {strokeWidth}px
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={strokeWidth}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setStrokeWidth(v);
                              updateSelectedProp("strokeWidth", v);
                            }}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Fill Color */}
                        {selectedObjType !== "line" && (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Fill Color</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={
                                  typeof selectedObj?.fill === "string" && selectedObj.fill !== "transparent"
                                    ? selectedObj.fill
                                    : "#ffffff"
                                }
                                onChange={(e) => {
                                  setShapeColor(e.target.value);
                                  updateSelectedProp("fill", e.target.value);
                                }}
                                className="flex-1 h-8 rounded-md cursor-pointer border border-border"
                              />
                              <Button
                                size="sm"
                                variant={(!selectedObj?.fill || selectedObj.fill === "transparent") ? "default" : "outline"}
                                className="h-8 text-xs px-2 shrink-0"
                                onClick={() => {
                                  setShapeColor("");
                                  updateSelectedProp("fill", "transparent");
                                }}
                                title="No fill"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Image-specific controls */}
                    {selectedObjType === "image" && (
                      <div className="space-y-3">
                        {/* Flip */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Transform</label>
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                              onClick={() => flipImage("X")}
                            >
                              <FlipHorizontal className="w-3 h-3" /> H
                            </Button>
                            <Button
                              size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                              onClick={() => flipImage("Y")}
                            >
                              <FlipVertical className="w-3 h-3" /> V
                            </Button>
                          </div>
                        </div>

                        {/* Brightness */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Brightness — {Math.round(imgBrightness * 100)}
                          </label>
                          <input
                            type="range" min={-1} max={1} step={0.05}
                            value={imgBrightness}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setImgBrightness(v);
                              applyImageFilter("Brightness", v);
                            }}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Contrast — {Math.round(imgContrast * 100)}
                          </label>
                          <input
                            type="range" min={-1} max={1} step={0.05}
                            value={imgContrast}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setImgContrast(v);
                              applyImageFilter("Contrast", v);
                            }}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Saturation */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Saturation — {Math.round(imgSaturation * 100)}
                          </label>
                          <input
                            type="range" min={-1} max={1} step={0.05}
                            value={imgSaturation}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setImgSaturation(v);
                              applyImageFilter("Saturation", v);
                            }}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Preset filters */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Presets</label>
                          <div className="grid grid-cols-2 gap-1">
                            {(["grayscale", "sepia", "invert", "reset"] as const).map((p) => (
                              <Button
                                key={p}
                                size="sm" variant="outline"
                                className="h-7 text-xs capitalize"
                                onClick={() => applyPresetFilter(p)}
                              >
                                {p === "reset" ? <><RotateCcw className="w-3 h-3 mr-1" />Reset</> : p}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full h-7 text-xs"
                      onClick={deleteSelected}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete Element
                    </Button>
                  </div>
                </>
              )}

              {/* Export */}
              <div className="w-full h-px bg-border" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Export
                </p>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={exportPNG}>
                  <Download className="w-3 h-3" /> PNG (2×)
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={exportSVG}>
                  <Download className="w-3 h-3" /> SVG
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
