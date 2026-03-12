import { create } from "zustand";
import type { Asset } from "@/types";
import { assetsApi } from "@/services/assets.api";

interface AssetStore {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
  fetchAssets: () => Promise<void>;
  addAssets: (newAssets: Asset[]) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  loading: false,
  error: null,
  fetched: false,

  fetchAssets: async () => {
    if (get().fetched) return;
    set({ loading: true, error: null });
    try {
      const res = await assetsApi.list();
      set({ assets: res.data, loading: false, fetched: true });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addAssets: (newAssets) =>
    set((state) => ({
      assets: [...state.assets, ...newAssets],
    })),

  updateAsset: (id, patch) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),
}));
