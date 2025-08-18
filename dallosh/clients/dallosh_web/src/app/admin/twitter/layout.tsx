'use client';

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { Bot, Home, BarChart3, Users, Settings, LogOut, ArrowLeft, MessageSquare, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function AdminTwitterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAdmin } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const displayName = user?.data?.fields?.displayName || user?.data?.username || 'Admin';

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-black text-white">
        <div className="flex">
          {/* Left Sidebar */}
          <div className="w-64 min-h-screen border-r border-gray-800 bg-gray-900">
            <div className="mb-8 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-8 w-8 text-blue-400" />
                <h1 className="text-xl font-bold">Dallosh Admin</h1>
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                Twitter Management
              </Badge>
            </div>
            
            <nav className="space-y-2 px-4">
              <Link href="/admin/twitter" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                <Home className="h-5 w-5" />
                <span>Overview</span>
              </Link>
              <Link href="/admin/twitter/posts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                <MessageSquare className="h-5 w-5" />
                <span>Posts</span>
              </Link>
              <Link href="/admin/twitter/users" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                <Users className="h-5 w-5" />
                <span>Users</span>
              </Link>
              <Link href="/admin/twitter/analytics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </Link>
              <Link href="/admin/twitter/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="mt-auto p-4 border-t border-gray-800">
              <Link href="/twitter" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Twitter</span>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <header className="border-b border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Twitter Admin Dashboard</h2>
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.data?.imageUrl} alt={user?.data?.username} />
                          <AvatarFallback>{user?.data?.username?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{displayName}</p>
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            @{user?.data?.username} (Admin)
                          </p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <Users className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="p-4">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


