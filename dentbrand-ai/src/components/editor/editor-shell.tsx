"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorStore } from "@/stores/editor-store";
import {
  createDesignVersion,
  recordExport,
  saveDesign,
} from "@/lib/designs/actions";
import { validateDesignJson, type DesignJson } from "@/lib/designs/schema";
import {
  downloadDataUrl,
  exportStageToPng,
  validateForExport,
} from "@/lib/designs/export";
import { stageRef } from "@/components/editor/stage-ref";
import { LayersPanel } from "@/components/editor/layers-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import {
  HistoryPanel,
  type VersionSummary,
} from "@/components/editor/history-panel";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_RETRY_MS = 5000;
const CHECKPOINT_EVERY_N_SAVES = 10;
const RECOVERY_THROTTLE_MS = 1000;

const recoveryKey = (designId: string) => `dentbrand-recovery-${designId}`;

interface EditorShellProps {
  designId: string;
  workspaceId: string;
  designName: string;
  language: "ar" | "en";
  design: DesignJson;
  assetUrls: Record<string, string>;
  brandColors: string[];
  versions: VersionSummary[];
  /** Server row's updated_at — re-initializes state after restores. */
  serverUpdatedAt: string;
}

export function EditorShell({
  designId,
  workspaceId,
  designName,
  language,
  design,
  assetUrls,
  brandColors,
  versions,
  serverUpdatedAt,
}: EditorShellProps) {
  const initialize = useEditorStore((s) => s.initialize);
  const saveState = useEditorStore((s) => s.saveState);
  const saveError = useEditorStore((s) => s.saveError);
  const setSaveState = useEditorStore((s) => s.setSaveState);
  const toDesignJson = useEditorStore((s) => s.toDesignJson);
  const replaceLayers = useEditorStore((s) => s.replaceLayers);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const savesSinceCheckpoint = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingNow = useRef(false);

  // (Re-)initialize when the design identity or server state changes
  // (e.g. after a version restore + router.refresh).
  const initedKey = useRef("");
  useEffect(() => {
    const key = `${designId}:${serverUpdatedAt}`;
    if (initedKey.current === key) return;
    initedKey.current = key;
    initialize({ designId, workspaceId, design, assetUrls });

    // Local recovery: offer a draft newer than the server state. Deferred
    // so state updates never run synchronously inside the effect body.
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(recoveryKey(designId));
        if (!raw) return;
        const draft = JSON.parse(raw) as { updatedAt: number; design: unknown };
        if (draft.updatedAt > Date.parse(serverUpdatedAt)) {
          setRecoveryAvailable(true);
        } else {
          localStorage.removeItem(recoveryKey(designId));
        }
      } catch {
        localStorage.removeItem(recoveryKey(designId));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [designId, workspaceId, design, assetUrls, serverUpdatedAt, initialize]);

  const doSave = useCallback(async () => {
    if (savingNow.current) return;
    if (useEditorStore.getState().saveState !== "unsaved") return;
    savingNow.current = true;
    setSaveState("saving");
    const result = await saveDesign(designId, toDesignJson());
    savingNow.current = false;

    if (result?.error) {
      setSaveState("error", result.error);
      // A failed save must stay visible AND keep retrying.
      saveTimer.current = setTimeout(() => {
        setSaveState("unsaved");
      }, AUTOSAVE_RETRY_MS);
      return;
    }

    // Edits made while saving keep the state at "unsaved".
    if (useEditorStore.getState().saveState === "saving") {
      setSaveState("saved");
    }
    localStorage.removeItem(recoveryKey(designId));

    savesSinceCheckpoint.current += 1;
    if (savesSinceCheckpoint.current >= CHECKPOINT_EVERY_N_SAVES) {
      savesSinceCheckpoint.current = 0;
      void createDesignVersion(designId, "checkpoint");
    }
  }, [designId, setSaveState, toDesignJson]);

  // Autosave: debounce after every change; also throttle a local recovery
  // draft so a crash before autosave loses nothing.
  useEffect(() => {
    let lastRecoveryWrite = 0;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.saveState !== "unsaved") return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(doSave, AUTOSAVE_DEBOUNCE_MS);

      if (
        state.layers !== previous.layers &&
        Date.now() - lastRecoveryWrite > RECOVERY_THROTTLE_MS
      ) {
        lastRecoveryWrite = Date.now();
        try {
          localStorage.setItem(
            recoveryKey(designId),
            JSON.stringify({
              updatedAt: Date.now(),
              design: state.toDesignJson(),
            })
          );
        } catch {
          // Quota errors must not break editing; autosave still runs.
        }
      }
    });
    return () => {
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [designId, doSave]);

  // Unsaved work must not be lost silently.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (useEditorStore.getState().saveState !== "saved") {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Undo / redo keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return; // Native text-field undo stays untouched.
      }
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (
        (event.key.toLowerCase() === "z" && event.shiftKey) ||
        event.key.toLowerCase() === "y"
      ) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const restoreRecovery = () => {
    try {
      const raw = localStorage.getItem(recoveryKey(designId));
      if (!raw) return setRecoveryAvailable(false);
      const draft = JSON.parse(raw) as { design: unknown };
      const validated = validateDesignJson(draft.design);
      if (!validated.ok) {
        localStorage.removeItem(recoveryKey(designId));
        setRecoveryAvailable(false);
        return;
      }
      replaceLayers(validated.design.layers);
      setRecoveryAvailable(false);
    } catch {
      setRecoveryAvailable(false);
    }
  };

  const discardRecovery = () => {
    localStorage.removeItem(recoveryKey(designId));
    setRecoveryAvailable(false);
  };

  const exportPng = async () => {
    setExportError(null);
    setExporting(true);
    const state = useEditorStore.getState();

    // Deselect so the selection outline never appears in the file.
    state.select(null);
    await new Promise((resolve) => setTimeout(resolve, 60));
    await document.fonts.ready;

    const problems = validateForExport(state.layers, state.assetLoadStatus);
    if (problems.length > 0) {
      const message = problems.map((p) => p.message).join(" · ");
      setExportError(message);
      setExporting(false);
      void recordExport({
        designId,
        width: state.canvas.width,
        height: state.canvas.height,
        status: "failed",
        error: message.slice(0, 500),
      });
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      setExportError("Canvas is not ready yet — try again in a moment");
      setExporting(false);
      return;
    }

    const result = await exportStageToPng(stage, state.canvas);
    if (!result.ok || !result.dataUrl) {
      setExportError(result.error ?? "Export failed");
      void recordExport({
        designId,
        width: state.canvas.width,
        height: state.canvas.height,
        status: "failed",
        error: (result.error ?? "Export failed").slice(0, 500),
      });
      setExporting(false);
      return;
    }

    downloadDataUrl(
      result.dataUrl,
      `${designName.replace(/[^\w؀-ۿ-]+/g, "-").toLowerCase() || "design"}.png`
    );
    void recordExport({
      designId,
      width: state.canvas.width,
      height: state.canvas.height,
      status: "completed",
    });
    setExporting(false);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/dashboard/workspaces/${workspaceId}/designs`}
            className="shrink-0 text-sm text-muted-foreground hover:underline"
          >
            ← My designs
          </Link>
          <span className="truncate text-sm font-semibold">{designName}</span>
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs">
            {language === "ar" ? "العربية" : "English"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪ Redo
          </Button>
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
            {saveState === "error" && `Save failed: ${saveError} — retrying`}
          </span>
          <Button size="sm" onClick={exportPng} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PNG"}
          </Button>
        </div>
      </header>

      {recoveryAvailable && (
        <div className="border-b bg-amber-50 px-4 py-2 dark:bg-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              We found unsaved changes from your last session on this device.
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreRecovery}>
                Restore them
              </Button>
              <Button size="sm" variant="ghost" onClick={discardRecovery}>
                Discard
              </Button>
            </span>
          </div>
        </div>
      )}

      {exportError && (
        <div className="border-b px-4 py-2">
          <Alert variant="destructive">
            <AlertDescription>Export blocked: {exportError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r p-3">
          <LayersPanel />
        </aside>
        <main className="flex min-w-0 flex-1 items-stretch bg-secondary/40 p-4">
          <EditorCanvas />
        </main>
        <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-l p-4">
          <PropertiesPanel brandColors={brandColors} />
          <HistoryPanel designId={designId} versions={versions} />
        </aside>
      </div>
    </div>
  );
}
