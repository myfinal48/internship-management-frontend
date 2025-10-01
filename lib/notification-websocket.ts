import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { NotificationDTO } from "@/types";
import { useNotificationStore } from "@/stores/notificationStore";
import { toast } from "sonner";

interface NotificationMessage {
  action?: 'UPDATE' | 'ARCHIVE' | 'ARCHIVE_ALL';
  notification?: NotificationDTO;
  notificationIds?: number[];
}

interface GlobalMessage {
  action: string;
  id?: number;
}

class NotificationWebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;

  connect(userId: number) {
    if (this.client?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    const socketFactory = () => new SockJS(`${process.env.NEXT_PUBLIC_WS_URL}`);

    this.client = new Client({
      webSocketFactory: socketFactory as () => WebSocket,
      debug: (msg) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[NotificationWS]', msg);
        }
      },
      reconnectDelay: this.reconnectDelay,
      onConnect: () => {
        console.log('Notification WebSocket connected');
        this.reconnectAttempts = 0;
        this.subscribeToUserNotifications(userId);
        this.subscribeToGlobalNotifications();
      },
      onStompError: (frame) => {
        console.error('Notification WebSocket error:', frame.headers['message']);
        this.handleError(frame.headers['message']);
      },
      onWebSocketClose: () => {
        console.log('Notification WebSocket closed');
        this.handleDisconnect();
      }
    });

    this.client.activate();
  }

  private subscribeToUserNotifications(userId: number) {
    if (!this.client?.connected) return;

    const destination = `/topic/notifications/${userId}`;
    
    // Unsubscribe if already subscribed
    if (this.subscriptions.has(destination)) {
      this.subscriptions.get(destination)?.unsubscribe();
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.handleNotificationMessage(data);
      } catch (error) {
        console.error('Error parsing notification message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  private subscribeToGlobalNotifications() {
    if (!this.client?.connected) return;

    const destination = `/topic/notifications/global`;
    
    if (this.subscriptions.has(destination)) {
      this.subscriptions.get(destination)?.unsubscribe();
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.handleGlobalMessage(data);
      } catch (error) {
        console.error('Error parsing global message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  private isNotificationMessage(data: NotificationMessage | NotificationDTO): data is NotificationMessage {
    return 'action' in data && data.action !== undefined;
  }

  private handleNotificationMessage(data: NotificationMessage | NotificationDTO) {
    const store = useNotificationStore.getState();
    
    // Type guard: if it has an action property, it's a NotificationMessage
    if (this.isNotificationMessage(data)) {
      const message = data;
      switch (message.action) {
        case 'UPDATE':
          if (message.notification) {
            store.updateNotification(message.notification);
            
            // Don't show toast for individual archive - it's already handled by the UI
          }
          break;
        
        case 'ARCHIVE':
          if (message.notification) {
            store.updateNotification({ ...message.notification, status: 'ARCHIVED' });
            // Don't show toast for individual archive - it's already handled by the UI
          }
          break;
        
        case 'ARCHIVE_ALL':
          if (message.notificationIds) {
            // Update all notifications to archived status
            message.notificationIds.forEach((id: number) => {
              const notification = store.unreadNotifications.find(n => n.id === id);
              if (notification) {
                store.updateNotification({ ...notification, status: 'ARCHIVED' });
              }
            });
            toast.success('Toutes les notifications ont été archivées');
          }
          break;
      }
    } else {
      store.addNotification(data);
      
      toast.info(`${data.subject}: ${data.content}`);
    }
  }

  private handleGlobalMessage(data: GlobalMessage) {
    const store = useNotificationStore.getState();
    
    if (data.action === 'DELETE' && data.id) {
      store.removeNotification(data.id);
    }
  }

  private handleError(error: string) {
    console.error('Notification WebSocket error:', error);
    toast.error('Erreur de connexion aux notifications');
  }

  private handleDisconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    }
  }

  disconnect() {
    if (this.client) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

export const notificationWebSocket = new NotificationWebSocketService();
