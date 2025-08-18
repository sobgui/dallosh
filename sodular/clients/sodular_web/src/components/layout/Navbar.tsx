"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Sun, 
  Moon, 
  User, 
  LogOut, 
  Settings,
  Database,
  Users,
  Table,
  HardDrive,
  BarChart3,
  Menu,
  X
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { auth } from '@/services';
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface NavbarProps {
  title?: string;
  showSearch?: boolean;
  database?: {
    uid: string;
    data: {
      name: string;
      description?: string;
    };
  };
}

function getLocalConfig() {
  if (typeof window === 'undefined') return { baseUrl: '', aiBaseUrl: '', databaseId: '' };
  return {
    baseUrl: localStorage.getItem('sodular_base_url') || '',
    aiBaseUrl: localStorage.getItem('sodular_ai_base_url') || '',
    databaseId: localStorage.getItem('sodular_database_id') || '',
  };
}

export function Navbar({ title = "Sodular", showSearch = true, database }: NavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState<{ email: string; username?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [baseUrl, setBaseUrl] = React.useState('');
  const [aiBaseUrl, setAiBaseUrl] = React.useState('');
  const [databaseId, setDatabaseId] = React.useState('');

  const handleLogout = () => {
    auth.logout();
    router.replace('/auth/login');
  };

  // Search functionality
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const client = await import('@/services').then(m => m.getSodularClient());
        const result = await client.auth.get({ filter: {} });
        if (result.data && result.data.data) {
          setUser({ email: result.data.data.email, username: result.data.data.username });
        }
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  React.useEffect(() => {
    const config = getLocalConfig();
    setBaseUrl(config.baseUrl);
    setAiBaseUrl(config.aiBaseUrl);
    setDatabaseId(config.databaseId);
  }, [settingsOpen]);

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sodular_base_url', baseUrl);
      localStorage.setItem('sodular_ai_base_url', aiBaseUrl);
      localStorage.setItem('sodular_database_id', databaseId);
    }
    setSettingsOpen(false);
    window.location.reload(); // reload to apply new config
  };

  const searchItems = database ? [
    {
      group: "Database Navigation",
      items: [
        { title: "Overview", href: `/database/${database.uid}`, icon: BarChart3 },
        { title: "Users", href: `/database/${database.uid}/users`, icon: Users },
        { title: "Databases", href: `/database/${database.uid}/databases`, icon: Database },
        { title: "Tables", href: `/database/${database.uid}/tables`, icon: Table },
        { title: "Storage", href: `/database/${database.uid}/storage`, icon: HardDrive },
        { title: "Settings", href: `/database/${database.uid}/settings`, icon: Settings },
      ]
    },
    {
      group: "Global Navigation",
      items: [
        { title: "Home Dashboard", href: "/home", icon: BarChart3 },
        { title: "All Users", href: "/home/users", icon: Users },
        { title: "All Databases", href: "/home/database", icon: Database },
        { title: "All Tables", href: "/home/tables", icon: Table },
        { title: "Storage", href: "/home/storage", icon: HardDrive },
        { title: "Global Settings", href: "/home/settings", icon: Settings },
      ]
    }
  ] : [
    {
      group: "Navigation",
      items: [
        { title: "Dashboard", href: "/home", icon: BarChart3 },
        { title: "Users", href: "/home/users", icon: Users },
        { title: "Databases", href: "/home/database", icon: Database },
        { title: "Tables", href: "/home/tables", icon: Table },
        { title: "Storage", href: "/home/storage", icon: HardDrive },
        { title: "Settings", href: "/home/settings", icon: Settings },
      ]
    }
  ];

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link href="/home" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {database ? (
                  <span className="text-sm font-semibold">
                    {database.data.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Database className="h-4 w-4" />
                )}
              </div>
              <span className="hidden font-bold sm:inline-block">{title}</span>
            </Link>
          </div>

          {/* Center - Search (Desktop) - Temporarily disabled */}
          {showSearch && (
            <div className="flex flex-1 items-center justify-center px-6">
              <div className="w-full max-w-sm">
                <Button
                  variant="outline"
                  className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
                  onClick={() => setOpen(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span className="hidden lg:inline-flex">Search...</span>
                  <span className="inline-flex lg:hidden">Search</span>
                  <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </div>
            </div>
          )}

          {/* Right side - Theme Toggle, Profile */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            {/* Settings Icon */}
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Connection Settings">
              <Settings className="h-5 w-5" />
            </Button>
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      AD
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.username || 'User'}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email || 'unknown'}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/home/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <div className="container px-4 py-4">
              {showSearch && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm text-muted-foreground"
                    onClick={() => setOpen(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search...
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Command Dialog for Search */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={database ? `Search in ${database.data.name}...` : "Type a command or search..."} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchItems.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => {
                    runCommand(() => router.push(item.href));
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Server Base URL</label>
              <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://your-backend:5001/api/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">AI Base URL</label>
              <Input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} placeholder="http://your-backend:4200/api/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Database ID</label>
              <Input value={databaseId} onChange={e => setDatabaseId(e.target.value)} placeholder="UUID..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
