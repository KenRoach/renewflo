import { create } from "zustand";
import type { Asset } from "@/types";
import { assets as assetsApi, type ApiAsset } from "@/services/gateway";
import { INITIAL_ASSETS } from "@/data/seeds";

const ASSETS_STORAGE_KEY = "renewflow_assets";

function persistAssets(assets: Asset[]) {
  try { localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets)); } catch { /* quota */ }
}

function loadPersistedAssets(): Asset[] | null {
  try {
    const stored = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Asset[];
    return parsed.length > 0 ? parsed : null;
  } catch { return null; }
}

/** Map API snake_case asset to frontend Asset type */
function mapApiAsset(a: ApiAsset): Asset {
  return {
    id: a.id,
    brand: a.brand,
    model: a.model,
    serial: a.serial,
    client: "", // API doesn't have client field on asset_item — populated from org context
    tier: a.tier as Asset["tier"],
    daysLeft: a.daysLeft,
    oem: null, // pricing comes from quotes/price-lists
    tpm: 0,
    status: a.status as Asset["status"],
    warrantyEnd: a.warranty_end,
    deviceType: a.device_type ?? undefined,
    purchaseDate: a.purchase_date ?? undefined,
  };
}

interface AssetStore {
  assets: Asset[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  addAssets: (newAssets: Asset[]) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  loadFromApi: () => Promise<void>;
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  loading: false,
  loaded: false,
  error: null,

  loadFromApi: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await assetsApi.list({ limit: 100 });
      const apiAssets = result.data.map(mapApiAsset);
      if (apiAssets.length > 0) {
        persistAssets(apiAssets);
        set({ assets: apiAssets, loaded: true, loading: false });
        return;
      }
    } catch { /* API unavailable — fall back */ }

    // Fallback: localStorage > seed data
    const cached = loadPersistedAssets();
    const assets = cached || INITIAL_ASSETS;
    persistAssets(assets);
    set({ assets, loaded: true, loading: false });
  },

  addAssets: (newAssets) =>
    set((state) => {
      const assets = [...state.assets, ...newAssets];
      persistAssets(assets);
      return { assets };
    }),

  updateAsset: (id, patch) =>
    set((state) => {
      const assets = state.assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
      persistAssets(assets);
      return { assets };
    }),

  removeAsset: (id) =>
    set((state) => {
      const assets = state.assets.filter((a) => a.id !== id);
      persistAssets(assets);
      return { assets };
    }),
}));
