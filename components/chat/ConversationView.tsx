"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatParticipant } from '@/types/chat-v2';
import { useChat, useTypingUsers, useMessagePagination } from '@/hooks/useChatV2';
import { useChatStoreV2 } from '@/stores/chatStoreV2';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import ChatConversationSkeleton from './ChatConversationSkeleton';

interface ConversationViewProps {
  readonly participant?: ChatParticipant | null;
  readonly className?: string;
  readonly onBack?: () => void;
}

export function ConversationView({ participant, className, onBack }: ConversationViewProps) {
  const currentUserId = useChatStoreV2((s) => s.currentUserId);
  const {
    activeConversation,
    isLoading,
    sendMessage,
    updateMessage,
    deleteMessage,
  } = useChat();
  const { messages: paginatedMessages, hasMore, isLoadingMore, loadMore } = useMessagePagination(activeConversation?.id || null);
  const typingUsers = useTypingUsers();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const otherParticipant = activeConversation?.participants.find((p) => p.id !== currentUserId) || participant || null;

  const handleSendMessage = async (content: string) => {
    if (!otherParticipant) return;

    if (editingMessage) {
      await updateMessage(editingMessage.id, { content });
      setEditingMessage(null);
      return;
    }

    await sendMessage({
      recipientId: otherParticipant.id,
      content,
      replyToId: replyingTo?.id,
    });
    setReplyingTo(null);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <ChatHeader
        conversation={activeConversation || null}
        typingUsers={typingUsers}
        participant={participant || otherParticipant || undefined}
        onClose={onBack}
      />

      {/* Messages */}
      {isLoading && (paginatedMessages?.length || 0) === 0 ? (
        <ChatConversationSkeleton className="h-full" />
      ) : (
        <ChatMessageList
          messages={paginatedMessages}
          onEditMessage={setEditingMessage}
          onDeleteMessage={deleteMessage}
          onReplyMessage={setReplyingTo}
          onLoadMore={() => activeConversation && loadMore()}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          className="flex-1"
        />
      )}

      {/* Input */}
      <ChatMessageInput
        onSendMessage={handleSendMessage}
        onCancelEdit={() => setEditingMessage(null)}
        editingMessage={editingMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        recipientId={otherParticipant?.id}
        disabled={!otherParticipant}
      />
    </div>
  );
}
