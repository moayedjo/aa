import { create } from "zustand";

import type { DesignJson, DesignLayer } from "@/lib/designs/schema";

export type SaveState = "saved" | "unsaved" | "saving" | "error";

interface EditorState {
  designId: string;
  workspaceId: string;
  canvas: DesignJson["canvas"];
  layers: DesignLayer[];
  /** Map of supabase:// refs to signed URLs for canvas display. */
  assetUrls: Record<string, string>;
  selectedId: string | null;
  saveState: SaveState;
  saveError: string | null;

  initialize: (input: {
    designId: string;
    workspaceId: string;
    design: DesignJson;
    assetUrls: Record<string, string>;
  }) => void;
  select: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<DesignLayer>) => void;
  addAssetUrl: (ref: string, url: string) => void;
  setSaveState: (state: SaveState, error?: string | null) => void;
  toDesignJson: () => DesignJson;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  designId: "",
  workspaceId: "",
  canvas: { width: 1080, height: 1350, backgroundColor: "#ffffff" },
  layers: [],
  assetUrls: {},
  selectedId: null,
  saveState: "saved",
  saveError: null,

  initialize: ({ designId, workspaceId, design, assetUrls }) =>
    set({
      designId,
      workspaceId,
      canvas: design.canvas,
      layers: design.layers,
      assetUrls,
      selectedId: null,
      saveState: "saved",
      saveError: null,
    }),

  select: (id) => set({ selectedId: id }),

  updateLayer: (id, patch) =>
    set((state) => {
      const layer = state.layers.find((l) => l.id === id);
      // Locked layers accept no modifications, from any code path.
      if (!layer || !layer.editable) return state;
      return {
        layers: state.layers.map((l) =>
          l.id === id ? ({ ...l, ...patch } as DesignLayer) : l
        ),
        saveState: "unsaved",
      };
    }),

  addAssetUrl: (ref, url) =>
    set((state) => ({ assetUrls: { ...state.assetUrls, [ref]: url } })),

  setSaveState: (saveState, error = null) =>
    set({ saveState, saveError: error ?? null }),

  toDesignJson: () => {
    const { canvas, layers } = get();
    return { schemaVersion: 1, canvas, layers };
  },
}));
