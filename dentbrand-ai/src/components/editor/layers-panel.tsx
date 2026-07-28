"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { DesignLayer } from "@/lib/designs/schema";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<DesignLayer["type"], string> = {
  text: "Text",
  image: "Image",
  shape: "Shape",
  logo: "Logo",
  icon: "Icon",
};

export function LayersPanel() {
  const layers = useEditorStore((s) => s.layers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  // Top-most first, matching how users think about stacking.
  const ordered = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="space-y-1">
      <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">
        Layers
      </p>
      {ordered.map((layer) => (
        <button
          key={layer.id}
          type="button"
          onClick={() => select(layer.id)}
          className={cn(
            "flex w-full items-center justify-between rounded px-2 py-1.5 text-start text-sm transition-colors",
            selectedId === layer.id ? "bg-accent" : "hover:bg-accent/50"
          )}
        >
          <span className="truncate">
            {layer.name ||
              (layer.type === "text"
                ? layer.text.slice(0, 18) || "Text"
                : TYPE_LABELS[layer.type])}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {TYPE_LABELS[layer.type]}
            {!layer.editable && <span title="Locked by the template">🔒</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
