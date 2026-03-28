"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ImageEditor, { EditorData } from "@/components/image-editor";
import { downloadImage } from "@/app/actions/actions";

const STORAGE_KEY = "logoai_editor_data";

export default function EditorPage() {
  const router = useRouter();
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setError("No image found to edit.");
          setLoading(false);
          return;
        }
        const parsed: EditorData = JSON.parse(raw);
        if (!parsed.imageUrl) {
          setError("No image found to edit.");
          setLoading(false);
          return;
        }
        setEditorData(parsed);

        // If it's already a data URL, use directly; otherwise download
        let dataUrl = parsed.imageUrl;
        if (!dataUrl.startsWith("data:")) {
          const dlResult = await downloadImage(dataUrl);
          if (dlResult.success && dlResult.data) {
            dataUrl = dlResult.data;
          }
        }
        setImageDataUrl(dataUrl);
      } catch {
        setError("Failed to load editor data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground text-lg">{error}</p>
        <button
          onClick={() => router.push("/dashboard/generate")}
          className="text-primary underline text-sm"
        >
          Go generate a logo first
        </button>
      </div>
    );
  }

  if (loading || !editorData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        <p className="text-sm text-muted-foreground">Loading editor…</p>
      </div>
    );
  }

  return (
    <ImageEditor
      data={{ ...editorData, imageUrl: imageDataUrl || editorData.imageUrl }}
      processedComponents={undefined}
      isSegmenting={false}
    />
  );
}
