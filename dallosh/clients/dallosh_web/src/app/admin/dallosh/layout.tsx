'use client';

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useRouter, usePathname } from "next/navigation";
import { 
  Bot, 
  Home, 
  Users, 
  UserPlus, 
  FileText, 
  Settings, 
  LogOut, 
  ArrowLeft, 
  MessageSquare, 
  Shield,
  Headphones,
  BarChart3,
  Sun,
  Moon,
  Bell,
  Star,
  CreditCard,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export default function AdminDalloshLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAdmin, isAgent } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [processedEventIds] = useState(new Set<string>());

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Setup real-time notifications for admin
  useEffect(() => {
    const setupAdminNotifications = async () => {
      try {
        // Import getSodularClient dynamically to avoid SSR issues
        const { getSodularClient } = await import('@/services/client');
        const client = await getSodularClient();
        if (!client) return;

        console.log('🔔 Setting up admin real-time notifications...');

        // Get or create requests table
        let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
        if (requestsTable.data) {
                     // Listen for new requests
           const requestCreateListener = client.ref.from(requestsTable.data.uid).on('created', (data: any) => {
             console.log('📨 New request notification for admin:', data);
             console.log('📊 Data structure analysis:', {
               hasData: !!data,
               hasDataData: !!(data && data.data),
               dataKeys: data ? Object.keys(data) : [],
               dataDataKeys: data && data.data ? Object.keys(data.data) : []
             });
             
             // Generate a unique event ID for deduplication
             const eventId = data?.uid || Date.now().toString();
             
             // Check if we've already processed this event
             if (processedEventIds.has(eventId)) {
               console.log('🔄 Duplicate event detected, skipping:', eventId);
               return;
             }
             
             // Mark this event as processed
             processedEventIds.add(eventId);
             
             // Handle different data structures
             const requestData = data.data || data;
             if (requestData && requestData.uid && requestData.data?.name && requestData.data?.userName) {
               console.log('📨 New request notification for admin:', requestData);
               setNotifications(prev => [{
                 id: requestData.uid,
                 type: 'request_created',
                 title: 'New Support Request',
                 message: `New request "${requestData.data.name}" from ${requestData.data.userName}`,
                 timestamp: Date.now(),
                 isRead: false,
                 data: requestData
               }, ...prev]);
               setUnreadCount(prev => prev + 1);
             } else {
               console.log('⚠️ Invalid request creation data structure received:', data);
               // Create a generic notification since we don't have complete data
               setNotifications(prev => [{
                 id: eventId,
                 type: 'request_created',
                 title: 'New Support Request',
                 message: 'A new support request has been created',
                 timestamp: Date.now(),
                 isRead: false,
                 data: data
               }, ...prev]);
               setUnreadCount(prev => prev + 1);
             }
           });

                    // Listen for request updates (patched events)
          const requestUpdateListener = client.ref.from(requestsTable.data.uid).on('patched', (data: any) => {
            console.log('📝 Request update notification for admin:', data);
            console.log('📊 Data structure analysis:', {
              hasData: !!data,
              hasDataData: !!(data && data.data),
              hasList: !!(data && data.list),
              listLength: data?.list?.length || 0
            });
            
            // Generate a unique event ID for deduplication
            const eventId = data?.uid || data?.list?.[0]?.uid || Date.now().toString();
            
            // Check if we've already processed this event
            if (processedEventIds.has(eventId)) {
              console.log('🔄 Duplicate event detected, skipping:', eventId);
              return;
            }
            
            // Mark this event as processed
            processedEventIds.add(eventId);
            
            // Handle the actual data structure from patched events
            if (data && data.list && data.list.length > 0) {
              const updatedRequest = data.list[0]; // Get the first (and should be only) item
              
              if (updatedRequest && updatedRequest.data && updatedRequest.data.name && updatedRequest.data.status) {
                console.log('📝 Request update notification for admin:', updatedRequest);
                setNotifications(prev => [{
                  id: updatedRequest.uid,
                  type: 'request_updated',
                  title: 'Request Updated',
                  message: `Request "${updatedRequest.data.name}" status changed to ${updatedRequest.data.status}`,
                  timestamp: Date.now(),
                  isRead: false,
                  data: updatedRequest
                }, ...prev]);
                setUnreadCount(prev => prev + 1);
              } else {
                console.log('⚠️ Updated request has invalid structure for notification');
                // Create a generic notification since we don't have complete data
                setNotifications(prev => [{
                  id: updatedRequest?.uid || Date.now().toString(),
                  type: 'request_updated',
                  title: 'Request Updated',
                  message: 'A support request has been updated',
                  timestamp: Date.now(),
                  isRead: false,
                  data: updatedRequest || data
                }, ...prev]);
                setUnreadCount(prev => prev + 1);
              }
            } else if (data && data.uid) {
              // Handle case where the event returns just the UID
              console.log('📝 Request update notification event with UID only:', data.uid);
              // Create a generic notification since we don't have full data
              setNotifications(prev => [{
                id: data.uid,
                type: 'request_updated',
                title: 'Request Updated',
                message: 'A support request has been updated',
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid request update data structure received:', data);
            }
          });

                     // Listen for request deletions
           const requestDeleteListener = client.ref.from(requestsTable.data.uid).on('deleted', (data: any) => {
             console.log('🗑️ Request deleted notification for admin:', data);
             console.log('📊 Data structure analysis:', {
               hasData: !!data,
               hasDataData: !!(data && data.data),
               dataKeys: data ? Object.keys(data) : [],
               dataDataKeys: data && data.data ? Object.keys(data.data) : []
             });
             
             // Generate a unique event ID for deduplication
             const eventId = data?.uid || Date.now().toString();
             
             // Check if we've already processed this event
             if (processedEventIds.has(eventId)) {
               console.log('🔄 Duplicate event detected, skipping:', eventId);
               return;
             }
             
             // Mark this event as processed
             processedEventIds.add(eventId);
             
             // Handle different data structures
             const requestData = data.data || data;
             if (requestData && requestData.uid && requestData.data?.name) {
               console.log('🗑️ Request deleted notification for admin:', requestData);
               setNotifications(prev => [{
                 id: requestData.uid,
                 type: 'request_deleted',
                 title: 'Request Deleted',
                 message: `Request "${requestData.data.name}" has been deleted`,
                 timestamp: Date.now(),
                 isRead: false,
                 data: requestData
               }, ...prev]);
               setUnreadCount(prev => prev + 1);
             } else {
               console.log('⚠️ Invalid request deletion data structure received:', data);
               // Create a generic notification since we don't have complete data
               setNotifications(prev => [{
                 id: eventId,
                 type: 'request_deleted',
                 title: 'Request Deleted',
                 message: 'A support request has been deleted',
                 timestamp: Date.now(),
                 isRead: false,
                 data: data
               }, ...prev]);
               setUnreadCount(prev => prev + 1);
             }
           });
        }

        // Get or create chat table
        let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
        if (chatTable.data) {
          // Listen for new chat sessions
          const chatCreateListener = client.ref.from(chatTable.data.uid).on('created', (data: any) => {
            // Validate data structure before accessing properties
            if (data && data.data && data.data.name && data.data.authorName) {
              console.log('💬 New chat session notification for admin:', data);
              setNotifications(prev => [{
                id: data.uid,
                type: 'chat_created',
                title: 'New Chat Session',
                message: `New chat session "${data.data.name}" from ${data.data.authorName}`,
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid chat session creation data structure received:', data);
            }
          });

          // Listen for chat session deletions
          const chatDeleteListener = client.ref.from(chatTable.data.uid).on('deleted', (data: any) => {
            // Validate data structure before accessing properties
            if (data && data.data && data.data.name) {
              console.log('🗑️ Chat session deleted notification for admin:', data);
              setNotifications(prev => [{
                id: data.uid,
                type: 'chat_deleted',
                title: 'Chat Session Deleted',
                message: `Chat session "${data.data.name}" has been deleted`,
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid chat session deletion data structure received:', data);
            }
          });
        }

        // Get or create feedbacks table
        let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
        if (feedbacksTable.data) {
          // Listen for new feedbacks
          const feedbackCreateListener = client.ref.from(feedbacksTable.data.uid).on('created', (data: any) => {
            // Validate data structure before accessing properties
            if (data && data.data && data.data.userName && data.data.comment) {
              console.log('⭐ New feedback notification for admin:', data);
              setNotifications(prev => [{
                id: data.uid,
                type: 'feedback_created',
                title: 'New Customer Feedback',
                message: `New feedback from ${data.data.userName}: "${data.data.comment.substring(0, 50)}${data.data.comment.length > 50 ? '...' : ''}"`,
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid feedback creation data structure received:', data);
            }
          });

          // Listen for feedback updates
          const feedbackUpdateListener = client.ref.from(feedbacksTable.data.uid).on('patched', (data: any) => {
            // Validate data structure before accessing properties
            if (data && data.data && data.data.userName && data.data.comment) {
              console.log('📝 Feedback updated notification for admin:', data);
              setNotifications(prev => [{
                id: data.uid,
                type: 'feedback_updated',
                title: 'Feedback Updated',
                message: `Feedback updated from ${data.data.userName}: "${data.data.comment.substring(0, 50)}${data.data.comment.length > 50 ? '...' : ''}"`,
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid feedback update data structure received:', data);
            }
          });

          // Listen for feedback deletions
          const feedbackDeleteListener = client.ref.from(feedbacksTable.data.uid).on('deleted', (data: any) => {
            // Validate data structure before accessing properties
            if (data && data.data && data.data.userName) {
              console.log('🗑️ Feedback deleted notification for admin:', data);
              setNotifications(prev => [{
                id: data.uid,
                type: 'feedback_deleted',
                title: 'Feedback Deleted',
                message: `Feedback from ${data.data.userName} has been deleted`,
                timestamp: Date.now(),
                isRead: false,
                data: data
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Invalid feedback deletion data structure received:', data);
            }
          });
        }
      } catch (error) {
        console.error('❌ Error setting up admin notifications:', error);
      }
    };

    setupAdminNotifications();
  }, []);

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
  };

  const displayName = user?.data?.fields?.displayName || user?.data?.username || 'Admin';
  const userRole = isAdmin() ? 'admin' : 'agent';

  return (
    <ProtectedRoute allowedRoles={['admin', 'agent']}>
      <div className="min-h-screen bg-black text-white">
        <div className="flex">
          {/* Left Sidebar */}
          <div className="w-64 min-h-screen border-r border-gray-800 bg-gray-900">
            <div className="mb-8 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-8 w-8 text-red-500" />
                <h1 className="text-xl font-bold">Dallosh Admin</h1>
              </div>
              <Badge variant="secondary" className="bg-red-600 text-white">
                {isAdmin() ? 'Full Admin' : 'Support Agent'}
              </Badge>
            </div>
            
            <nav className="space-y-2 px-4">
              <Link 
                href="/admin/dallosh" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>Overview</span>
              </Link>
              
              {/* User Management - Only for admin */}
              {isAdmin() && (
                <>
                  <Link 
                    href="/admin/dallosh/users" 
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      pathname === '/admin/dallosh/users' 
                        ? 'bg-red-600 text-white' 
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <Users className="h-5 w-5" />
                    <span>User Management</span>
                  </Link>
                  <Link 
                    href="/admin/dallosh/agents" 
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      pathname === '/admin/dallosh/agents' 
                        ? 'bg-red-600 text-white' 
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <Headphones className="h-5 w-5" />
                    <span>Agent Management</span>
                  </Link>
                </>
              )}
              
              {/* Support Management - For both admin and agents */}
              <Link 
                href="/admin/dallosh/requests" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh/requests' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Support Requests</span>
              </Link>
              
              <Link 
                href="/admin/dallosh/chat-sessions" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh/chat-sessions' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat Sessions</span>
              </Link>
              
              <Link 
                href="/admin/dallosh/feedbacks" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh/feedbacks' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <Star className="h-5 w-5" />
                <span>Customer Feedbacks</span>
              </Link>
              
              <Link 
                href="/admin/dallosh/analytics" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh/analytics' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </Link>
              
              {/* Cost Usage - Only for admin */}
              {isAdmin() && (
                <Link 
                  href="/admin/dallosh/cost-usage" 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    pathname === '/admin/dallosh/cost-usage' 
                      ? 'bg-red-600 text-white' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Cost Usage</span>
                </Link>
              )}
              
              {/* Bot Settings - Only for admin */}
              {isAdmin() && (
                <Link 
                  href="/admin/dallosh/bot-settings" 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    pathname === '/admin/dallosh/bot-settings' 
                      ? 'bg-red-600 text-white' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <Bot className="h-5 w-5" />
                  <span>Bot Settings</span>
                </Link>
              )}
              
              <Link 
                href="/admin/dallosh/settings" 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === '/admin/dallosh/settings' 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="mt-auto p-4 border-t border-gray-800">
              {/* Show appropriate back link based on role */}
              {isAdmin() ? (
                <Link href="/twitter" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Twitter</span>
                </Link>
              ) : (
                <Link href="/chat" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Chat</span>
                </Link>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <header className="border-b border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Dallosh Admin Dashboard</h2>
                <div className="flex items-center gap-4">
                  {/* Notification Button */}
                  <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 relative hover:bg-gray-800 text-gray-400 hover:text-white"
                      >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 bg-black border-gray-800">
                      <div className="p-3 border-b border-gray-800">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={markAllNotificationsAsRead}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Mark all read
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-400">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <DropdownMenuItem
                              key={notification.id}
                              className={`p-3 cursor-pointer hover:bg-gray-800 ${
                                !notification.isRead ? 'bg-gray-800/50' : ''
                              }`}
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <div className="flex-1 text-left">
                                <div className="flex items-start justify-between">
                                  <h4 className="text-sm font-medium text-white">
                                    {notification.title}
                                  </h4>
                                  <span className="text-xs text-gray-400">
                                    {new Date(notification.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">
                                  {notification.message}
                                </p>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Theme Switcher */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDarkTheme(!isDarkTheme)}
                    className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-400 hover:text-white"
                    title={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
                  >
                    {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.data?.imageUrl} alt={user?.data?.username} />
                          <AvatarFallback>{user?.data?.username?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-black border-gray-800">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium text-white">{displayName}</p>
                          <p className="w-[200px] truncate text-sm text-gray-400">
                            @{user?.data?.username} ({userRole === 'admin' ? 'Admin' : 'Agent'})
                          </p>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dallosh/profile" className="cursor-pointer text-white">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dallosh/settings" className="cursor-pointer text-white">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-white">
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
