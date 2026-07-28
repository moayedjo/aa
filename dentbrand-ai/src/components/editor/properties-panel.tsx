"use client";

import { useRef, useState } from "react";

import { useEditorStore } from "@/stores/editor-store";
import { uploadDesignImage } from "@/lib/designs/upload";
import { registerDesignAsset } from "@/lib/designs/actions";
import type { DesignLayer, DesignTextLayer } from "@/lib/designs/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function PropertiesPanel({ brandColors }: { brandColors: string[] }) {
  const layers = useEditorStore((s) => s.layers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const layer = layers.find((l) => l.id === selectedId);

  if (!layer) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a layer on the canvas or in the layers list to edit it.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">
          {layer.name || layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}
        </p>
        {!layer.editable && (
          <p className="mt-1 rounded bg-secondary px-2 py-1.5 text-xs text-muted-foreground">
            🔒 This layer is locked by the template and cannot be changed.
          </p>
        )}
      </div>

      {layer.editable && (
        <>
          <PositionFields layer={layer} />
          {layer.type === "text" && (
            <TextFields layer={layer} brandColors={brandColors} />
          )}
          {layer.type === "shape" && (
            <ColorField
              label="Fill color"
              value={layer.fill}
              layerId={layer.id}
              field="fill"
              brandColors={brandColors}
            />
          )}
          {layer.type === "image" && <ImageFields layer={layer} />}
        </>
      )}
    </div>
  );
}

function PositionFields({ layer }: { layer: DesignLayer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="pos-x">X</Label>
        <Input
          id="pos-x"
          type="number"
          value={Math.round(layer.x)}
          onChange={(e) =>
            updateLayer(layer.id, { x: Number(e.target.value) || 0 })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pos-y">Y</Label>
        <Input
          id="pos-y"
          type="number"
          value={Math.round(layer.y)}
          onChange={(e) =>
            updateLayer(layer.id, { y: Number(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  );
}

function TextFields({
  layer,
  brandColors,
}: {
  layer: DesignTextLayer;
  brandColors: string[];
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const overLimit =
    layer.maxCharacters !== undefined && layer.text.length > layer.maxCharacters;

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="text-content">Text</Label>
        <textarea
          id="text-content"
          value={layer.text}
          dir={layer.direction}
          onChange={(e) => {
            const value = layer.maxCharacters
              ? e.target.value.slice(0, layer.maxCharacters)
              : e.target.value;
            updateLayer(layer.id, { text: value });
          }}
          rows={3}
          className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {layer.maxCharacters !== undefined && (
          <p
            className={cn(
              "text-xs",
              overLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {layer.text.length}/{layer.maxCharacters} characters
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="font-size">Font size</Label>
        <Input
          id="font-size"
          type="number"
          min={6}
          max={400}
          value={layer.fontSize}
          onChange={(e) =>
            updateLayer(layer.id, {
              fontSize: Math.min(400, Math.max(6, Number(e.target.value) || 6)),
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>Alignment</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => updateLayer(layer.id, { align })}
              className={cn(
                "flex-1 rounded border px-2 py-1 text-xs capitalize",
                layer.align === align
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <ColorField
        label="Text color"
        value={layer.fill}
        layerId={layer.id}
        field="fill"
        brandColors={brandColors}
      />
    </>
  );
}

function ColorField({
  label,
  value,
  layerId,
  field,
  brandColors,
}: {
  label: string;
  value: string;
  layerId: string;
  field: "fill";
  brandColors: string[];
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer);
  return (
    <div className="space-y-2">
      <Label htmlFor={`color-${layerId}`}>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {brandColors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={`Use ${color}`}
            onClick={() => updateLayer(layerId, { [field]: color })}
            className={cn(
              "h-7 w-7 rounded-full border",
              value.toLowerCase() === color.toLowerCase() &&
                "ring-2 ring-primary ring-offset-1"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          id={`color-${layerId}`}
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => updateLayer(layerId, { [field]: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border bg-background"
          aria-label={`${label} custom picker`}
        />
      </div>
    </div>
  );
}

function ImageFields({
  layer,
}: {
  layer: Extract<DesignLayer, { type: "image" }>;
}) {
  const workspaceId = useEditorStore((s) => s.workspaceId);
  const designId = useEditorStore((s) => s.designId);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const addAssetUrl = useEditorStore((s) => s.addAssetUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const uploaded = await uploadDesignImage(workspaceId, designId, file);
    if (uploaded.error || !uploaded.ref || !uploaded.signedUrl) {
      setError(uploaded.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    const registered = await registerDesignAsset({
      workspaceId,
      designId,
      storagePath: uploaded.storagePath,
      mimeType: uploaded.mimeType,
    });
    if (registered?.error) {
      setError(registered.error);
      setUploading(false);
      return;
    }

    addAssetUrl(uploaded.ref, uploaded.signedUrl);
    updateLayer(layer.id, { src: uploaded.ref });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload">
        {layer.src ? "Replace image" : "Upload image"}
      </Label>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input
        id="image-upload"
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFile}
        disabled={uploading}
      />
      <p className="text-xs text-muted-foreground">
        {uploading ? "Uploading…" : "PNG, JPG or WebP, up to 5 MB."}
      </p>
      <div className="flex gap-1">
        {(["cover", "contain"] as const).map((fit) => (
          <Button
            key={fit}
            type="button"
            variant={layer.fit === fit ? "default" : "outline"}
            size="sm"
            onClick={() => updateLayer(layer.id, { fit })}
          >
            {fit === "cover" ? "Fill slot" : "Fit inside"}
          </Button>
        ))}
      </div>
    </div>
  );
}
