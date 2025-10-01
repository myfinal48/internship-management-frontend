"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/layout";
import { NotificationsModal } from "@/components/layout/notifications-modal";
import type { AuthSession } from "@/types/next-auth";
import { ModeToggle, Logo } from "@/components/global";
import { useNotificationStore } from "@/stores/notificationStore";
import { notificationWebSocket } from "@/lib/notification-websocket";
import { useState, useEffect } from "react";
import { ChatButton } from "@/components/chat";

interface NavbarProps {
  session: AuthSession;
}

export function Navbar({ session }: Readonly<NavbarProps>) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userIdStr = session?.user?.id;
  const userRole = session?.user?.role;
  const userId = userIdStr ? parseInt(userIdStr, 10) : undefined;

  const showChatButton = userRole === 'STUDENT' || userRole === 'COMPANY';

  // Use the notification store for real-time updates
  const { unreadNotifications, fetchUserNotifications } = useNotificationStore();

  // Connect WebSocket and fetch initial notifications
  useEffect(() => {
    if (userId) {
      notificationWebSocket.connect(userId);
      fetchUserNotifications(userId, 'UNREAD');
    }
  }, [userId, fetchUserNotifications]);

  const unreadCount = unreadNotifications.length;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex flex-1 items-center justify-between gap-2 px-4">
          <Logo />
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Rechercher..." className="pl-8" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showChatButton && (
              <ChatButton variant="icon" size="md" />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
            <ModeToggle />
            <UserNav session={session} />
          </div>
        </div>
      </header>

      {userId && (
        <NotificationsModal
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          userId={userId}
        />
      )}
    </>
  );
}
