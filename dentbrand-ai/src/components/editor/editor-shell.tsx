"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useTransition } from "react";

import { useEditorStore } from "@/stores/editor-store";
import { saveDesign } from "@/lib/designs/actions";
import type { DesignJson } from "@/lib/designs/schema";
import { LayersPanel } from "@/components/editor/layers-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Konva touches `window`; render the canvas client-side only.
const EditorCanvas = dynamic(
  () => import("@/components/editor/editor-canvas").then((m) => m.EditorCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    ),
  }
);

interface EditorShellProps {
  designId: string;
  workspaceId: string;
  designName: string;
  language: "ar" | "en";
  design: DesignJson;
  assetUrls: Record<string, string>;
  brandColors: string[];
}

export function EditorShell({
  designId,
  workspaceId,
  designName,
  language,
  design,
  assetUrls,
  brandColors,
}: EditorShellProps) {
  const initialize = useEditorStore((s) => s.initialize);
  const saveState = useEditorStore((s) => s.saveState);
  const saveError = useEditorStore((s) => s.saveError);
  const setSaveState = useEditorStore((s) => s.setSaveState);
  const toDesignJson = useEditorStore((s) => s.toDesignJson);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    initialize({ designId, workspaceId, design, assetUrls });
  }, [initialize, designId, workspaceId, design, assetUrls]);

  // Unsaved work must not be lost silently.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (useEditorStore.getState().saveState === "unsaved") {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const save = () =>
    startSaving(async () => {
      setSaveState("saving");
      const result = await saveDesign(designId, toDesignJson());
      if (result?.error) {
        setSaveState("error", result.error);
      } else {
        setSaveState("saved");
      }
    });

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/dashboard/workspaces/${workspaceId}`}
            className="shrink-0 text-sm text-muted-foreground hover:underline"
          >
            ← Back
          </Link>
          <span className="truncate text-sm font-semibold">{designName}</span>
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs">
            {language === "ar" ? "العربية" : "English"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            role="status"
            className={cn(
              "text-xs",
              saveState === "error"
                ? "font-medium text-destructive"
                : "text-muted-foreground"
            )}
          >
            {saveState === "saved" && "All changes saved"}
            {saveState === "unsaved" && "Unsaved changes"}
            {saveState === "saving" && "Saving…"}
            {saveState === "error" && `Save failed: ${saveError}`}
          </span>
          <Button
            size="sm"
            onClick={save}
            disabled={isSaving || saveState === "saved"}
          >
            {saveState === "error" ? "Retry save" : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r p-3">
          <LayersPanel />
        </aside>
        <main className="flex min-w-0 flex-1 items-stretch bg-secondary/40 p-4">
          <EditorCanvas />
        </main>
        <aside className="w-80 shrink-0 overflow-y-auto border-l p-4">
          <PropertiesPanel brandColors={brandColors} />
        </aside>
      </div>
    </div>
  );
}
