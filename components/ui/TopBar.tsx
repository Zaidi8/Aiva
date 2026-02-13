import { Bell, Settings } from 'lucide-react';
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
import { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  description?: string;
  onNotificationsClick?: () => void;
  notificationCount?: number;
  actionButton?: ReactNode;
}

const mockNotifications = [
  {
    id: '1',
    title: 'New Appointment Booked',
    description: 'John Smith booked for 3:00 PM today',
    time: '5 minutes ago',
    unread: true,
  },
  {
    id: '2',
    title: 'Appointment Cancelled',
    description: 'Sarah Johnson cancelled appointment',
    time: '1 hour ago',
    unread: true,
  },
  {
    id: '3',
    title: 'New Chat Message',
    description: 'Patient inquiry about clinic hours',
    time: '2 hours ago',
    unread: false,
  },
  {
    id: '4',
    title: 'Appointment Reminder',
    description: 'Michael Davis appointment in 30 minutes',
    time: '3 hours ago',
    unread: false,
  },
  {
    id: '5',
    title: 'Patient Check-in',
    description: 'Emily Wilson checked in for appointment',
    time: '4 hours ago',
    unread: false,
  },
];

export function TopBar({ title, description, onNotificationsClick, notificationCount = 0, actionButton }: TopBarProps) {
  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl text-[#333333]">{title}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {actionButton}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative hover:bg-gray-100 transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EB5757] text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-[#333333]">Notifications</h3>
                <p className="text-xs text-gray-500 mt-1">
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
              <ScrollArea className="max-h-[400px]">
                {mockNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <DropdownMenuItem className="flex flex-col items-start p-4 cursor-pointer">
                      <div className="flex items-start justify-between w-full mb-1">
                        <p className="font-medium text-sm text-[#333333]">{notification.title}</p>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-[#2F80ED] rounded-full mt-1 ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{notification.description}</p>
                      <p className="text-xs text-gray-400">{notification.time}</p>
                    </DropdownMenuItem>
                    {index < mockNotifications.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
              </ScrollArea>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" className="w-full text-sm text-[#2F80ED] hover:bg-gray-100">
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}