"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, MessageCircle, Users } from 'lucide-react';
import { ChatParticipant } from '@/types/chat-v2';
import { useEligibleParticipants } from '@/hooks/useChatV2';

interface ChatNewConversationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectParticipant: (participant: ChatParticipant) => void;
}

export function ChatNewConversation({
  open,
  onOpenChange,
  onSelectParticipant,
}: ChatNewConversationProps) {
  const { participants } = useEligibleParticipants();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter participants based on search
  const filteredParticipants = participants.filter(p => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(searchLower) ||
      p.username.toLowerCase().includes(searchLower) ||
      p.email.toLowerCase().includes(searchLower)
    );
  });

  const getParticipantInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSelectParticipant = (participant: ChatParticipant) => {
    onSelectParticipant(participant);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Nouvelle conversation
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une personne avec qui démarrer une conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Participants list */}
          <ScrollArea className="h-[300px] pr-4">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? "Aucun résultat trouvé" 
                    : "Aucun participant disponible"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => handleSelectParticipant(participant)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`/api/avatar/${participant.id}`} />
                          <AvatarFallback className="text-sm">
                            {getParticipantInitials(participant.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        {participant.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">
                            {participant.fullName}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {participant.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </p>
                      </div>

                      {/* Status */}
                      {participant.isOnline && (
                        <Badge variant="outline" className="text-xs">
                          En ligne
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
