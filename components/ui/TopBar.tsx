'use client';

// TopBar — page title + notification bell.
//
// The bell fetches from /api/notifications on mount. We deliberately don't
// poll: the dashboard isn't a real-time product yet, and a single fetch is
// enough to surface anything the AI receptionist has dropped into the table
// since the page loaded. router.refresh() on relevant pages will re-render
// the layout and re-fire this effect.
//
// "Unread" maps to the server's `unread` field (notifications with status
// Pending or Failed). When the count is 0 we still render the bell but with
// no badge — same shape as the AI Receptionist page's empty state.

import { Bell } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { ScrollArea } from './scroll-area';
import { ReactNode, useEffect, useState } from 'react';
import { apiGet } from '@/lib/client/fetcher';

interface TopBarProps {
  title: string;
  description?: string;
  onNotificationsClick?: () => void;
  // Deprecated: notificationCount was used while we still had mockNotifications.
  // Kept on the prop type so legacy callers compile; we ignore it and read
  // the unread count from the API on mount instead.
  notificationCount?: number;
  actionButton?: ReactNode;
}

interface NotificationListItem {
  id: string;
  type: string;
  channel: string;
  status: string;
  message: string;
  createdAt: string;
  patient: { id: string; fullName: string };
}

interface NotificationListPayload {
  items: NotificationListItem[];
  total: number;
  unread: number;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.floor((now - t) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function TopBar({ title, description, actionButton }: TopBarProps) {
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `loading` defaults to true via useState so we don't set it again here —
    // a synchronous setState inside an effect would trigger the
    // react-hooks/set-state-in-effect rule. The async callbacks below do
    // their own state writes once data lands.
    let cancelled = false;
    apiGet<NotificationListPayload>('/api/notifications?take=10')
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => {
        if (cancelled) return;
        // Silent: don't surface every bell-fetch failure as a toast.
        setItems([]);
        setUnread(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

          <DropdownMenu>
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
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
