import { create } from "zustand";
import { support as supportApi, type ApiTicket, type CreateTicketBody } from "@/services/gateway";

interface SupportStore {
  tickets: ApiTicket[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  createTicket: (body: CreateTicketBody) => Promise<ApiTicket>;
  escalateTicket: (id: string) => Promise<void>;
}

export const useSupportStore = create<SupportStore>((set, get) => ({
  tickets: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await supportApi.list({ limit: 100 });
      set({ tickets: result.data, loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createTicket: async (body) => {
    const ticket = await supportApi.create(body);
    set((state) => ({ tickets: [ticket, ...state.tickets] }));
    return ticket;
  },

  escalateTicket: async (id) => {
    const updated = await supportApi.escalate(id);
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === id ? updated : t)),
    }));
  },
}));
