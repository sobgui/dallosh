"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Database, 
  BarChart3, 
  Users, 
  Table, 
  Settings,
  Home,
  LogOut,
  Sun,
  Moon,
  HardDrive,
  Link2,
  Shield,
  UserCheck
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/authStore";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Database {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
}

interface DatabaseSidebarProps {
  database: Database;
  databaseId: string;
}

export function DatabaseSidebar({ database, databaseId }: DatabaseSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  const navigationItems = [
    {
      title: "Overview",
      href: `/database/${databaseId}`,
      icon: BarChart3,
    },
    {
      title: "Users",
      href: `/database/${databaseId}/users`,
      icon: Users,
    },
    {
      title: "Databases",
      href: `/database/${databaseId}/databases`,
      icon: Database,
    },
    {
      title: "Tables",
      href: `/database/${databaseId}/tables`,
      icon: Table,
    },
    {
      title: "Storage",
      href: `/database/${databaseId}/storage`,
      icon: HardDrive,
    },
    {
      title: "Constraints",
      href: `/database/${databaseId}/constraints`,
      icon: Link2,
    },
    {
      title: "Permissions",
      href: `/database/${databaseId}/permissions`,
      icon: Shield,
    },
    {
      title: "Authorizations",
      href: `/database/${databaseId}/authorizations`,
      icon: UserCheck,
    },
    {
      title: "Settings",
      href: `/database/${databaseId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Home className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Home</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Sodular Primary Database
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Current Database</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2">
              <div className="flex items-center space-x-2">
                <div className="flex aspect-square size-6 items-center justify-center rounded bg-muted">
                  <Database className="size-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {database.data.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {database.data.description || "No description"}
                  </p>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/home">
                    <Home className="size-4" />
                    <span>Back to Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      DB
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Database Admin</span>
                    <span className="truncate text-xs">root@sodular.com</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? (
                    <Sun className="size-4 mr-2" />
                  ) : (
                    <Moon className="size-4 mr-2" />
                  )}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="size-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
