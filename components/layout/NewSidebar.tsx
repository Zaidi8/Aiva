import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Phone,
  BarChart3,
  Settings,
  LogOut,
  Palette,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import type { PageType } from "@/types";
import { AivaLogo } from "../ui/AivaLogo";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar";
import { signout } from "@/app/(auth)/actions";

export interface SidebarUserProfile {
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType, subPage?: string) => void;
  userProfile: SidebarUserProfile;
}

// Built once at module-load time. NODE_ENV is set at build time so this
// flips correctly in `next build` vs `next dev`.
const isDev = process.env.NODE_ENV !== "production";

const mainMenuItems = [
  {
    id: "dashboard" as PageType,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "appointments" as PageType,
    label: "Appointments",
    icon: Calendar,
  },
  {
    id: "patients" as PageType,
    label: "Patient Records",
    icon: Users,
  },
  {
    id: "ai-receptionist" as PageType,
    label: "AI Receptionist",
    icon: Phone,
  },
  {
    id: "analytics" as PageType,
    label: "Analytics",
    icon: BarChart3,
  },
  // UI Kit is a developer-facing component showcase; hide it from real users
  // in production builds. The route itself stays — visit /ui-kit directly to
  // reach it when needed.
  ...(isDev
    ? [{ id: "ui-kit" as PageType, label: "UI Kit", icon: Palette }]
    : []),
];

const bottomMenuItems = [
  {
    id: "settings" as PageType,
    label: "Settings",
    icon: Settings,
  },
];

export function NewSidebar({
  currentPage,
  onNavigate,
  userProfile,
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-[#333333]" />
        ) : (
          <Menu className="w-6 h-6 text-[#333333]" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Collapse/Expand Toggle - Desktop Only */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`hidden lg:flex items-center justify-center fixed z-50 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all ${
          isCollapsed ? "left-[68px]" : "left-[248px]"
        }`}
        style={{ top: "calc(100vh - 180px)" }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        )}
      </motion.button>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 76 : 256 }}
        className={`
          bg-white border-r border-gray-200 flex flex-col
          fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo Section */}
        <div
          className={`p-6 border-b border-gray-200 ${isCollapsed ? "px-3" : ""}`}
        >
          <motion.div
            className="flex items-center gap-3"
            animate={{
              justifyContent: isCollapsed
                ? "center"
                : "flex-start",
            }}
          >
            <AivaLogo className="w-10 h-10 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                >
                  <h1 className="text-[#333333] text-lg whitespace-nowrap">
                    Aiva
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{
                            opacity: 1,
                            width: "auto",
                          }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section - Settings & Profile */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          {/* Settings */}
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-all ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={userProfile.avatar ?? ""} />
                  <AvatarFallback className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white">
                    {userProfile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 text-left overflow-hidden"
                    >
                      <p className="text-sm text-[#333333] truncate">
                        {userProfile.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {userProfile.role}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-[#333333]">
                  {userProfile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {userProfile.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  onNavigate("settings", "profile")
                }
              >
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signout}>
                <DropdownMenuItem asChild className="text-red-600">
                  <button
                    type="submit"
                    className="w-full flex items-center cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>
    </>
  );
}