"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { ChatConversation, TypingIndicator, ChatParticipant } from '@/types/chat-v2';
import { useOnlineUsers, useChatStoreV2 } from '@/stores/chatStoreV2';

interface ChatHeaderProps {
  conversation: ChatConversation | null;
  typingUsers: TypingIndicator[];
  onClose?: () => void;
  className?: string;
  participant?: ChatParticipant;
}

export function ChatHeader({
  conversation,
  typingUsers,
  onClose,
  className,
  participant,
}: ChatHeaderProps) {
  const onlineUsers = useOnlineUsers();
  const currentUserId = useChatStoreV2((s) => s.currentUserId);

  if (!conversation) {
    return (
      <div className={cn("h-16 border-b bg-background flex items-center justify-center", className)}>
        <p className="text-muted-foreground">Sélectionnez une conversation</p>
      </div>
    );
  }

  // Determine which participant to display (selected participant overrides conversation logic)
  const displayParticipant = participant
    || (conversation ? (conversation.participants.find(p => p.id !== currentUserId) || conversation.participants[0]) : null);
  const isOnline = displayParticipant && onlineUsers.has(displayParticipant.id);
  
  // Check if the other user is typing
  const isTyping = typingUsers.some(t => t.senderId === displayParticipant?.id);

  const getParticipantInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn("h-14 border-b bg-background", className)}>
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
              aria-label="Retour"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/api/avatar/${displayParticipant?.id}`} />
              <AvatarFallback className="text-sm">
                {displayParticipant ? getParticipantInitials(displayParticipant.fullName) : '?'}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>

          {/* User info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {displayParticipant?.fullName || 'Utilisateur'}
              </h3>
              {displayParticipant?.role && (
                <Badge variant="secondary" className="text-xs">
                  {displayParticipant.role}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="flex items-center gap-1">
                  <span className="animate-pulse">{"En train d'écrire"}</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </span>
              ) : isOnline ? (
                'En ligne'
              ) : (
                'Hors ligne'
              )}
            </p>
          </div>
        </div>
        {/* Right section intentionally minimal (remove unimplemented actions) */}
        <div className="flex items-center gap-1" />
      </div>
    </div>
  );
}
