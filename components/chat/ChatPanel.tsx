"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChatParticipant } from '@/types/chat-v2';
import { useChatStoreV2 } from '@/stores/chatStoreV2';
import { useToast } from '@/hooks/use-toast';
import { ParticipantList } from './ParticipantList';
import { ConversationView } from './ConversationView';
import ChatConversationSkeleton from './ChatConversationSkeleton';

interface ChatPanelProps {
  className?: string;
}

const ChatPanel = ({ className }: ChatPanelProps) => {
  const store = useChatStoreV2();
  const setChatOpen = useChatStoreV2((s) => s.setChatOpen);
  const activeConversationId = useChatStoreV2((s) => s.activeConversationId);
  const markAsRead = useChatStoreV2((s) => s.markAsRead);
  const { toast } = useToast();
  const [view, setView] = useState<'participants' | 'conversation'>('participants');
  const [selectedParticipant, setSelectedParticipant] = useState<ChatParticipant | null>(null);
  const [isLoadingConv, setIsLoadingConv] = useState(false);

  // Consider the chat visible while this panel is mounted (page/full view)
  useEffect(() => {
    setChatOpen(true);
    return () => setChatOpen(false);
  }, [setChatOpen]);

  // Once visible, if there is already an active conversation, mark it as read once
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
    // run when activeConversationId changes
  }, [activeConversationId, markAsRead]);

  const handleSelectParticipant = async (participant: ChatParticipant) => {
    setSelectedParticipant(participant);
    setIsLoadingConv(true);
    try {
      store.setActiveConversation(null);
      await store.getOrCreateConversation(participant.id);
      setView('conversation');
    } catch (e) {
      console.error('Failed to load conversation:', e);
      setView('participants');
      toast({
        title: 'Failed to load conversation',
        description: 'Unable to start a conversation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConv(false);
    }
  };

  return (
    <div className={cn('relative h-full flex flex-col bg-background', className)}>
      {isLoadingConv ? (
        <ChatConversationSkeleton className="h-full" />
      ) : view === 'participants' ? (
        <ParticipantList onSelect={handleSelectParticipant} className="h-full" />
      ) : (
        <ConversationView
          participant={selectedParticipant}
          className="h-full"
          onBack={() => {
            setView('participants');
            setSelectedParticipant(null);
            store.setActiveConversation(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatPanel;
