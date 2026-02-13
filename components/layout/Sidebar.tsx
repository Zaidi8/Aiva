import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Bot, 
  Bell, 
  BarChart3, 
  Settings, 
  LogOut,
  Palette,
  Menu,
  X
} from 'lucide-react';
import type { PageType } from "@/types";
import { AivaLogo } from '../ui/AivaLogo';
import { useState } from 'react';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard' as PageType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments' as PageType, label: 'Appointments', icon: Calendar },
  { id: 'patients' as PageType, label: 'Patient Records', icon: Users },
  { id: 'ai-receptionist' as PageType, label: 'AI Receptionist', icon: Bot },
  { id: 'notifications' as PageType, label: 'Notifications', icon: Bell },
  { id: 'analytics' as PageType, label: 'Analytics', icon: BarChart3 },
  { id: 'settings' as PageType, label: 'Settings', icon: Settings },
  { id: 'ui-kit' as PageType, label: 'UI Kit', icon: Palette },
];

export function Sidebar({ currentPage, onNavigate, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-[#333333]" />
        ) : (
          <Menu className="w-6 h-6 text-[#333333]" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-gray-200 flex flex-col
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AivaLogo className="w-10 h-10" />
            <div>
              <h1 className="text-[#333333] text-lg">Aiva</h1>
              <p className="text-xs text-gray-500">AI Virtual Assistant</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#2F80ED] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}