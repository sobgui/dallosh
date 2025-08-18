"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Users, 
  Database, 
  Table, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut
} from "lucide-react";

interface SidebarItem {
  title: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  items: SidebarItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

const iconMap = {
  BarChart3,
  Users,
  Database,
  Table,
  Settings,
  Home
};

export function Sidebar({ items, title = "Sodular", subtitle, className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    // Clear any stored tokens
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    // Redirect to login
    window.location.href = "/auth/login";
  };

  return (
    <div className={cn(
      "flex flex-col border-r bg-muted/40 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b">
        {!collapsed && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] || BarChart3;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-3">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}
