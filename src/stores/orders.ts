import { create } from "zustand";
import { orders as ordersApi, type ApiOrder } from "@/services/gateway";

interface OrdersStore {
  orders: ApiOrder[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  createFromQuote: (quoteId: string) => Promise<ApiOrder>;
}

export const useOrdersStore = create<OrdersStore>((set, get) => ({
  orders: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await ordersApi.list({ limit: 100 });
      set({ orders: result.data, loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createFromQuote: async (quoteId) => {
    const order = await ordersApi.create({ quoteId });
    set((state) => ({ orders: [order, ...state.orders] }));
    return order;
  },
}));
