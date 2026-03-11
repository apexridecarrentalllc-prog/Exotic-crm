"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { useUnreadCount } from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  LayoutDashboard,
  Building2,
  Package,
  FileText,
  CreditCard,
  FolderOpen,
  BarChart3,
  Bell,
  Users,
  User,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "ie-manager-sidebar-collapsed";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: true },
  { href: "/users", label: "Users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] as const },
  { href: "/audit-log", label: "Audit Log", icon: History, roles: ["SUPER_ADMIN"] as const },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, hasAnyRole } = useAuth();
  const { companyLogo } = useBranding();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setCollapsedState(stored === "true");
  }, [mounted]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    }
  }, []);

  const filteredNavItems = navItems.filter((item) => {
    if (item.roles && !hasAnyRole([...item.roles])) return false;
    return true;
  });

  const sidebarWidth = collapsed ? "w-16" : "w-[260px]";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col bg-[#3F730A] text-white transition-[width] duration-300 ease-in-out lg:static lg:z-auto",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo / collapse */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-1 border-b border-white/10 px-3">
          <Link
            href="/"
            className={cn(
              "flex items-center overflow-hidden",
              collapsed ? "justify-center w-full min-w-0" : "min-w-0 flex-1"
            )}
          >
            {companyLogo ? (
              collapsed ? (
                <Image
                  src={companyLogo}
                  alt="Company logo"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                  unoptimized
                />
              ) : (
                <Image
                  src={companyLogo}
                  alt="Company logo"
                  width={140}
                  height={36}
                  className="h-8 w-auto max-h-8 object-contain object-left"
                  unoptimized
                />
              )
            ) : collapsed ? (
              <Image
                src="/logo-icon.svg"
                alt="IE Manager"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            ) : (
              <Image
                src="/logo.svg"
                alt="IE Manager"
                width={140}
                height={36}
                className="h-8 w-auto max-h-8 object-contain object-left"
                priority
              />
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:flex text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {filteredNavItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            const count = badge ? unreadCount : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badge && count > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div
          className={cn(
            "border-t border-white/10 p-2",
            collapsed ? "flex flex-col items-center gap-1" : "space-y-2"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-white/90",
              collapsed ? "flex-col" : "flex-row"
            )}
          >
            <Avatar
              name={user?.name ?? undefined}
              src={user?.image ?? user?.avatar ?? undefined}
              className="h-9 w-9 shrink-0 border-2 border-white/20"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user?.name ?? "User"}
                </p>
                <p className="truncate text-xs text-white/70">
                  {user?.role?.replace(/_/g, " ") ?? "—"}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className="w-full text-white/80 hover:bg-red-500/20 hover:text-red-300"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
