'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Clock, 
  User,
  Calendar,
  Eye,
  Send,
  Bot,
  Headphones,
  Wifi,
  WifiOff,
  Loader2,
  FileText,
  TrendingUp
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useAuthStore } from "@/stores/auth";
import { analyzePostSentiment } from "@/utils/postAnalysis";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatSession {
  uid: string;
  data: {
    name: string;
    type: string;
    status: string;
    source: string;
    sourceId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: number;
    lastMessage: string;
    lastMessageTime: number;
    agentId?: string; // Track if agent has joined
    sentiment?: {
      score: number;
      comparative: number;
      positive: any[];
      negative: any[];
    };
  };
}

interface ChatMessage {
  uid: string;
  data: {
    chatId: string;
    content: string;
    senderId: string;
    senderName: string;
    senderType: 'user' | 'assistant';
    createdAt: number;
    isRead: boolean;
    agentId?: string; // Track if message is from agent
  };
}

export default function ChatSessionsPage() {
  const { user, isAdmin, isAgent } = useAuthStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAgentJoined, setIsAgentJoined] = useState(false);
  
  // Request creation state
  const [showCreateRequestDialog, setShowCreateRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: '',
    description: '',
    label: 'normal' as 'urgent' | 'normal' | 'low'
  });
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  
  // Table UIDs
  const [tableUIDs, setTableUIDs] = useState<{
    chat?: string;
    messages?: string;
  }>({});
  
  // Real-time listeners
  const [listeners, setListeners] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeTables();
    setupChatSessionListeners();
    return () => {
      // Cleanup listeners
      listeners.forEach(listener => {
        if (listener && typeof listener.unsubscribe === 'function') {
          listener.unsubscribe();
        }
      });
    };
  }, []);

  // Setup real-time listeners for chat sessions
  const setupChatSessionListeners = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create chat table
      let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data) return;

      console.log('🔔 Setting up real-time chat session listeners for admin...');

      // Listen for new chat sessions
      const createListener = client.ref.from(chatTable.data.uid).on('created', (data: any) => {
        console.log('💬 New chat session received in real-time for admin:', data);
        setSessions(prev => {
          // Check if session already exists
          const exists = prev.some(session => session.uid === data.uid);
          if (exists) return prev;
          return [data, ...prev];
        });
      });

      // Listen for chat session updates
      const updateListener = client.ref.from(chatTable.data.uid).on('patched', (data: any) => {
        console.log('📝 Chat session updated in real-time for admin:', data);
        setSessions(prev => prev.map(session => 
          session.uid === data.uid ? { ...session, data: { ...session.data, ...data.data } } : session
        ));
      });

      // Listen for chat session deletions
      const deleteListener = client.ref.from(chatTable.data.uid).on('deleted', (data: any) => {
        console.log('🗑️ Chat session deleted in real-time for admin:', data);
        setSessions(prev => prev.filter(session => session.uid !== data.uid));
        // If deleted session was selected, clear selection
        if (selectedSession?.uid === data.uid) {
          setSelectedSession(null);
          setMessages([]);
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
      console.error('❌ Error setting up real-time chat session listeners for admin:', error);
    }
  };

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.uid);
      setupRealtimeListeners(selectedSession.uid);
    }
  }, [selectedSession, tableUIDs.messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeTables = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create chat table
      let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data) {
        const chatSchema = {
          name: 'chat',
          description: 'Chat sessions',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'type', type: 'text', required: true },
            { name: 'status', type: 'text', required: true },
            { name: 'source', type: 'text', required: true },
            { name: 'sourceId', type: 'text', required: true },
            { name: 'authorId', type: 'text', required: true },
            { name: 'authorName', type: 'text', required: true },
            { name: 'content', type: 'text', required: true },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'lastMessage', type: 'text' },
            { name: 'lastMessageTime', type: 'number' },
            { name: 'agentId', type: 'text' },
          ],
        };
        chatTable = await client.tables.create({ data: chatSchema });
      }

      // Get or create messages table
      let messagesTable = await client.tables.get({ filter: { 'data.name': 'messages' } });
      if (!messagesTable.data) {
        const messagesSchema = {
          name: 'messages',
          description: 'Chat messages',
          fields: [
            { name: 'chatId', type: 'text', required: true },
            { name: 'content', type: 'text', required: true },
            { name: 'senderId', type: 'text', required: true },
            { name: 'senderName', type: 'text', required: true },
            { name: 'senderType', type: 'text', required: true },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'isRead', type: 'boolean', defaultValue: false },
            { name: 'agentId', type: 'text' },
          ],
        };
        messagesTable = await client.tables.create({ data: messagesSchema });
      }

      setTableUIDs({
        chat: chatTable.data?.uid,
        messages: messagesTable.data?.uid,
      });

      // Fetch sessions after tables are ready
      if (chatTable.data?.uid) {
        await fetchChatSessions(chatTable.data.uid);
      }
    } catch (error) {
      console.error("Error initializing tables:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatSessions = async (chatTableUID: string) => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.ref.from(chatTableUID).query({ take: 100 });
      if (result.data?.list) {
        // Process sessions to add sentiment analysis
        const sessionsWithSentiment = await Promise.all(
          result.data.list.map(async (session: any) => {
            try {
              // Calculate sentiment from session content or last message
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
                ...session,
                data: {
                  ...session.data,
                  sentiment
                }
              };
            } catch (error) {
              console.error('❌ Error processing session sentiment:', session.uid, error);
              return session;
            }
          })
        );
        
        const sortedSessions = sessionsWithSentiment.sort((a: any, b: any) => 
          (b.data.lastMessageTime || b.data.createdAt) - (a.data.lastMessageTime || a.data.createdAt)
        );
        setSessions(sortedSessions);
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      if (!tableUIDs.messages) return;
      
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.ref.from(tableUIDs.messages).query({
        filter: { 'data.chatId': sessionId },
        take: 100,
      });

      if (result.data?.list) {
        const sortedMessages = result.data.list.sort((a: any, b: any) => 
          (a.data.createdAt || 0) - (b.data.createdAt || 0)
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupRealtimeListeners = async (sessionId: string) => {
    if (!tableUIDs.messages) return;

    // Cleanup existing listeners
    listeners.forEach(listener => {
      if (listener && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }
    });

    const client = await getSodularClient();
    if (!client) return;

    // Listen for new messages in this session
    const messageListener = client.ref.from(tableUIDs.messages).on('created', (data: any) => {
      if (data.data.chatId === sessionId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => msg.uid === data.uid);
          if (exists) return prev;
          return [...prev, data];
        });
      }
    });

    // Listen for message updates
    const updateListener = client.ref.from(tableUIDs.messages).on('patched', (data: any) => {
      if (data.data.chatId === sessionId) {
        setMessages(prev => prev.map(msg => 
          msg.uid === data.uid ? { ...msg, data: { ...msg.data, ...data.data } } : msg
        ));
      }
    });

    setListeners([messageListener, updateListener]);
  };

  const handleJoinSession = async (session: ChatSession) => {
    try {
      if (!tableUIDs.chat) return;
      
      const client = await getSodularClient();
      if (!client) return;

      // Update session to mark agent as joined
      await client.ref.from(tableUIDs.chat).patch({ uid: session.uid }, {
        data: {
          agentId: user?.uid,
          status: 'agent_joined'
        }
      });

      setIsAgentJoined(true);
      setSelectedSession({ ...session, data: { ...session.data, agentId: user?.uid, status: 'agent_joined' } });
      
      // Update sessions list
      setSessions(prev => prev.map(s => 
        s.uid === session.uid 
          ? { ...s, data: { ...s.data, agentId: user?.uid, status: 'agent_joined' } }
          : s
      ));
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const handleLeaveSession = async () => {
    if (!selectedSession || !tableUIDs.chat) return;
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Update session to remove agent
      await client.ref.from(tableUIDs.chat).patch({ uid: selectedSession.uid }, {
        data: {
          agentId: null,
          status: 'active'
        }
      });

      setIsAgentJoined(false);
      setSelectedSession({ ...selectedSession, data: { ...selectedSession.data, agentId: undefined, status: 'active' } });
      
      // Update sessions list
      setSessions(prev => prev.map(s => 
        s.uid === selectedSession.uid 
          ? { ...s, data: { ...s.data, agentId: undefined, status: 'active' } }
          : s
      ));
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || !tableUIDs.messages) return;
    
    try {
      setIsSending(true);
      const client = await getSodularClient();
      if (!client) return;

      const messageData = {
        chatId: selectedSession.uid,
        content: newMessage.trim(),
        senderId: user?.uid || 'agent',
        senderName: user?.data?.fields?.displayName || user?.data?.username || 'Agent',
        senderType: 'assistant' as const,
        createdAt: Date.now(),
        isRead: false,
        agentId: user?.uid, // Mark this as agent message
      };

      const result = await client.ref.from(tableUIDs.messages).create({
        data: messageData
      });

      if (result.data) {
        // Update session's last message
        if (tableUIDs.chat) {
          await client.ref.from(tableUIDs.chat).patch({ uid: selectedSession.uid }, {
            data: {
              lastMessage: newMessage.trim(),
              lastMessageTime: Date.now(),
            }
          });
        }

        setNewMessage("");
        
        // Update sessions list
        setSessions(prev => prev.map(s => 
          s.uid === selectedSession.uid 
            ? { ...s, data: { ...s.data, lastMessage: newMessage.trim(), lastMessageTime: Date.now() } }
            : s
        ));
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat session? This action cannot be undone.")) {
      return;
    }

    try {
      if (!tableUIDs.chat) return;
      
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.ref.from(tableUIDs.chat).delete({ uid: sessionId });
      
      if (!result.error) {
        console.log("Chat session deleted successfully");
        if (selectedSession?.uid === sessionId) {
          setSelectedSession(null);
          setMessages([]);
        }
        if (tableUIDs.chat) {
          await fetchChatSessions(tableUIDs.chat as string);
        }
      } else {
        console.error("Failed to delete chat session:", result.error);
        alert("Failed to delete chat session: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting chat session:", error);
      alert("Error deleting chat session. Please try again.");
    }
  };

  // Handle request creation
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.name.trim() || !requestForm.description.trim() || !selectedSession || !user) {
      return;
    }

    try {
      setIsCreatingRequest(true);
      
      const client = await getSodularClient();
      if (!client) return;

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) {
        const requestsSchema = {
          name: 'requests',
          description: 'Support requests',
          fields: [
            { name: 'chatId', type: 'text', required: true },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text', required: true },
            { name: 'userId', type: 'text', required: true },
            { name: 'userName', type: 'text', required: true },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'label', type: 'text', required: true },
            { name: 'status', type: 'text', required: true },
            { name: 'createdByAgent', type: 'text' },
            { name: 'agentId', type: 'text' },
            { name: 'agentName', type: 'text' },
          ],
        };
        requestsTable = await client.tables.create({ data: requestsSchema });
      }

      if (!requestsTable.data?.uid) {
        throw new Error('Failed to get or create requests table');
      }

      const requestData = {
        chatId: selectedSession.uid,
        name: requestForm.name.trim(),
        description: requestForm.description.trim(),
        userId: selectedSession.data.authorId,
        userName: selectedSession.data.authorName,
        createdAt: Date.now(),
        label: requestForm.label,
        status: 'ongoing',
        createdByAgent: user.uid,
        agentId: user.uid,
        agentName: user.data?.fields?.displayName || user.data?.username || 'Agent',
      };

      const result = await client.ref.from(requestsTable.data.uid).create({
        data: requestData
      });

      if (result.data) {
        console.log('✅ Request created successfully:', result.data);
        setShowCreateRequestDialog(false);
        setRequestForm({ name: '', description: '', label: 'normal' });
        alert('Request created successfully!');
      } else {
        console.error('❌ Failed to create request:', result.error);
        alert('Failed to create request: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error creating request:', error);
      alert('Error creating request. Please try again.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const resetRequestForm = () => {
    setRequestForm({
      name: '',
      description: '',
      label: 'normal'
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'agent_joined':
        return 'bg-blue-500';
      case 'resolved':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get agent display name
  const getAgentDisplayName = (agentId: string) => {
    if (agentId === user?.uid) {
      return user?.data?.fields?.displayName || user?.data?.username || 'You';
    }
    return 'Support Agent';
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.data.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.data.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || session.data.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  if (!isAdmin() && !isAgent()) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Access Denied</div>
        <div className="text-gray-400">You don't have permission to access this page.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading chat sessions...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Left Sidebar - Chat Sessions List */}
      <div className="w-80 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Chat Sessions</h2>
          
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="agent_joined">Agent Joined</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="overflow-y-auto h-[calc(100vh-300px)]">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No chat sessions found
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.uid}
                className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                  selectedSession?.uid === session.uid ? 'bg-gray-800' : ''
                }`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white truncate">{session.data.name}</h3>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(session.data.status)}`} />
                </div>
                
                <div className="text-sm text-gray-400 mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="h-3 w-3" />
                    <span>{session.data.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(session.data.createdAt)}</span>
                  </div>
                </div>
                
                {session.data.lastMessage && (
                  <p className="text-sm text-gray-300 truncate">
                    {session.data.lastMessage}
                  </p>
                )}
                
                {/* Sentiment Indicator */}
                {session.data.sentiment && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${
                      session.data.sentiment.score > 0 ? 'bg-green-500' : 
                      session.data.sentiment.score < 0 ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-xs text-gray-400">
                      {session.data.sentiment.score > 0 ? 'Positive' : 
                       session.data.sentiment.score < 0 ? 'Negative' : 'Neutral'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Score: {session.data.sentiment.score}
                    </span>
                  </div>
                )}
                
                {session.data.agentId && (
                  <div className="flex items-center gap-1 mt-2">
                    <Headphones className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-blue-400">
                      {getAgentDisplayName(session.data.agentId)} joined
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
        {selectedSession ? (
          <>
            {/* Session Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedSession.data.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>By: {selectedSession.data.authorName}</span>
                    <span>Source: {selectedSession.data.source}</span>
                    <span>Created: {formatDate(selectedSession.data.createdAt)}</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedSession.data.status)}`} />
                    <span className="capitalize">{selectedSession.data.status}</span>
                    {selectedSession.data.agentId && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Headphones className="h-3 w-3" />
                        {getAgentDisplayName(selectedSession.data.agentId)} is here
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Create Request Button - Always visible for agents */}
                  <Dialog open={showCreateRequestDialog} onOpenChange={setShowCreateRequestDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Create Support Request</DialogTitle>
                        <DialogDescription>
                          Create a support request on behalf of <strong className="text-green-400">{selectedSession.data.authorName}</strong> for this chat session.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateRequest} className="space-y-4">
                        <div>
                          <Label htmlFor="request-name" className="text-white">Request Title</Label>
                          <Input
                            id="request-name"
                            value={requestForm.name}
                            onChange={(e) => setRequestForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Brief description of the issue"
                            className="bg-gray-700 border-gray-600 text-white"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="request-description" className="text-white">Description</Label>
                          <Textarea
                            id="request-description"
                            value={requestForm.description}
                            onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Detailed description of the problem"
                            className="bg-gray-700 border-gray-600 text-white"
                            rows={4}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="request-label" className="text-white">Priority</Label>
                          <Select
                            value={requestForm.label}
                            onValueChange={(value: 'urgent' | 'normal' | 'low') => 
                              setRequestForm(prev => ({ ...prev, label: value }))
                            }
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCreateRequestDialog(false);
                              resetRequestForm();
                            }}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isCreatingRequest || !requestForm.name.trim() || !requestForm.description.trim()}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isCreatingRequest ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Create Request
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {selectedSession.data.agentId === user?.uid ? (
                    <Button
                      onClick={handleLeaveSession}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Leave Session
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleJoinSession(selectedSession)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      Join Session
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem
                        onClick={() => handleDeleteSession(selectedSession.uid)}
                        className="text-red-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Session
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Sticky Pinned Post Card */}
              <div className="sticky top-0 z-10 pb-2">
                <div className="bg-gray-800 text-white rounded-lg p-4 border border-gray-700 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{selectedSession.data.authorName}</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(selectedSession.data.createdAt)}
                        </span>
                      </div>
                      <div className="text-gray-300 text-sm">
                        <div className="mb-2">
                          <strong className="text-white">Original post from {selectedSession.data.source}:</strong>
                        </div>
                        <div className="bg-gray-700 text-white rounded p-2 border border-gray-600">
                          {selectedSession.data.content}
                        </div>
                      </div>
                      
                      {/* Sentiment Analysis */}
                      {selectedSession.data.sentiment && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`w-2 h-2 rounded-full ${
                            selectedSession.data.sentiment.score > 0 ? 'bg-green-500' : 
                            selectedSession.data.sentiment.score < 0 ? 'bg-red-500' : 'bg-gray-500'
                          }`} />
                          <span className="text-xs text-gray-400">
                            {selectedSession.data.sentiment.score > 0 ? 'Positive' : 
                             selectedSession.data.sentiment.score < 0 ? 'Negative' : 'Neutral'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {selectedSession.data.sentiment.score}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.uid}
                    className={`flex gap-3 ${
                      message.data.senderType === 'user' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {/* Profile image for user messages (left side) */}
                    {message.data.senderType === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-600 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    {/* Message content */}
                    <div className={`max-w-[70%] ${message.data.senderType === 'user' ? 'order-1' : ''}`}>
                      <div className={`px-4 py-2 rounded-2xl ${
                        message.data.senderType === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.data.agentId
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        <div className="text-sm">{message.data.content}</div>
                        
                        {/* Show if message is from agent */}
                        {message.data.agentId && (
                          <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                            <Headphones className="h-3 w-3" />
                            Agent response
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(message.data.createdAt)}</span>
                        <span>•</span>
                        <span>{message.data.senderName}</span>
                      </div>
                    </div>
                    
                    {/* Profile image for bot/agent messages (right side) */}
                    {message.data.senderType === 'assistant' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={
                          message.data.agentId 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                        }>
                          {message.data.agentId ? (
                            <Headphones className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-3">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedSession.data.agentId && selectedSession.data.agentId === user?.uid 
                    ? `Type your message as ${getAgentDisplayName(selectedSession.data.agentId)}...` 
                    : "Join the session to send messages..."
                  }
                  className="flex-1 bg-gray-800 border-gray-700 text-white resize-none"
                  rows={2}
                  disabled={selectedSession.data.agentId !== user?.uid}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || selectedSession.data.agentId !== user?.uid || isSending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {selectedSession.data.agentId !== user?.uid && (
                <p className="text-xs text-gray-500 mt-2">
                  Join the session to send messages as an agent
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg">Select a chat session to view messages</p>
              <p className="text-sm">Choose from the list on the left to start monitoring conversations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
