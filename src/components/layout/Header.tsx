"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Search, LogOut, User } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/Dropdown";

const pathToTitle: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/companies": "Companies",
  "/shipments": "Shipments",
  "/invoices": "Invoices",
  "/transactions": "Transactions",
  "/documents": "Documents",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/users": "Users",
  "/audit-log": "Audit Log",
  "/profile": "Profile",
  "/settings": "Settings",
};

function getTitleFromPath(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment) {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
  }
  return "Dashboard";
}

export function Header({
  title: titleProp,
  onMenuClick,
}: {
  title?: string;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const title = titleProp ?? getTitleFromPath(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="text-lg font-semibold truncate min-w-0">{title}</h1>

      <div className="hidden md:flex flex-1 max-w-md justify-end">
        <Button
          ref={searchTriggerRef}
          variant="outline"
          className="h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground font-normal"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="hidden lg:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">⌘K</kbd>
        </Button>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} triggerRef={searchTriggerRef} />

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar
                name={user?.name ?? undefined}
                src={user?.image ?? user?.avatar ?? undefined}
                className="h-9 w-9"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role?.replace(/_/g, " ") ?? "—"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
