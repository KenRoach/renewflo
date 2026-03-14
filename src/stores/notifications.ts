import { create } from "zustand";
import { notifications as notifApi, type ApiNotification } from "@/services/gateway";

interface NotificationsStore {
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await notifApi.list({ limit: 100 });
      const unreadCount = result.data.filter((n) => !n.read).length;
      set({ notifications: result.data, unreadCount, loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  markRead: async (id) => {
    await notifApi.markRead(id);
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
  },

  markAllRead: async () => {
    await notifApi.markAllRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
