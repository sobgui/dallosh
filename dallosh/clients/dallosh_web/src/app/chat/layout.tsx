'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth";
import { 
  Search, 
  Ticket, 
  FileText, 
  MessageCircle, 
  Clock, 
  User, 
  Sun, 
  Moon,
  Menu,
  X,
  MoreVertical,
  Trash2,
  Bell,
  Star,
  LogOut
} from "lucide-react";
import { chatService, type ChatSession } from "./service";
import { getSodularClient } from "@/services/client";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { ProtectedRoute } from "@/components/protected-route";
import SecurityWrapper from "./components/SecurityWrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isHydrated, logout } = useAuthStore();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'tickets' | 'requests' | 'feedbacks'>('tickets');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  
  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [processedEventIds] = useState(new Set<string>());
  
  const pathname = usePathname();
  const router = useRouter();

  // Set active tab based on current path
  useEffect(() => {
    if (pathname === '/chat') {
      setActiveTab('tickets');
    } else if (pathname === '/chat/requests') {
      setActiveTab('requests');
    } else if (pathname === '/chat/feedbacks') {
      setActiveTab('feedbacks');
    }
  }, [pathname]);

  // Fetch chat sessions when component mounts
  useEffect(() => {
    if (isHydrated && user) {
      initializeAndFetchSessions();
    }
  }, [isHydrated, user]);

  const initializeAndFetchSessions = async () => {
    try {
      // Initialize the chat service first
      await chatService.initialize();
      // Then fetch sessions
      await fetchChatSessions();
    } catch (error) {
      console.error('❌ Error initializing chat service:', error);
    }
  };

  // Listen for chat session updates
  useEffect(() => {
    if (!isHydrated || !user) return;

    const handleSessionsUpdate = () => {
      console.log('🔄 Received chat:sessions-updated event, refreshing sessions...');
      console.log('📊 Current sessions before refresh:', chatSessions.length);
      
      // Force refresh sessions from database
      fetchChatSessions();
    };

    // Add event listener
    window.addEventListener('chat:sessions-updated', handleSessionsUpdate);
    console.log('👂 Event listener added for chat:sessions-updated');
    
    // Cleanup
    return () => {
      window.removeEventListener('chat:sessions-updated', handleSessionsUpdate);
      console.log('👂 Event listener removed for chat:sessions-updated');
    };
  }, [isHydrated, user, chatSessions.length]);

  // Setup real-time notifications for requests
  useEffect(() => {
    if (!isHydrated || !user) return;

    const setupRequestNotifications = async () => {
      try {
        const client = await getSodularClient();
        if (!client) return;

        // Get or create requests table
        let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
        if (!requestsTable.data) return;

        console.log('🔔 Setting up real-time request notifications...');

        // Listen for new requests
        const createListener = client.ref.from(requestsTable.data.uid).on('created', (data: any) => {
          console.log('📨 New request received in real-time:', data);
          
          // Generate a unique event ID for deduplication
          const eventId = data?.uid || Date.now().toString();
          
          // Check if we've already processed this event
          if (processedEventIds.has(eventId)) {
            console.log('🔄 Duplicate event detected, skipping:', eventId);
            return;
          }
          
          // Mark this event as processed
          processedEventIds.add(eventId);
          
          // Validate data structure before accessing properties
          if (data && data.data && data.data.userId === user.uid && data.data.name) {
            console.log('📨 New request notification for customer:', data);
            setNotifications(prev => [{
              id: data.uid,
              type: 'request_created',
              title: 'New Request Created',
              message: `Your request "${data.data.name}" has been created`,
              timestamp: Date.now(),
              isRead: false,
              data: data
            }, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else {
            console.log('⚠️ Invalid request data structure received:', data);
          }
        });

        // Listen for request updates
        const updateListener = client.ref.from(requestsTable.data.uid).on('patched', (data: any) => {
          console.log('📝 Request update notification for customer:', data);
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
            
            if (updatedRequest && updatedRequest.data && updatedRequest.data.userId === user.uid && updatedRequest.data.name && updatedRequest.data.status) {
              console.log('📝 Request update notification for customer:', updatedRequest);
              setNotifications(prev => [{
                id: updatedRequest.uid,
                type: 'request_updated',
                title: 'Request Updated',
                message: `Your request "${updatedRequest.data.name}" status changed to ${updatedRequest.data.status}`,
                timestamp: Date.now(),
                isRead: false,
                data: updatedRequest
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('⚠️ Updated request does not belong to current user or has invalid structure');
              // Create a generic notification since we don't have complete data
              setNotifications(prev => [{
                id: updatedRequest?.uid || Date.now().toString(),
                type: 'request_updated',
                title: 'Request Updated',
                message: 'Your request has been updated',
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
              message: 'Your support request has been updated',
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
        const deleteListener = client.ref.from(requestsTable.data.uid).on('deleted', (data: any) => {
          console.log('🗑️ Request deleted notification for customer:', data);
          
          // Generate a unique event ID for deduplication
          const eventId = data?.uid || Date.now().toString();
          
          // Check if we've already processed this event
          if (processedEventIds.has(eventId)) {
            console.log('🔄 Duplicate event detected, skipping:', eventId);
            return;
          }
          
          // Mark this event as processed
          processedEventIds.add(eventId);
          
          // Validate data structure before accessing properties
          if (data && data.data && data.data.userId === user.uid && data.data.name) {
            console.log('🗑️ Request deleted notification for customer:', data);
            setNotifications(prev => [{
              id: data.uid,
              type: 'request_deleted',
              title: 'Request Deleted',
              message: `Your request "${data.data.name}" has been deleted`,
              timestamp: Date.now(),
              isRead: false,
              data: data
            }, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else {
            console.log('⚠️ Invalid request deletion data structure received:', data);
          }
        });

        // Cleanup function
        return () => {
          if (createListener && typeof createListener.unsubscribe === 'function') {
            createListener.unsubscribe();
          }
          if (updateListener && typeof updateListener.unsubscribe === 'function') {
            updateListener.unsubscribe();
          }
          if (deleteListener && typeof deleteListener.unsubscribe === 'function') {
            deleteListener.unsubscribe();
          }
        };
      } catch (error) {
        console.error('❌ Error setting up request notifications:', error);
      }
    };

    setupRequestNotifications();
  }, [isHydrated, user]);

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

  const fetchChatSessions = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Fetching chat sessions for user:', user.uid);
      console.log('👤 User object:', user);
      
      const chatManager = chatService.getChatManager();
      console.log('📋 ChatManager:', chatManager);
      
      // Check if ChatManager is initialized
      if (!chatService.isInitialized()) {
        console.log('⚠️ ChatService not initialized, initializing now...');
        await chatService.initialize();
      }
      
      const sessions = await chatManager.getUserSessions(user.uid);
      console.log('✅ Fetched sessions:', sessions);
      console.log('📊 Sessions count:', sessions.length);
      
      setChatSessions(sessions);
    } catch (error) {
      console.error('❌ Error fetching chat sessions:', error);
      console.error('❌ Error details:', error);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    // You can also update document class or localStorage here
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleDeleteSession = async (sessionUid: string) => {
    if (!user) return;

    // Show confirmation dialog with warning about related requests
    const confirmed = confirm(
      `Are you sure you want to delete this chat session?\n\n` +
      `⚠️ This will also delete ALL related technical assistance requests for this session.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      console.log('🗑️ User confirmed deletion of session:', sessionUid);
      
      const chatManager = chatService.getChatManager();
      const deleteResult = await chatManager.deleteSession(sessionUid);
      
      if (deleteResult) {
        console.log(`✅ Session ${sessionUid} deleted successfully from database`);
        
        // Remove from local state immediately for better UX
        setChatSessions(prev => prev.filter(session => session.uid !== sessionUid));
        
        // Verify deletion by checking database (with delay for commit)
        try {
          console.log('🔍 Waiting for database commit before verification...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          
          console.log('🔍 Verifying deletion from database...');
          const verifyResult = await chatManager.getSession(sessionUid);
          if (verifyResult) {
            console.warn('⚠️ Session still exists in database after deletion!');
            alert('Warning: Session may not have been fully deleted. Please refresh the page.');
          } else {
            console.log('✅ Deletion verified - session no longer exists in database');
          }
        } catch (verifyError) {
          console.log('✅ Deletion verification completed (session not found)');
        }
        
        // Show success message
        alert('Chat session deleted successfully!');
      } else {
        console.error(`❌ Failed to delete session ${sessionUid} from database`);
        alert('Failed to delete session. Please try again.');
        return;
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  };

  // Filter sessions based on search query
  const filteredSessions = chatSessions.filter(session => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      session.data.lastMessage?.toLowerCase().includes(searchLower) ||
      session.uid.toLowerCase().includes(searchLower)
    );
  });

  // Debug: Show filtering results
  console.log('🔍 Filtering debug:', {
    totalSessions: chatSessions.length,
    searchQuery: searchQuery,
    filteredCount: filteredSessions.length,
    sessions: chatSessions.map(s => ({
      uid: s.uid,
      name: s.data.name,
      content: s.data.content?.substring(0, 30)
    }))
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-white dark:bg-black">
        {/* Mobile Drawer Overlay */}
        {isMobileDrawerOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Sidebar - Mobile Drawer */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-gray-800 
          transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support Center</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Support Center</h1>
            </div>
            
            {/* Tabs */}
            <div className="flex border border-gray-300 rounded-md dark:border-gray-700 mb-4">
              <button
                onClick={() => {
                  setActiveTab('tickets');
                  router.push('/chat');
                  setIsMobileDrawerOpen(false); // Close drawer on mobile after navigation
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800'
                }`}
              >
                <Ticket className="h-4 w-4 inline mr-2" />
                My Tickets
              </button>
              <button
                onClick={() => {
                  setActiveTab('requests');
                  router.push('/chat/requests');
                  setIsMobileDrawerOpen(false); // Close drawer on mobile after navigation
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-800'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                My Requests
              </button>
              <button
                onClick={() => {
                  setActiveTab('feedbacks');
                  router.push('/chat/feedbacks');
                  setIsMobileDrawerOpen(false); // Close drawer on mobile after navigation
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'feedbacks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800'
                }`}
              >
                <Star className="h-4 w-4 inline mr-2" />
                My Feedbacks
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={activeTab === 'tickets' ? "Search tickets..." : activeTab === 'requests' ? "Search requests..." : "Search feedbacks..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-neutral-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Conditional rendering for tickets/requests list */}
          {activeTab === 'tickets' && (
            <div className="flex-1 overflow-y-auto">
              {/* Debug info */}
              <div className="p-4 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <div>Debug: Total sessions: {chatSessions.length}</div>
                <div>Filtered sessions: {filteredSessions.length}</div>
                <div>User ID: {user?.uid}</div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchChatSessions}
                  className="mt-2"
                >
                  🔄 Refresh Sessions
                </Button>
              </div>
              
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-4">No chat sessions yet</p>
                  <p className="text-sm">Mention @free in a Twitter post to get started!</p>
                  {/* Debug: Show raw data */}
                  {chatSessions.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-left">
                      <p className="text-xs font-mono">Raw sessions data:</p>
                      <pre className="text-xs mt-2 overflow-auto">
                        {JSON.stringify(chatSessions.slice(0, 2), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredSessions.map((session) => {
                    const isActive = pathname === `/chat/${session.uid}`;
                    return (
                      <div
                        key={session.uid}
                        className={`group block p-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500'
                            : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Link
                            href={`/chat/${session.uid}`}
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className="flex-1 min-w-0"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                  <MessageCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className={`text-sm font-medium truncate ${
                                    isActive ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {session.data.name.slice(0, 15)}...
                                  </p>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                    support
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${
                                  isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {session.data.lastMessage || 'No messages yet'}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDistanceToNow(session.data.createdAt, { addSuffix: true })}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Twitter</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                          
                          {/* 3-dot menu for session management */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-gray-700 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.uid);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'requests' && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-4">Click "My Requests" tab to view your technical assistance requests</p>
              <Button 
                onClick={() => router.push('/chat/requests')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View My Requests
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation Bar */}
          <div className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left side - Mobile menu button and title */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden h-8 w-8 p-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">F</span>
                  </div>
                  <h1 className="text-xl font-bold text-red-500">Free Support</h1>
                </div>
              </div>

              {/* Right side - Theme toggle, notifications, and user profile */}
              <div className="flex items-center space-x-3">
                {/* Notification Button */}
                <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 relative"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-neutral-900 border-gray-200 dark:border-gray-700">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllNotificationsAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                              !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex-1 text-left">
                              <div className="flex items-start justify-between">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-8 w-8 p-0"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.data.fields?.avatar} alt={user?.data.username} />
                        <AvatarFallback className="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400">
                          {user?.data.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-neutral-900 border-gray-200 dark:border-gray-700">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.data.username || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.data.email || 'user@example.com'}
                      </div>
                    </div>
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800"
                      onClick={() => router.push('/chat/profile')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 text-red-600 dark:text-red-400"
                      onClick={() => {
                        if (confirm('Are you sure you want to log out?')) {
                          logout();
                          router.push('/auth/login');
                        }
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-hidden">
            <SecurityWrapper>
              {children}
            </SecurityWrapper>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
