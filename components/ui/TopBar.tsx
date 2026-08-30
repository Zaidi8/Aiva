'use client';

// TopBar — page title + optional action button.
//
// The notification bell is temporarily disabled (the /api/notifications fetch
// was slow and added noise). Re-enable the commented block once notifications
// are wired end-to-end.

import { ReactNode } from 'react';

// Notification-bell imports kept commented out alongside the disabled feature:
//   import { Button } from './button';
//   import { Bell } from 'lucide-react';
//   import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//            DropdownMenuTrigger, DropdownMenuSeparator } from './dropdown-menu';
//   import { ScrollArea } from './scroll-area';
//   import { useEffect, useState } from 'react';
//   import { apiGet } from '@/lib/client/fetcher';

interface TopBarProps {
  title: string;
  description?: string;
  onNotificationsClick?: () => void;
  // Deprecated: notificationCount was used while we still had mockNotifications.
  // Kept on the prop type so legacy callers compile; ignored now.
  notificationCount?: number;
  actionButton?: ReactNode;
}

// Notification model, kept alongside the disabled feature:
// interface NotificationListItem {
//   id: string;
//   type: string;
//   channel: string;
//   status: string;
//   message: string;
//   createdAt: string;
//   patient: { id: string; fullName: string };
// }
//
// interface NotificationListPayload {
//   items: NotificationListItem[];
//   total: number;
//   unread: number;
// }


export function TopBar({ title, description, actionButton }: TopBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {actionButton}

          {/* Notification bell temporarily disabled: the /api/notifications
              fetch was slow and the empty-state adds layout noise. Re-enable
              when notifications are wired end-to-end. */}
          {/* <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground ring-2 ring-card">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading
                    ? 'Loading…'
                    : unread > 0
                      ? `You have ${unread} unread notification${unread !== 1 ? 's' : ''}`
                      : 'You are all caught up.'}
                </p>
              </div>
              <ScrollArea className="max-h-[400px]">
                {items.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet. They will appear here as the AI
                    receptionist sends confirmations and reminders.
                  </div>
                ) : (
                  items.map((notification, index) => (
                    <div key={notification.id}>
                      <DropdownMenuItem className="flex cursor-pointer flex-col items-start p-4">
                        <div className="mb-1 flex w-full items-start justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {notification.type} · {notification.patient.fullName}
                          </p>
                          {(notification.status === 'Pending' ||
                            notification.status === 'Failed') && (
                            <span className="ml-2 mt-1 size-2 flex-shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mb-1 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {relativeTime(notification.createdAt)}
                        </p>
                      </DropdownMenuItem>
                      {index < items.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    </div>
  );
}
