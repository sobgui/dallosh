'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Headphones, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  UserPlus,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Bot
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSodularClient } from "@/services/client";
import { useAuthStore } from "@/stores/auth";
import { analyzePostSentiment } from "@/utils/postAnalysis";

interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalRequests: number;
  activeRequests: number;
  resolvedRequests: number;
  totalChatSessions: number;
  totalFeedbacks: number;
  averageResponseTime: number;
  averageFeedbackRating: number;
}

interface RecentRequest {
  uid: string;
  data: {
    name: string;
    description: string;
    status: string;
    label: string;
    createdAt: number;
    userName: string;
  };
}

interface RecentUserPost {
  uid: string;
  data: {
    content: string;
    source: string;
    userName: string;
    createdAt: number;
    sentiment: {
      score: number;
      comparative: number;
      positive: string[];
      negative: string[];
    };
  };
}

interface RecentChatSession {
  uid: string;
  data: {
    lastMessage: string;
    lastMessageType: 'user' | 'bot' | 'assistant';
    lastMessageSender: string;
    lastMessageTime: number;
    userProfile: string;
    sentiment: {
      score: number;
      comparative: number;
      positive: string[];
      negative: string[];
    };
  };
}

export default function AdminDalloshPage() {
  const { isAdmin } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalRequests: 0,
    activeRequests: 0,
    resolvedRequests: 0,
    totalChatSessions: 0,
    totalFeedbacks: 0,
    averageResponseTime: 0,
    averageFeedbackRating: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [recentUserPosts, setRecentUserPosts] = useState<RecentUserPost[]>([]);
  const [recentChatSessions, setRecentChatSessions] = useState<RecentChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filter states for requests
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestLabelFilter, setRequestLabelFilter] = useState('all');
  const [requestPage, setRequestPage] = useState(1);
  const [isRequestsCollapsed, setIsRequestsCollapsed] = useState(false);
  
  // Search and filter states for posts
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [postSourceFilter, setPostSourceFilter] = useState('all');
  const [postSentimentFilter, setPostSentimentFilter] = useState('all');
  const [postPage, setPostPage] = useState(1);
  const [isPostsCollapsed, setIsPostsCollapsed] = useState(false);
  
  // Search and filter states for chat sessions
  const [chatSessionSearchQuery, setChatSessionSearchQuery] = useState('');
  const [chatSessionTypeFilter, setChatSessionTypeFilter] = useState('all');
  const [chatSessionSentimentFilter, setChatSessionSentimentFilter] = useState('all');
  const [chatSessionPage, setChatSessionPage] = useState(1);
  const [isChatSessionsCollapsed, setIsChatSessionsCollapsed] = useState(false);
  
  // All data for pagination
  const [allRequests, setAllRequests] = useState<RecentRequest[]>([]);
  const [allUserPosts, setAllUserPosts] = useState<RecentUserPost[]>([]);
  const [allChatSessions, setAllChatSessions] = useState<RecentChatSession[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Fetch users
      const usersResult = await client.auth.query({ take: 100 });
      const users = usersResult.data?.list || [];

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) {
        console.log('📋 Requests table not found');
        setStats(prev => ({ ...prev, totalRequests: 0, activeRequests: 0, resolvedRequests: 0, averageResponseTime: 0 }));
        setRecentRequests([]);
        setIsLoading(false);
        return;
      }

      // Fetch requests
      const requestsResult = await client.ref.from(requestsTable.data.uid).query({ take: 100 });
      const requests = requestsResult.data?.list || [];

      // Get or create chat table
      let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data) {
        console.log('📋 Chat table not found');
        setStats(prev => ({ ...prev, totalChatSessions: 0 }));
        setIsLoading(false);
        return;
      }

      // Fetch chat sessions
      const chatResult = await client.ref.from(chatTable.data.uid).query({ take: 100 });
      const chatSessions = chatResult.data?.list || [];

             // Get or create feedbacks table
       let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
       let totalFeedbacks = 0;
       let averageFeedbackRating = 0;
       
       if (feedbacksTable.data) {
         const feedbacksResult = await client.ref.from(feedbacksTable.data.uid).query({ take: 100 });
         const feedbacks = feedbacksResult.data?.list || [];
         totalFeedbacks = feedbacks.length;
         
         // Calculate average global experience rating
         const validRatings = feedbacks
           .filter(feedback => feedback.data.globalExperience && feedback.data.globalExperience > 0)
           .map(feedback => feedback.data.globalExperience);
         
         if (validRatings.length > 0) {
           averageFeedbackRating = Math.round((validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length) * 10) / 10;
         }
       }

       // Get posts from chat sessions (chat sessions have source and content)
       let recentPosts: RecentUserPost[] = [];
       
       if (chatTable.data) {
         // Debug: Log a few chat sessions to see their structure
         console.log('🔍 Sample chat sessions:', chatSessions.slice(0, 3).map(session => ({
           uid: session.uid,
           data: session.data
         })));
         
         // Filter chat sessions that have source and content (these are posts)
         const postsFromChat = chatSessions.filter(session => 
           session.data.source && session.data.content
         );
         
         console.log('🔍 Found posts from chat:', postsFromChat.length);
         console.log('🔍 Posts data structure:', postsFromChat.slice(0, 2).map(post => ({
           uid: post.uid,
           data: post.data
         })));
         
                   // Fetch user names for posts using authorId
          const postsWithUserNames = await Promise.all(
            postsFromChat.map(async (session) => {
              let userName = 'Unknown User';
              
              // Get the authorId from the session data
              const authorId = session.data.authorId;
              
              if (authorId) {
                try {
                  console.log('🔍 Looking up user with authorId:', authorId);
                  
                  // Use client.auth.get with filter for uid
                  const userResult = await client.auth.get({ filter: { uid: authorId } });
                  console.log('🔍 User lookup result:', userResult);
                  
                  if (userResult.data) {
                    // Extract username from user data
                    // The user data structure is userResult.data.data.username, not userResult.data.fields.username
                    userName = userResult.data.data?.username || 
                              userResult.data.data?.displayName || 
                              userResult.data.data?.email || 
                              'Unknown User';
                    console.log('✅ Found user name:', userName);
                  } else {
                    console.log('⚠️ No user data found for authorId:', authorId);
                  }
                } catch (error) {
                  console.error('❌ Error fetching user for post:', error);
                  console.log('🔍 AuthorId that failed:', authorId);
                }
              } else {
                console.log('⚠️ No authorId found in session data');
              }
              
              return {
                uid: session.uid,
                data: {
                  content: session.data.content,
                  source: session.data.source,
                  userName,
                  createdAt: session.data.createdAt,
                  sentiment: {
                    score: 0, // Will be calculated on the fly if needed
                    comparative: 0,
                    positive: [],
                    negative: []
                  }
                }
              };
            })
          );
         
         // Sort by creation date
         recentPosts = postsWithUserNames.sort((a, b) => b.data.createdAt - a.data.createdAt);
       }

       // Get recent chat sessions with last messages and sentiment analysis
       let recentChatSessionsData: RecentChatSession[] = [];
       
       if (chatTable.data) {
         // Process each chat session using the data already available
         const chatSessionsWithData = await Promise.all(
           chatSessions.map(async (session) => {
             try {
               // Use the session data directly since it already contains lastMessage
               const lastMessage = session.data.lastMessage || session.data.content || 'No message content';
               
               // Determine message type and sender based on session data
               let lastMessageType: 'user' | 'bot' | 'assistant' = 'user';
               let lastMessageSender = 'User';
               
               if (session.data.agentId) {
                 lastMessageType = 'assistant';
                 lastMessageSender = 'Agent';
               } else if (session.data.type === 'bot') {
                 lastMessageType = 'bot';
                 lastMessageSender = 'Bot';
               }
               
               // Get user profile for display
               let userProfile = 'Unknown User';
               if (session.data.authorId) {
                 try {
                   const userResult = await client.auth.get({ filter: { uid: session.data.authorId } });
                   if (userResult.data) {
                     userProfile = userResult.data.data?.username || 
                                 userResult.data.data?.displayName || 
                                 userResult.data.data?.email || 
                                 'Unknown User';
                   }
                 } catch (error) {
                   console.error('❌ Error fetching user for chat session:', error);
                 }
               }
               
               // For sentiment analysis, use the session content or last message
               let sentiment = { score: 0, comparative: 0, positive: [], negative: [] };
               
               const textForSentiment = session.data.content || session.data.lastMessage || '';
               if (textForSentiment.trim()) {
                 try {
                   sentiment = analyzePostSentiment(textForSentiment);
                 } catch (error) {
                   console.error('❌ Error analyzing sentiment for chat session:', error);
                 }
               }
               
               return {
                 uid: session.uid,
                 data: {
                   lastMessage,
                   lastMessageType,
                   lastMessageSender,
                   lastMessageTime: session.data.lastMessageTime || session.data.createdAt,
                   userProfile,
                   sentiment
                 }
               };
             } catch (error) {
               console.error('❌ Error processing chat session:', session.uid, error);
               return null;
             }
           })
         );
         
         // Filter out null results and sort by last message time
         recentChatSessionsData = chatSessionsWithData
           .filter(session => session !== null)
           .sort((a, b) => b.data.lastMessageTime - a.data.lastMessageTime);
       }

      // Calculate stats
      const totalUsers = users.filter(user => user.data.fields?.role !== 'agent').length;
      const totalAgents = users.filter(user => user.data.fields?.role === 'agent').length;
      const totalRequests = requests.length;
      const activeRequests = requests.filter(req => req.data.status === 'ongoing').length;
      const resolvedRequests = requests.filter(req => req.data.status === 'done').length;
      const totalChatSessions = chatSessions.length;

      // Calculate average response time (simplified)
      const responseTimes = requests
        .filter(req => req.data.processedAt && req.data.createdAt)
        .map(req => req.data.processedAt - req.data.createdAt);
      
      const averageResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60)) // Convert to minutes
        : 0;

      setStats({
        totalUsers,
        totalAgents,
        totalRequests,
        activeRequests,
        resolvedRequests,
        totalChatSessions,
        totalFeedbacks,
        averageResponseTime,
        averageFeedbackRating,
      });

             // Store all data for pagination
             const allRequestsSorted = requests.sort((a, b) => b.data.createdAt - a.data.createdAt);
             const allPostsSorted = recentPosts;
             const allChatSessionsSorted = recentChatSessionsData;
             
             // Set initial pagination (first 5 items)
             setRecentRequests(allRequestsSorted.slice(0, 5));
             setRecentUserPosts(allPostsSorted.slice(0, 5));
             setRecentChatSessions(allChatSessionsSorted.slice(0, 5));
             
             // Store all data
             setAllRequests(allRequestsSorted);
             setAllUserPosts(allPostsSorted);
             setAllChatSessions(allChatSessionsSorted);
             
             setIsLoading(false);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-blue-500';
      case 'processed':
        return 'bg-yellow-500';
      case 'done':
        return 'bg-green-500';
      case 'fail':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter and pagination functions for requests
  const getFilteredRequests = () => {
    let filtered = allRequests;
    
    // Apply search filter
    if (requestSearchQuery) {
      filtered = filtered.filter(request => 
        request.data.name.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.data.description.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.data.userName.toLowerCase().includes(requestSearchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (requestStatusFilter !== 'all') {
      filtered = filtered.filter(request => request.data.status === requestStatusFilter);
    }
    
    // Apply label filter
    if (requestLabelFilter !== 'all') {
      filtered = filtered.filter(request => request.data.label === requestLabelFilter);
    }
    
    return filtered;
  };

  const loadMoreRequests = () => {
    const filtered = getFilteredRequests();
    const nextPage = requestPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * 5;
    
    setRecentRequests(filtered.slice(startIndex, endIndex));
    setRequestPage(nextPage);
  };

  const resetRequestPagination = () => {
    setRequestPage(1);
    const filtered = getFilteredRequests();
    setRecentRequests(filtered.slice(0, 5));
  };

  // Filter and pagination functions for posts
  const getFilteredPosts = () => {
    let filtered = allUserPosts;
    
    // Apply search filter
    if (postSearchQuery) {
      filtered = filtered.filter(post => 
        post.data.content.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
        post.data.userName.toLowerCase().includes(postSearchQuery.toLowerCase())
      );
    }
    
    // Apply source filter
    if (postSourceFilter !== 'all') {
      filtered = filtered.filter(post => post.data.source.toLowerCase() === postSourceFilter.toLowerCase());
    }
    
    // Apply sentiment filter
    if (postSentimentFilter !== 'all') {
      filtered = filtered.filter(post => {
        if (postSentimentFilter === 'positive') return post.data.sentiment.score > 0;
        if (postSentimentFilter === 'negative') return post.data.sentiment.score < 0;
        if (postSentimentFilter === 'neutral') return post.data.sentiment.score === 0;
        return true;
      });
    }
    
    return filtered;
  };

  const loadMorePosts = () => {
    const filtered = getFilteredPosts();
    const nextPage = postPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * 5;
    
    setRecentUserPosts(filtered.slice(startIndex, endIndex));
    setPostPage(nextPage);
  };

  const resetPostPagination = () => {
    setPostPage(1);
    const filtered = getFilteredPosts();
    setRecentUserPosts(filtered.slice(0, 5));
  };

  // Filter and pagination functions for chat sessions
  const getFilteredChatSessions = () => {
    let filtered = allChatSessions;
    
    // Apply search filter
    if (chatSessionSearchQuery) {
      filtered = filtered.filter(session => 
        session.data.lastMessage.toLowerCase().includes(chatSessionSearchQuery.toLowerCase()) ||
        session.data.userProfile.toLowerCase().includes(chatSessionSearchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (chatSessionTypeFilter !== 'all') {
      filtered = filtered.filter(session => session.data.lastMessageType === chatSessionTypeFilter);
    }
    
    // Apply sentiment filter
    if (chatSessionSentimentFilter !== 'all') {
      filtered = filtered.filter(session => {
        if (chatSessionSentimentFilter === 'positive') return session.data.sentiment.score > 0;
        if (chatSessionSentimentFilter === 'negative') return session.data.sentiment.score < 0;
        if (chatSessionSentimentFilter === 'neutral') return session.data.sentiment.score === 0;
        return true;
      });
    }
    
    return filtered;
  };

  const loadMoreChatSessions = () => {
    const filtered = getFilteredChatSessions();
    const nextPage = chatSessionPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * 5;
    
    setRecentChatSessions(filtered.slice(startIndex, endIndex));
    setChatSessionPage(nextPage);
  };

  const resetChatSessionPagination = () => {
    setChatSessionPage(1);
    const filtered = getFilteredChatSessions();
    setRecentChatSessions(filtered.slice(0, 5));
  };

  // Effect to reset pagination when filters change
  useEffect(() => {
    resetRequestPagination();
  }, [requestSearchQuery, requestStatusFilter, requestLabelFilter]);

  useEffect(() => {
    resetPostPagination();
  }, [postSearchQuery, postSourceFilter, postSentimentFilter]);

  useEffect(() => {
    resetChatSessionPagination();
  }, [chatSessionSearchQuery, chatSessionTypeFilter, chatSessionSentimentFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dallosh Overview</h1>
          <p className="text-gray-400">Monitor your support platform and customer service operations</p>
        </div>
        <div className="flex gap-3">
          {isAdmin() && (
            <Link href="/admin/dallosh/users">
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
          )}
          <Link href="/admin/dallosh/settings">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            <p className="text-xs text-gray-400">Registered customers</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Support Agents</CardTitle>
            <Headphones className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalAgents}</div>
            <p className="text-xs text-gray-400">Active agents</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalRequests}</div>
            <p className="text-xs text-gray-400">Support requests</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalChatSessions}</div>
            <p className="text-xs text-gray-400">Active conversations</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeRequests}</div>
            <p className="text-xs text-gray-400">Currently being processed</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Resolved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.resolvedRequests}</div>
            <p className="text-xs text-gray-400">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.averageResponseTime}m</div>
            <p className="text-xs text-gray-400">Minutes to first response</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Feedbacks</CardTitle>
            <MessageSquare className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFeedbacks}</div>
            <p className="text-xs text-gray-400">Customer feedback received</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Experience Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.averageFeedbackRating}/10</div>
            <p className="text-xs text-gray-400">Customer satisfaction score</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Support Requests */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">
                <FileText className="h-5 w-5 text-purple-400 inline mr-2" />
                Recent Support Requests
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRequestsCollapsed(!isRequestsCollapsed)}
              className="text-gray-400 hover:text-white"
            >
              {isRequestsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription className="text-gray-400">
            Latest customer support requests
          </CardDescription>
        </CardHeader>
        
        {!isRequestsCollapsed && (
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requests..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="processed">Processed</option>
                  <option value="done">Done</option>
                  <option value="fail">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={requestLabelFilter}
                  onChange={(e) => setRequestLabelFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Labels</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No support requests found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request.uid} className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{request.data.name}</span>
                        <Badge className={getLabelColor(request.data.label)}>
                          {request.data.label}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(request.data.status)}`} />
                        <span className="text-sm text-gray-400 capitalize">
                          {request.data.status}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{request.data.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.data.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(request.data.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Link href={`/admin/dallosh/requests/${request.uid}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
                
                {/* Load More Button */}
                {getFilteredRequests().length > recentRequests.length && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={loadMoreRequests}
                      variant="outline"
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent User Posts */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">
                <MessageSquare className="h-5 w-5 text-blue-400 inline mr-2" />
                Recent User Posts
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPostsCollapsed(!isPostsCollapsed)}
              className="text-gray-400 hover:text-white"
            >
              {isPostsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription className="text-gray-400">
            Latest social media posts from users
          </CardDescription>
        </CardHeader>
        
        {!isPostsCollapsed && (
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search posts..."
                    value={postSearchQuery}
                    onChange={(e) => setPostSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={postSourceFilter}
                  onChange={(e) => setPostSourceFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sources</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={postSentimentFilter}
                  onChange={(e) => setPostSentimentFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
            </div>

            {recentUserPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No user posts found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentUserPosts.map((post) => (
                  <div key={post.uid} className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{post.data.userName}</span>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {post.data.source}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${
                          post.data.sentiment.score > 0 ? 'bg-green-500' : 
                          post.data.sentiment.score < 0 ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm text-gray-400">
                          {post.data.sentiment.score > 0 ? 'Positive' : 
                           post.data.sentiment.score < 0 ? 'Negative' : 'Neutral'}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{post.data.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Score: {post.data.sentiment.score}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(post.data.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {getFilteredPosts().length > recentUserPosts.length && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={loadMorePosts}
                      variant="outline"
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Load More
                    </Button>
                    </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Chat Sessions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">
                <MessageSquare className="h-5 w-5 text-green-400 inline mr-2" />
                Recent Chat Sessions
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChatSessionsCollapsed(!isChatSessionsCollapsed)}
              className="text-gray-400 hover:text-white"
            >
              {isChatSessionsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription className="text-gray-400">
            Latest chat conversations with sentiment analysis
          </CardDescription>
        </CardHeader>
        
        {!isChatSessionsCollapsed && (
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search chat sessions..."
                    value={chatSessionSearchQuery}
                    onChange={(e) => setChatSessionSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={chatSessionTypeFilter}
                  onChange={(e) => setChatSessionTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="user">User</option>
                  <option value="bot">Bot</option>
                  <option value="assistant">Agent</option>
                </select>
                <select
                  value={chatSessionSentimentFilter}
                  onChange={(e) => setChatSessionSentimentFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
            </div>

            {recentChatSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No chat sessions found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentChatSessions.map((session) => (
                  <div key={session.uid} className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{session.data.userProfile}</span>
                        <Badge className={
                          session.data.lastMessageType === 'user' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          session.data.lastMessageType === 'bot' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }>
                          {session.data.lastMessageSender}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${
                          session.data.sentiment.score > 0 ? 'bg-green-500' : 
                          session.data.sentiment.score < 0 ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm text-gray-400">
                          {session.data.sentiment.score > 0 ? 'Positive' : 
                           session.data.sentiment.score < 0 ? 'Negative' : 'Neutral'}
                        </span>
                      </div>
                      
                      {/* Profile and Message Card */}
                      <div className="bg-gray-700 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                            session.data.lastMessageType === 'user' ? 'bg-blue-600' :
                            session.data.lastMessageType === 'bot' ? 'bg-purple-600' :
                            'bg-green-600'
                          }`}>
                            {session.data.lastMessageType === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : session.data.lastMessageType === 'bot' ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <Headphones className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-white">{session.data.lastMessageSender}</span>
                            <span className="text-xs text-gray-400 ml-2">• {session.data.userProfile}</span>
                          </div>
                        </div>
                        <p className="text-gray-200 text-sm">{session.data.lastMessage}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Score: {session.data.sentiment.score}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(session.data.lastMessageTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {getFilteredChatSessions().length > recentChatSessions.length && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={loadMoreChatSessions}
                      variant="outline"
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Support Requests</CardTitle>
            <CardDescription className="text-gray-400">
              View and manage customer support requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dallosh/requests">
              <Button className="w-full">Manage Requests</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Chat Sessions</CardTitle>
            <CardDescription className="text-gray-400">
              Monitor active chat conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dallosh/chat-sessions">
              <Button className="w-full">View Sessions</Button>
            </Link>
          </CardContent>
        </Card>

        {isAdmin() && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Management</CardTitle>
              <CardDescription className="text-gray-400">
                Manage users and create agent accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/dallosh/users">
                <Button className="w-full">Manage Users</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
