import { create } from "zustand";
import { NotificationDTO } from "@/types";
import { notificationService } from "@/services/notificationService";

interface NotificationState {
  notifications: NotificationDTO[];
  unreadNotifications: NotificationDTO[];
  archivedNotifications: NotificationDTO[];
  loading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: NotificationDTO[]) => void;
  setUnreadNotifications: (notifications: NotificationDTO[]) => void;
  setArchivedNotifications: (notifications: NotificationDTO[]) => void;
  
  // WebSocket actions
  addNotification: (notification: NotificationDTO) => void;
  updateNotification: (notification: NotificationDTO) => void;
  removeNotification: (notificationId: number) => void;
  
  // Service actions
  fetchUserNotifications: (userId: number, status?: string) => Promise<void>;
  markAsRead: (notificationIds: number[], userId: number) => Promise<void>;
  archiveNotification: (notificationId: number, userId: number) => Promise<void>;
  archiveAllUnread: (userId: number) => Promise<void>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadNotifications: [],
  archivedNotifications: [],
  loading: false,
  error: null,

  setNotifications: (notifications) =>
    set({ notifications }),

  setUnreadNotifications: (notifications) =>
    set({ unreadNotifications: notifications }),

  setArchivedNotifications: (notifications) =>
    set({ archivedNotifications: notifications }),

  addNotification: (notification) =>
    set((state) => {
      // Add to unread if status is UNREAD
      if (notification.status === 'UNREAD') {
        return {
          notifications: [...state.notifications, notification],
          unreadNotifications: [...state.unreadNotifications, notification]
        };
      }
      return {
        notifications: [...state.notifications, notification]
      };
    }),

  updateNotification: (notification) =>
    set((state) => {
      const updateInList = (list: NotificationDTO[]) =>
        list.map(n => n.id === notification.id ? notification : n);

      // Remove from unread if status is ARCHIVED
      const newUnreadNotifications = notification.status === 'UNREAD'
        ? updateInList(state.unreadNotifications)
        : state.unreadNotifications.filter(n => n.id !== notification.id);

      // Add to archived if status is ARCHIVED
      const newArchivedNotifications = notification.status === 'ARCHIVED'
        ? state.archivedNotifications.some(n => n.id === notification.id)
          ? updateInList(state.archivedNotifications)
          : [...state.archivedNotifications, notification]
        : state.archivedNotifications.filter(n => n.id !== notification.id);

      return {
        notifications: updateInList(state.notifications),
        unreadNotifications: newUnreadNotifications,
        archivedNotifications: newArchivedNotifications
      };
    }),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadNotifications: state.unreadNotifications.filter(n => n.id !== notificationId),
      archivedNotifications: state.archivedNotifications.filter(n => n.id !== notificationId)
    })),

  fetchUserNotifications: async (userId, status) => {
    set({ loading: true, error: null });
    try {
      if (status === 'UNREAD') {
        const notifications = await notificationService.getNotificationByStatus(userId, 'UNREAD');
        set({ unreadNotifications: notifications });
      } else if (status === 'ARCHIVED') {
        const notifications = await notificationService.getNotificationByStatus(userId, 'ARCHIVED');
        set({ archivedNotifications: notifications });
      } else {
        const notifications = await notificationService.fetchUserNotifications(userId, false);
        set({ notifications });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationIds, userId) => {
    try {
      await notificationService.markNotificationsAsRead({ notificationIds, userId });
      
      // Update local state immediately
      set((state) => ({
        unreadNotifications: state.unreadNotifications.filter(
          n => !notificationIds.includes(n.id)
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  archiveNotification: async (notificationId, userId) => {
    try {
      await notificationService.archiveNotification({ notificationId, userId });
      
      // Move from unread to archived immediately
      set((state) => {
        const notification = state.unreadNotifications.find(n => n.id === notificationId);
        if (notification) {
          return {
            unreadNotifications: state.unreadNotifications.filter(n => n.id !== notificationId),
            archivedNotifications: [...state.archivedNotifications, { ...notification, status: 'ARCHIVED' as const }]
          };
        }
        return state;
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  archiveAllUnread: async (userId) => {
    const state = get();
    const unreadIds = state.unreadNotifications.map(n => n.id);
    
    if (unreadIds.length === 0) return;

    try {
      await notificationService.archiveAllUnread({ userId, notificationIds: unreadIds });
      
      // Move all unread to archived immediately
      set((state) => ({
        unreadNotifications: [],
        archivedNotifications: [
          ...state.archivedNotifications,
          ...state.unreadNotifications.map(n => ({ ...n, status: 'ARCHIVED' as const }))
        ]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
