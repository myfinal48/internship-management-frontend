"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationDTO } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Archive, ArchiveX } from "lucide-react";
import { useEffect } from "react";
import { notificationWebSocket } from "@/lib/notification-websocket";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export function NotificationsModal({ open, onOpenChange, userId }: NotificationsModalProps) {
  const {
    unreadNotifications,
    archivedNotifications,
    loading,
    fetchUserNotifications,
    archiveNotification,
    archiveAllUnread
  } = useNotificationStore();

  // Connect WebSocket on component mount
  useEffect(() => {
    if (userId) {
      notificationWebSocket.connect(userId);
      fetchUserNotifications(userId, 'UNREAD');
      fetchUserNotifications(userId, 'ARCHIVED');
    }
    
    return () => {
      // Keep connection alive - don't disconnect on unmount
    };
  }, [userId, fetchUserNotifications]);

  // Refresh data when modal opens
  useEffect(() => {
    if (open && userId) {
      fetchUserNotifications(userId, 'UNREAD');
      fetchUserNotifications(userId, 'ARCHIVED');
    }
  }, [open, userId, fetchUserNotifications]);

  const handleArchive = (notificationId: number) => {
    archiveNotification(notificationId, userId);
  };

  const handleArchiveAll = () => {
    archiveAllUnread(userId);
  };

  const NotificationItem = ({ notification, showArchive = false }: { notification: NotificationDTO; showArchive?: boolean }) => (
    <div className="p-4 border-b last:border-b-0 hover:bg-muted/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{notification.subject}</h4>
            <Badge variant="secondary" className="text-xs">
              {notification.type.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{notification.content}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { 
              addSuffix: true, 
              locale: fr 
            })}
          </p>
        </div>
        {showArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleArchive(notification.id)}
            disabled={loading}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Actives ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archivées ({archivedNotifications.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            {unreadNotifications.length > 0 && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchiveAll}
                  disabled={loading}
                >
                  <ArchiveX className="h-4 w-4 mr-2" />
                  Archiver tout
                </Button>
              </div>
            )}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : unreadNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune notification active
                </div>
              ) : (
                unreadNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    showArchive 
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="archived" className="mt-4">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : archivedNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune notification archivée
                </div>
              ) : (
                archivedNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}