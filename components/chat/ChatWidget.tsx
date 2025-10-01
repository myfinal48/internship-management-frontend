"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { ChatModule } from './ChatModule';
import { useTotalUnreadCount, useChatConnectionStatus } from '@/hooks/useChatV2';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStoreV2 } from '@/stores/chatStoreV2';

interface ChatWidgetProps {
  readonly position?: 'bottom-right' | 'bottom-left';
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

export function ChatWidget({ 
  position = 'bottom-right',
  defaultOpen = false,
  className 
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const totalUnreadCount = useTotalUnreadCount();
  const { isConnected } = useChatConnectionStatus();
  const setChatOpen = useChatStoreV2((s) => s.setChatOpen);
  const activeConversationId = useChatStoreV2((s) => s.activeConversationId);
  const markAsRead = useChatStoreV2((s) => s.markAsRead);

  // Play notification sound on new messages
  useEffect(() => {
    if (totalUnreadCount > 0 && !isOpen) {
      // Play notification sound
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    }
  }, [totalUnreadCount, isOpen]);

  // Sync chat visibility with store: visible only when open and not minimized
  useEffect(() => {
    const visible = isOpen && !isMinimized;
    setChatOpen(visible);
    // If the chat is now visible and there's an active conversation, mark it as read
    if (visible && activeConversationId) {
      markAsRead(activeConversationId);
    }
    return () => {
      // On unmount, ensure it's marked as not visible
      setChatOpen(false);
    };
  }, [isOpen, isMinimized, setChatOpen, activeConversationId, markAsRead]);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed z-50",
              positionClasses[position],
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg",
                "hover:scale-110 transition-transform"
              )}
            >
              <MessageCircle className="h-6 w-6" />
              {totalUnreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-6 min-w-[24px] px-1.5"
                >
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Badge>
              )}
            </Button>

            {/* Connection status indicator */}
            <div className={cn(
              "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className={cn(
              "fixed z-50",
              isFullscreen ? "inset-4" : cn(
                positionClasses[position],
                "w-[400px] lg:w-[800px]"
              ),
              className
            )}
          >
            <div className={cn(
              "bg-background rounded-lg shadow-2xl border overflow-hidden",
              "flex flex-col",
              isFullscreen ? "h-full" : "h-[600px]",
              isMinimized && "h-14"
            )}>
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Chat</span>
                  {totalUnreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {totalUnreadCount}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Minimize button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  
                  {/* Fullscreen button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setIsOpen(false);
                      setIsMinimized(false);
                      setIsFullscreen(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat content */}
              {!isMinimized && (
                <div className="flex-1 overflow-hidden">
                  <ChatModule compactMode={!isFullscreen} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
