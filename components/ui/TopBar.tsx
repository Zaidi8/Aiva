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
import { Badge } from './badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { motion } from 'motion/react';
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
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl text-[#333333]">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {actionButton}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative hover:bg-gray-100 transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EB5757] text-white text-xs">
                    {unread > 9 ? '9+' : unread}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-[#333333]">Notifications</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {loading
                    ? 'Loading…'
                    : unread > 0
                      ? `You have ${unread} unread notification${unread !== 1 ? 's' : ''}`
                      : 'You are all caught up.'}
                </p>
              </div>
              <ScrollArea className="max-h-[400px]">
                {items.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    No notifications yet. They will appear here as the AI
                    receptionist sends confirmations and reminders.
                  </div>
                ) : (
                  items.map((notification, index) => (
                    <div key={notification.id}>
                      <DropdownMenuItem className="flex flex-col items-start p-4 cursor-pointer">
                        <div className="flex items-start justify-between w-full mb-1">
                          <p className="font-medium text-sm text-[#333333]">
                            {notification.type} · {notification.patient.fullName}
                          </p>
                          {(notification.status === 'Pending' ||
                            notification.status === 'Failed') && (
                            <div className="w-2 h-2 bg-[#2F80ED] rounded-full mt-1 ml-2 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
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
    </motion.div>
  );
}
