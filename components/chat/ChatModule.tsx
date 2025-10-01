"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChatConversationList } from './ChatConversationList';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import { ChatNewConversation } from './ChatNewConversation';
import { EmptyState } from '@/components/global/empty-state';
import { LoadingContent } from '@/components/global/loading-content';
import { MessageCircle } from 'lucide-react';
import { 
  useChat,
  useActiveConversation,
  useTypingUsers,
} from '@/hooks/useChatV2';
import { useChatStoreV2 } from '@/stores/chatStoreV2';
import { ChatParticipant, SendMessageRequest, ChatMessage, TypingIndicator } from '@/types/chat-v2';
import { useToast } from '@/hooks/use-toast';

interface ChatModuleProps {
  readonly className?: string;
  readonly defaultView?: 'list' | 'conversation';
  readonly compactMode?: boolean;
}

export function ChatModule({ 
  className,
  defaultView = 'list',
  compactMode = false 
}: ChatModuleProps) {
  const { toast } = useToast();
  const store = useChatStoreV2();
  const {
    conversations,
    messages,
    isLoading,
    error,
    sendMessage,
    updateMessage,
    deleteMessage,
    setActiveConversation,
    loadMoreMessages,
  } = useChat();

  const activeConversation = useActiveConversation();
  const typingUsers: TypingIndicator[] = useTypingUsers();
  
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>(defaultView);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive",
      });
      store.clearError();
    }
  }, [error, toast, store]);

  // Handle new conversation participant selection
  const handleSelectParticipant = async (participant: ChatParticipant) => {
    try {
      await store.getOrCreateConversation(participant.id);
      setMobileView('conversation');
    } catch (err) {
      console.error("Failed to create conversation:", err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de créer la conversation",
        variant: "destructive",
      });
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: number) => {
    setActiveConversation(conversationId);
    setMobileView('conversation');
  };

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;

    const otherParticipant = activeConversation.participants.find(
      p => p.id !== store.activeConversationId
    );
    
    if (!otherParticipant) return;

    const request: SendMessageRequest = {
      recipientId: otherParticipant.id,
      content,
      replyToId: replyingTo?.id,
    };

    if (editingMessage) {
      await updateMessage(editingMessage.id, { content });
      setEditingMessage(null);
    } else {
      await sendMessage(request);
      setReplyingTo(null);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès",
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast({
        title: `Erreur`,
        description: err instanceof Error ? err.message : "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  // Handle edit message
  const handleEditMessage = (message: ChatMessage) => {
    setEditingMessage(message);
    setReplyingTo(null);
  };

  // Handle reply message
  const handleReplyMessage = (message: ChatMessage) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  // Handle close conversation (mobile)
  const handleCloseConversation = () => {
    setMobileView('list');
  };

  // Render empty state
  if (!isLoading && conversations.length === 0 && !compactMode) {
    return (
      <Card className={cn("flex items-center justify-center h-[80vh]", className)}>
        <EmptyState
          icon={MessageCircle}
          title="Aucune conversation"
          description="Commencez une nouvelle conversation pour échanger avec d'autres utilisateurs"
          action={{
            label: "Nouvelle conversation",
            onClick: () => setShowNewConversation(true),
          }}
        />
        <ChatNewConversation
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          onSelectParticipant={handleSelectParticipant}
        />
      </Card>
    );
  }

  // Loading state
  if (isLoading && conversations.length === 0) {
    return (
      <Card className={cn("flex items-center justify-center h-[80vh]", className)}>
        <LoadingContent loadingText="Chargement des conversations..." />
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "flex h-[80vh] overflow-hidden",
        compactMode && "h-[65vh]",
        className
      )}>
        {/* Desktop layout */}
        <div className="hidden lg:flex w-full">
          {/* Conversations list */}
          <ChatConversationList
            activeConversationId={store.activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={() => setShowNewConversation(true)}
            className="w-72 flex-shrink-0"
          />

          {/* Conversation area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                <ChatHeader
                  conversation={activeConversation}
                  typingUsers={typingUsers}
                />
                <ChatMessageList
                  messages={messages}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onReplyMessage={handleReplyMessage}
                  onLoadMore={() => loadMoreMessages(activeConversation.id)}
                  hasMore={messages.length >= 50}
                  className="flex-1"
                />
                <ChatMessageInput
                  onSendMessage={handleSendMessage}
                  onCancelEdit={() => setEditingMessage(null)}
                  editingMessage={editingMessage}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  recipientId={activeConversation.participants[0]?.id}
                  disabled={!activeConversation}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={MessageCircle}
                  title="Sélectionnez une conversation"
                  description="Choisissez une conversation dans la liste ou démarrez-en une nouvelle"
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex lg:hidden w-full">
          {mobileView === 'list' ? (
            <ChatConversationList
              activeConversationId={store.activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={() => setShowNewConversation(true)}
              className="w-full"
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {activeConversation ? (
                <>
                  <ChatHeader
                    conversation={activeConversation}
                    typingUsers={typingUsers}
                    onClose={handleCloseConversation}
                  />
                  <ChatMessageList
                    messages={messages}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onReplyMessage={handleReplyMessage}
                    onLoadMore={() => loadMoreMessages(activeConversation.id)}
                    hasMore={messages.length >= 50}
                    className="flex-1"
                  />
                  <ChatMessageInput
                    onSendMessage={handleSendMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    editingMessage={editingMessage}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    recipientId={activeConversation.participants[0]?.id}
                    disabled={!activeConversation}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={MessageCircle}
                    title="Aucune conversation sélectionnée"
                    description="Retournez à la liste pour sélectionner une conversation"
                    action={{
                      label: "Retour",
                      onClick: handleCloseConversation,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* New conversation dialog */}
      <ChatNewConversation
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onSelectParticipant={handleSelectParticipant}
      />
    </>
  );
}
