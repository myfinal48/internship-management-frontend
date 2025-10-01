/**
 * WebSocket/STOMP service for real-time chat communication
 * This service is modular and can be easily integrated into any React/Next.js project
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { 
  ChatMessage, 
  TypingIndicator, 
  PresenceStatus, 
  ReadReceipt, 
  DeleteNotification,
  SendMessageRequest,
  ChatConfig 
} from '@/types/chat-v2';

export type MessageHandler = (message: ChatMessage) => void;
export type TypingHandler = (indicator: TypingIndicator) => void;
export type PresenceHandler = (status: PresenceStatus) => void;
export type ReadReceiptHandler = (receipt: ReadReceipt) => void;
export type DeleteHandler = (notification: DeleteNotification) => void;

/**
 * Chat WebSocket Service
 * Handles all real-time communication for the chat module
 */
export class ChatWebSocketService {
  private client: Client | null = null;
  private readonly config: ChatConfig;
  private readonly subscriptions: Map<string, StompSubscription> = new Map();
  private reconnectAttempts = 0;
  private isConnected = false;
  
  // Event handlers
  private readonly messageHandlers: Set<MessageHandler> = new Set();
  private readonly typingHandlers: Set<TypingHandler> = new Set();
  private readonly presenceHandlers: Set<PresenceHandler> = new Set();
  private readonly readReceiptHandlers: Set<ReadReceiptHandler> = new Set();
  private readonly deleteHandlers: Set<DeleteHandler> = new Set();
  
  constructor(config: ChatConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client?.active) {
        resolve();
        return;
      }

