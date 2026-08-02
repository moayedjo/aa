import { create } from "zustand";

import type { DesignJson, DesignLayer } from "@/lib/designs/schema";

export type SaveState = "saved" | "unsaved" | "saving" | "error";

const HISTORY_LIMIT = 50;
/** Rapid edits to the same layer coalesce into one history entry. */
const HISTORY_COALESCE_MS = 800;

interface EditorState {
  designId: string;
  workspaceId: string;
  canvas: DesignJson["canvas"];
  layers: DesignLayer[];
  /** Map of supabase:// refs to signed URLs for canvas display. */
  assetUrls: Record<string, string>;
  /** Load outcome per ref — export validation blocks on false/missing. */
  assetLoadStatus: Record<string, boolean>;
  selectedId: string | null;
  saveState: SaveState;
  saveError: string | null;

  past: DesignLayer[][];
  future: DesignLayer[][];
  lastHistoryPush: { time: number; layerId: string | null };

  initialize: (input: {
    designId: string;
    workspaceId: string;
    design: DesignJson;
    assetUrls: Record<string, string>;
  }) => void;
  select: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<DesignLayer>) => void;
  /** Wholesale replace (local recovery / version restore). Clears history. */
  replaceLayers: (layers: DesignLayer[]) => void;
  undo: () => void;
  redo: () => void;
  addAssetUrl: (ref: string, url: string) => void;
  setAssetLoaded: (ref: string, ok: boolean) => void;
  setSaveState: (state: SaveState, error?: string | null) => void;
  toDesignJson: () => DesignJson;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  designId: "",
  workspaceId: "",
  canvas: { width: 1080, height: 1350, backgroundColor: "#ffffff" },
  layers: [],
  assetUrls: {},
  assetLoadStatus: {},
  selectedId: null,
  saveState: "saved",
  saveError: null,
  past: [],
  future: [],
  lastHistoryPush: { time: 0, layerId: null },

  initialize: ({ designId, workspaceId, design, assetUrls }) =>
    set({
      designId,
      workspaceId,
      canvas: design.canvas,
      layers: design.layers,
      assetUrls,
      assetLoadStatus: {},
      selectedId: null,
      saveState: "saved",
      saveError: null,
      past: [],
      future: [],
      lastHistoryPush: { time: 0, layerId: null },
    }),

  select: (id) => set({ selectedId: id }),

  updateLayer: (id, patch) =>
    set((state) => {
      const layer = state.layers.find((l) => l.id === id);
      // Locked layers accept no modifications, from any code path.
      if (!layer || !layer.editable) return state;

      const now = Date.now();
      const coalesce =
        state.lastHistoryPush.layerId === id &&
        now - state.lastHistoryPush.time < HISTORY_COALESCE_MS;
      const past = coalesce
        ? state.past
        : [...state.past, state.layers].slice(-HISTORY_LIMIT);

      return {
        layers: state.layers.map((l) =>
          l.id === id ? ({ ...l, ...patch } as DesignLayer) : l
        ),
        past,
        future: [],
        lastHistoryPush: { time: now, layerId: id },
        saveState: "unsaved",
      };
    }),

  replaceLayers: (layers) =>
    set({
      layers,
      past: [],
      future: [],
      selectedId: null,
      lastHistoryPush: { time: 0, layerId: null },
      saveState: "unsaved",
    }),

  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        layers: previous,
        past: state.past.slice(0, -1),
        future: [state.layers, ...state.future].slice(0, HISTORY_LIMIT),
        lastHistoryPush: { time: 0, layerId: null },
        saveState: "unsaved",
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        layers: next,
        past: [...state.past, state.layers].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        lastHistoryPush: { time: 0, layerId: null },
        saveState: "unsaved",
      };
    }),

  addAssetUrl: (ref, url) =>
    set((state) => ({ assetUrls: { ...state.assetUrls, [ref]: url } })),

  setAssetLoaded: (ref, ok) =>
    set((state) => ({
      assetLoadStatus: { ...state.assetLoadStatus, [ref]: ok },
    })),

  setSaveState: (saveState, error = null) =>
    set({ saveState, saveError: error ?? null }),

  toDesignJson: () => {
    const { canvas, layers } = get();
    return { schemaVersion: 1, canvas, layers };
  },
}));
