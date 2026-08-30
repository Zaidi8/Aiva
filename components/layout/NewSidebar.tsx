'use client';

import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UsersRound,
  Stethoscope,
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
import Link from "next/link";
import type { PageType } from "@/types";
import { AivaLogo } from "../ui/AivaLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "../ui/utils";
import { signout } from "@/app/(auth)/actions";

// Every nav item maps 1:1 to a top-level route.
const hrefFor = (id: PageType) => `/${id}`;

export interface SidebarUserProfile {
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface SidebarProps {
  currentPage: PageType;
  userProfile: SidebarUserProfile;
}

// Built once at module-load time. NODE_ENV is set at build time so this
// flips correctly in `next build` vs `next dev`.
const isDev = process.env.NODE_ENV !== "production";

const mainMenuItems = [
  { id: "dashboard" as PageType, label: "Dashboard", icon: LayoutDashboard },
  { id: "appointments" as PageType, label: "Appointments", icon: Calendar },
  { id: "patients" as PageType, label: "Patient Records", icon: Users },
  { id: "doctors" as PageType, label: "Doctors", icon: Stethoscope },
  { id: "team" as PageType, label: "Team", icon: UsersRound },
  { id: "ai-receptionist" as PageType, label: "AI Receptionist", icon: Phone },
  { id: "analytics" as PageType, label: "Analytics", icon: BarChart3 },
  // UI Kit is a developer-facing showcase; hidden from real users in production
  // builds. The route stays — visit /ui-kit directly to reach it.
  ...(isDev
    ? [{ id: "ui-kit" as PageType, label: "UI Kit", icon: Palette }]
    : []),
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function NewSidebar({ currentPage, userProfile }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      isCollapsed && "justify-center px-0",
    );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen((v) => !v)}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        className="fixed left-4 top-4 z-50 inline-flex size-10 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-lg transition-colors hover:text-white lg:hidden"
      >
        {isMobileMenuOpen ? (
          <X className="size-5" />
        ) : (
          <Menu className="size-5" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar rail */}
      <aside
        className={cn(
          "relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "fixed inset-y-0 left-0 z-40 lg:static",
          "transition-[width,transform] duration-200 ease-out",
          isCollapsed ? "w-[76px]" : "w-64",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header: logo only (collapse toggle lives at the bottom) */}
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b border-sidebar-border px-4",
            isCollapsed && "justify-center px-0",
          )}
        >
          <AivaLogo className="size-9 shrink-0" />
          {!isCollapsed && (
            <span className="text-lg font-semibold tracking-tight text-white">
              Aiva
            </span>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Menu
            </p>
          )}
          <ul className="space-y-1">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={hrefFor(item.id)}
                    prefetch
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={navLinkClass(isActive)}
                  >
                    <Icon className="size-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Floating collapse / expand toggle — circular icon on the sidebar's
            right edge, sitting just above the Settings/profile footer. */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 bottom-40 z-10 hidden size-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent hover:text-white lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>

        {/* Bottom: settings + profile */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <Link
            href={hrefFor("settings")}
            prefetch
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={currentPage === "settings" ? "page" : undefined}
            title={isCollapsed ? "Settings" : undefined}
            className={navLinkClass(currentPage === "settings")}
          >
            <Settings className="size-5 shrink-0" />
            {!isCollapsed && <span className="truncate">Settings</span>}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-0",
                )}
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={userProfile.avatar ?? ""} />
                  <AvatarFallback className="bg-sidebar-primary text-sm font-medium text-white">
                    {initials(userProfile.name)}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {userProfile.name}
                    </p>
                    <p className="truncate text-xs text-sidebar-foreground/70">
                      {userProfile.role}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-foreground">
                  {userProfile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=profile">
                  <User className="size-4" />
                  Profile settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signout}>
                <DropdownMenuItem
                  variant="destructive"
                  asChild
                  className="cursor-pointer"
                >
                  <button type="submit" className="w-full">
                    <LogOut className="size-4" />
                    Log out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
