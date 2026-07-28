import type Konva from "konva";

import type { DesignJson, DesignLayer } from "@/lib/designs/schema";

/**
 * Client-side PNG export with validation. Export must never silently
 * produce a wrong file: fonts and image assets are validated first, and
 * the produced PNG's dimensions are verified against the canvas.
 */

export interface ExportProblem {
  layerId: string | null;
  message: string;
}

/** Blocks export when fonts or image assets are missing or failed. */
export function validateForExport(
  layers: DesignLayer[],
  assetLoadStatus: Record<string, boolean>
): ExportProblem[] {
  const problems: ExportProblem[] = [];

  for (const layer of layers) {
    if (layer.hidden) continue;

    if (layer.type === "image") {
      if (!layer.src) {
        problems.push({
          layerId: layer.id,
          message: `Image slot "${layer.name || layer.id}" is empty — upload an image first`,
        });
      } else if (assetLoadStatus[layer.src] !== true) {
        problems.push({
          layerId: layer.id,
          message: `Image "${layer.name || layer.id}" failed to load — try replacing it`,
        });
      }
    }

    if (layer.type === "logo") {
      if (!layer.src) {
        problems.push({
          layerId: layer.id,
          message:
            "No logo uploaded — add one in your Brand Kit before exporting",
        });
      } else if (assetLoadStatus[layer.src] !== true) {
        problems.push({
          layerId: layer.id,
          message: "Your logo failed to load — check the Brand Kit",
        });
      }
    }

    if (layer.type === "text" && typeof document !== "undefined") {
      const family = layer.fontFamily.split(",")[0]?.trim();
      if (family && !document.fonts.check(`${layer.fontWeight} 16px "${family}"`)) {
        problems.push({
          layerId: layer.id,
          message: `Font "${family}" is not loaded yet — wait a moment and retry`,
        });
      }
    }
  }

  // One message per distinct problem is enough.
  const seen = new Set<string>();
  return problems.filter((p) => {
    if (seen.has(p.message)) return false;
    seen.add(p.message);
    return true;
  });
}

export interface ExportResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

/**
 * Renders the stage to a PNG at the design's REAL export dimensions
 * (the on-screen stage is only a scaled view) and verifies the output.
 */
export async function exportStageToPng(
  stage: Konva.Stage,
  canvas: DesignJson["canvas"]
): Promise<ExportResult> {
  const scale = stage.scaleX() || 1;
  let dataUrl: string;
  try {
    dataUrl = stage.toDataURL({
      x: 0,
      y: 0,
      width: canvas.width * scale,
      height: canvas.height * scale,
      pixelRatio: 1 / scale,
      mimeType: "image/png",
    });
  } catch (error) {
    return {
      ok: false,
      error: `Could not render the design: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  // Export validation: the PNG must have the exact canvas dimensions.
  const verified = await new Promise<ExportResult>((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (
        image.naturalWidth === canvas.width &&
        image.naturalHeight === canvas.height
      ) {
        resolve({ ok: true, dataUrl });
      } else {
        resolve({
          ok: false,
          error: `Export size mismatch: got ${image.naturalWidth}×${image.naturalHeight}, expected ${canvas.width}×${canvas.height}`,
        });
      }
    };
    image.onerror = () =>
      resolve({ ok: false, error: "The exported file could not be read" });
    image.src = dataUrl;
  });

  return verified;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}