      this.client = new Client({
        webSocketFactory: () => new SockJS(this.config.wsUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[STOMP Debug]', str);
          }
        },
        reconnectDelay: this.config.reconnectDelay || 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.client.onConnect = () => {
        console.log('✅ Chat WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupSubscriptions();
        
        // Send connect message
        this.send('/app/chat.connect', {});
        
        resolve();
      };

      this.client.onDisconnect = () => {
        console.log('❌ Chat WebSocket disconnected');
        this.isConnected = false;
        
        // Send disconnect message if still connected
        if (this.client?.active) {
          this.send('/app/chat.disconnect', {});
        }
      };

      this.client.onStompError = (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
        
        if (this.reconnectAttempts === 0) {
          reject(new Error(frame.headers['message'] || 'WebSocket connection failed'));
        }
        
        this.handleReconnect(token);
      };

      this.client.onWebSocketError = (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleReconnect(token);
      };

      this.client.activate();
    });
  }

  /**
   * Setup message subscriptions
   */
  private setupSubscriptions(): void {
    if (!this.client?.active) return;

    // Subscribe to private messages
    const messagesSub = this.client.subscribe('/user/queue/messages', (message: IMessage) => {
      try {
        const chatMessage = JSON.parse(message.body) as ChatMessage;
        this.messageHandlers.forEach(handler => handler(chatMessage));
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    this.subscriptions.set('messages', messagesSub);

    // Subscribe to typing indicators
    if (this.config.enableTypingIndicator) {
      const typingSub = this.client.subscribe('/user/queue/typing', (message: IMessage) => {
        try {
          const indicator = JSON.parse(message.body) as TypingIndicator;
          this.typingHandlers.forEach(handler => handler(indicator));
        } catch (error) {
          console.error('Error parsing typing indicator:', error);
        }
      });
      this.subscriptions.set('typing', typingSub);
    }

    // Subscribe to presence updates
    if (this.config.enablePresence) {
      const presenceSub = this.client.subscribe('/topic/presence', (message: IMessage) => {
        try {
          const status = JSON.parse(message.body) as PresenceStatus;
          this.presenceHandlers.forEach(handler => handler(status));
        } catch (error) {
          console.error('Error parsing presence status:', error);
        }
      });
      this.subscriptions.set('presence', presenceSub);
    }

    // Subscribe to read receipts
    if (this.config.enableReadReceipts) {
      const readSub = this.client.subscribe('/user/queue/read-receipts', (message: IMessage) => {
        try {
          const receipt = JSON.parse(message.body) as ReadReceipt;
          this.readReceiptHandlers.forEach(handler => handler(receipt));
        } catch (error) {
          console.error('Error parsing read receipt:', error);
        }
      });
      this.subscriptions.set('read-receipts', readSub);
    }

    // Subscribe to deletion notifications
    const deleteSub = this.client.subscribe('/user/queue/deletions', (message: IMessage) => {
      try {
        const notification = JSON.parse(message.body) as DeleteNotification;
        this.deleteHandlers.forEach(handler => handler(notification));
      } catch (error) {
        console.error('Error parsing deletion notification:', error);
      }
    });
    this.subscriptions.set('deletions', deleteSub);
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnect(token: string): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(token).catch(console.error);
    }, this.config.reconnectDelay || 5000);
  }

  /**
   * Send a message via WebSocket
   */
  send(destination: string, body: unknown): void {
    if (!this.client?.active) {
      console.error('WebSocket is not connected');
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  /**
   * Send a chat message
   */
  sendMessage(request: SendMessageRequest): void {
    this.send('/app/chat.send', request);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(recipientId: number, isTyping: boolean): void {
    if (!this.config.enableTypingIndicator) return;
    
    this.send('/app/chat.typing', {
      recipientId,
      isTyping,
    });
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(conversationId: number): void {
    if (!this.config.enableReadReceipts) return;
    
    this.send('/app/chat.read', {
      conversationId,
    });
  }

  /**
   * Send delete notification
   */
  sendDeleteNotification(messageId: number): void {
    this.send('/app/chat.delete', {
      messageId,
    });
  }

  /**
   * Subscribe to conversation-specific events
   */
  subscribeToConversation(conversationId: number): void {
    if (!this.client?.active) return;

    const key = `conversation-${conversationId}`;
    
    // Unsubscribe from existing subscription if any
    this.unsubscribeFromConversation(conversationId);

    // Subscribe to conversation-specific read receipts
    const readSub = this.client.subscribe(
      `/topic/conversation/${conversationId}/read`,
      (message: IMessage) => {
        try {
          const receipt = JSON.parse(message.body) as ReadReceipt;
          this.readReceiptHandlers.forEach(handler => handler(receipt));
        } catch (error) {
          console.error('Error parsing conversation read receipt:', error);
        }
      }
    );
    
    this.subscriptions.set(key, readSub);
  }

  /**
   * Unsubscribe from conversation-specific events
   */
  unsubscribeFromConversation(conversationId: number): void {
    const key = `conversation-${conversationId}`;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Register event handlers
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onPresence(handler: PresenceHandler): () => void {
    this.presenceHandlers.add(handler);
    return () => this.presenceHandlers.delete(handler);
  }

  onReadReceipt(handler: ReadReceiptHandler): () => void {
    this.readReceiptHandlers.add(handler);
    return () => this.readReceiptHandlers.delete(handler);
  }

  onDelete(handler: DeleteHandler): () => void {
    this.deleteHandlers.add(handler);
    return () => this.deleteHandlers.delete(handler);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    // Notify presence offline before tearing down the connection
    try {
      if (this.client?.active) {
        this.send('/app/chat.disconnect', {});
      }
    } catch {}

    // Clear all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();

    // Clear all handlers
    this.messageHandlers.clear();
    this.typingHandlers.clear();
    this.presenceHandlers.clear();
    this.readReceiptHandlers.clear();
    this.deleteHandlers.clear();

    // Deactivate client
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.isConnected = false;
    console.log('Chat WebSocket disconnected');
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected && this.client?.active === true;
  }
}

// Singleton instance
let chatWebSocketInstance: ChatWebSocketService | null = null;

/**
 * Get or create chat WebSocket service instance
 */
export function getChatWebSocketService(config?: ChatConfig): ChatWebSocketService {
  if (!chatWebSocketInstance && config) {
    chatWebSocketInstance = new ChatWebSocketService(config);
  }
  
  if (!chatWebSocketInstance) {
    throw new Error('Chat WebSocket service not initialized. Please provide config.');
  }
  
  return chatWebSocketInstance;
}

/**
 * Reset chat WebSocket service instance
 */
export function resetChatWebSocketService(): void {
  if (chatWebSocketInstance) {
    chatWebSocketInstance.disconnect();
    chatWebSocketInstance = null;
  }
}
