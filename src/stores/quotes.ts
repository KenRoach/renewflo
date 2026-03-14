import { create } from "zustand";
import { quotes as quotesApi, type ApiQuote, type CreateQuoteBody } from "@/services/gateway";

interface QuotesStore {
  quotes: ApiQuote[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  createQuote: (body: CreateQuoteBody) => Promise<ApiQuote>;
  submitQuote: (id: string) => Promise<void>;
  acceptQuote: (id: string) => Promise<void>;
  rejectQuote: (id: string) => Promise<void>;
}

export const useQuotesStore = create<QuotesStore>((set, get) => ({
  quotes: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await quotesApi.list({ limit: 100 });
      set({ quotes: result.data, loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createQuote: async (body) => {
    const quote = await quotesApi.create(body);
    set((state) => ({ quotes: [quote, ...state.quotes] }));
    return quote;
  },

  submitQuote: async (id) => {
    const updated = await quotesApi.submit(id);
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? updated : q)),
    }));
  },

  acceptQuote: async (id) => {
    const updated = await quotesApi.accept(id);
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? updated : q)),
    }));
  },

  rejectQuote: async (id) => {
    const updated = await quotesApi.reject(id);
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? updated : q)),
    }));
  },
}));
