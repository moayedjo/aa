"use client";

/* eslint-disable @next/next/no-img-element -- thumbnails use short-lived signed URLs */

import { useState } from "react";

import { generateDesignImage } from "@/lib/ai/image-actions";
import type { ImageGeneration } from "@/lib/ai/queries";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ImagePanelProps {
  designId: string;
  /** Image prompt suggested by the latest AI copy result, if any. */
  suggestedPrompt: string;
  previousImages: ImageGeneration[];
}

export function ImagePanel({
  designId,
  suggestedPrompt,
  previousImages,
}: ImagePanelProps) {
  const layers = useEditorStore((s) => s.layers);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const addAssetUrl = useEditorStore((s) => s.addAssetUrl);

  const [prompt, setPrompt] = useState(suggestedPrompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // One key per submission: retries of the SAME click reuse it, so a
  // network hiccup can't double-charge.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageGeneration[]>(previousImages);

  const imageLayers = layers.filter(
    (l) => l.type === "image" && l.editable && !l.hidden
  );
  const [targetLayerId, setTargetLayerId] = useState<string | null>(
    imageLayers[0]?.id ?? null
  );
  const targetLayer =
    imageLayers.find((l) => l.id === targetLayerId) ?? imageLayers[0] ?? null;

  const apply = (image: Pick<ImageGeneration, "ref" | "signedUrl">) => {
    if (!targetLayer) return;
    addAssetUrl(image.ref, image.signedUrl);
    updateLayer(targetLayer.id, { src: image.ref });
    setNotice("Image applied. The previous image stays in the history below.");
  };

  const generate = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    const key = pendingKey ?? crypto.randomUUID();
    setPendingKey(key);

    const result = await generateDesignImage({
      designId,
      prompt,
      idempotencyKey: key,
    });
    setBusy(false);

    if (result.error || !result.ref || !result.signedUrl) {
      // The reservation was refunded server-side; a retry gets a NEW key
      // because the failed request is terminal.
      setPendingKey(null);
      setError(result.error ?? "Image generation failed");
      return;
    }

    setPendingKey(null);
    const entry: ImageGeneration = {
      id: result.generationId ?? key,
      created_at: new Date().toISOString(),
      prompt,
      ref: result.ref,
      signedUrl: result.signedUrl,
    };
    setHistory((prev) =>
      result.duplicate ? prev : [entry, ...prev].slice(0, 12)
    );
    apply(entry);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <p className="text-sm font-semibold">AI image</p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert variant="success">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {imageLayers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This design has no editable image slot.
        </p>
      ) : (
        <>
          {imageLayers.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="image-target">Image slot</Label>
              <select
                id="image-target"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={targetLayer?.id ?? ""}
                onChange={(e) => setTargetLayerId(e.target.value)}
              >
                {imageLayers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || l.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="image-prompt">Describe the image</Label>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="e.g. A smiling patient in a bright modern dental clinic"
              className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              No-text/no-logo composition rules are always added
              automatically.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              onClick={generate}
              disabled={busy || prompt.trim().length < 5}
            >
              {busy ? "Generating…" : "Generate image"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Uses 1 image credit
            </span>
          </div>
          {busy && (
            <p className="text-xs text-muted-foreground" role="status">
              Creating and storing your image — this can take up to a
              minute. A failed generation is never charged.
            </p>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Generated images ({history.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {history.map((image) => (
              <figure key={image.id} className="space-y-1">
                <img
                  src={image.signedUrl}
                  alt={image.prompt || "Generated image"}
                  className="aspect-[4/5] w-full rounded border object-cover"
                />
                <div className="flex items-center justify-between">
                  <figcaption
                    className="truncate text-[10px] text-muted-foreground"
                    title={image.prompt}
                  >
                    {image.prompt || "—"}
                  </figcaption>
                  {targetLayer && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn("h-6 shrink-0 px-2 text-xs")}
                      onClick={() => apply(image)}
                    >
                      Use
                    </Button>
                  )}
                </div>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
