'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { 
  MessageSquare, 
  Star, 
  FileText,
  Search,
  Filter,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Feedback {
  uid: string;
  data: {
    userId: string;
    userName: string;
    chatSessionId?: string;
    chatSessionName?: string;
    requestIds?: string | string[];
    requestNames?: string;
    botRating?: number;
    agentRating?: number;
    globalExperience: number;
    comment: string;
    createdAt: number;
    updatedAt?: number;
  };
}

export default function AdminFeedbacksPage() {
  const { user, isAdmin, isAgent } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("");

  useEffect(() => {
    const initializeData = async () => {
      await fetchFeedbacks();
      await setupRealtimeListeners();
    };
    
    initializeData();
  }, []);

  // Setup real-time listeners for admin feedbacks
  const setupRealtimeListeners = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      if (!feedbacksTable.data) return;

      console.log('🔔 Setting up real-time feedback listeners for admin...');

      // Listen for new feedbacks
      const createListener = client.ref.from(feedbacksTable.data.uid).on('created', (data: any) => {
        console.log('📨 New feedback received in real-time for admin:', data);
        if (data && data.data && data.data.userId && data.data.comment) {
          setFeedbacks(prev => {
            const exists = prev.some(feedback => feedback.uid === data.uid);
            if (exists) return prev;
            return [data, ...prev];
          });
        }
      });

      // Listen for feedback updates
      const updateListener = client.ref.from(feedbacksTable.data.uid).on('patched', (data: any) => {
        console.log('📝 Feedback updated in real-time for admin:', data);
        if (data && data.data && data.data.userId) {
          setFeedbacks(prev => prev.map(feedback => 
            feedback.uid === data.uid ? data : feedback
          ));
        }
      });

      // Listen for feedback deletions
      const deleteListener = client.ref.from(feedbacksTable.data.uid).on('deleted', (data: any) => {
        console.log('🗑️ Feedback deleted in real-time for admin:', data);
        if (data && data.data && data.data.userId) {
          setFeedbacks(prev => prev.filter(feedback => feedback.uid !== data.uid));
        }
      });

      // Cleanup function - Note: Sodular client listeners don't have unsubscribe method
      return () => {
        console.log('🧹 Cleaning up admin feedback listeners');
      };
    } catch (error) {
      console.error('❌ Error setting up real-time feedback listeners for admin:', error);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) return;

      // Get or create feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      if (!feedbacksTable.data) {
        console.log('📋 Feedbacks table not found, creating...');
        const feedbacksSchema = {
          name: 'feedbacks',
          description: 'Customer feedback about service experience',
          fields: [
            { name: 'userId', type: 'text', required: true },
            { name: 'userName', type: 'text', required: true },
            { name: 'chatSessionId', type: 'text' },
            { name: 'chatSessionName', type: 'text' },
            { name: 'requestIds', type: 'text' },
            { name: 'requestNames', type: 'text' },
            { name: 'botRating', type: 'number' },
            { name: 'agentRating', type: 'number' },
            { name: 'globalExperience', type: 'number', required: true },
            { name: 'comment', type: 'text', required: true },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'updatedAt', type: 'number' },
          ],
        };
        feedbacksTable = await client.tables.create({ data: feedbacksSchema });
      }

      if (!feedbacksTable.data?.uid) {
        console.error('❌ Failed to get or create feedbacks table');
        return;
      }

      console.log("Fetching feedbacks from table:", feedbacksTable.data.uid);
      const result = await client.ref.from(feedbacksTable.data.uid).query({ take: 100 });
      console.log("Feedbacks result:", result);
      
      if (result.data?.list) {
        const sortedFeedbacks = result.data.list.sort((a: any, b: any) => 
          (b.data.createdAt || 0) - (a.data.createdAt || 0)
        );
        setFeedbacks(sortedFeedbacks);
        console.log('✅ Fetched feedbacks:', sortedFeedbacks.length);
      } else {
        console.log("No feedbacks found");
        setFeedbacks([]);
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter feedbacks based on search and filters
  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (!feedback || !feedback.data) return false;
    
    const matchesSearch = feedback.data.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feedback.data.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExperience = experienceFilter === 'all' || 
                             (experienceFilter === 'positive' && feedback.data.globalExperience >= 7) ||
                             (experienceFilter === 'neutral' && feedback.data.globalExperience >= 4 && feedback.data.globalExperience <= 6) ||
                             (experienceFilter === 'negative' && feedback.data.globalExperience <= 3);
    const matchesUser = !userFilter || 
                       feedback.data.userName?.toLowerCase().includes(userFilter.toLowerCase());
    
    return matchesSearch && matchesExperience && matchesUser;
  });

  const getExperienceColor = (rating: number) => {
    if (rating >= 7) return 'text-green-600';
    if (rating >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getExperienceLabel = (rating: number) => {
    if (rating >= 8) return 'Excellent';
    if (rating >= 7) return 'Good';
    if (rating >= 5) return 'Average';
    if (rating >= 3) return 'Poor';
    return 'Very Poor';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        <div className="text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading feedbacks...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Customer Feedbacks</h1>
          <p className="text-gray-400">Monitor customer satisfaction and service quality feedback</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search feedbacks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              
              {/* User Filter */}
              <Input
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-48 bg-gray-800 border-gray-700 text-white"
              />
              
              {/* Experience Filter */}
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="positive">Positive (7-10)</SelectItem>
                  <SelectItem value="neutral">Neutral (4-6)</SelectItem>
                  <SelectItem value="negative">Negative (0-3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{feedbacks.length}</div>
              <div className="text-sm text-gray-400">Total Feedbacks</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {feedbacks.filter(f => f.data.globalExperience >= 7).length}
              </div>
              <div className="text-sm text-gray-400">Positive (7-10)</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {feedbacks.filter(f => f.data.globalExperience >= 4 && f.data.globalExperience <= 6).length}
              </div>
              <div className="text-sm text-gray-400">Neutral (4-6)</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {feedbacks.filter(f => f.data.globalExperience <= 3).length}
              </div>
              <div className="text-sm text-gray-400">Negative (0-3)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedbacks List */}
      <div className="grid gap-4">
        {filteredFeedbacks.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400">
                {searchQuery || experienceFilter !== 'all' || userFilter ? 'No feedbacks match your filters' : 'No feedbacks yet'}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <Card key={feedback.uid} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-white">{feedback.data.userName}</span>
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">{formatDate(feedback.data.createdAt)}</span>
                        {feedback.data.updatedAt && feedback.data.updatedAt !== feedback.data.createdAt && (
                          <Badge variant="secondary" className="text-xs">
                            Updated {formatDate(feedback.data.updatedAt)}
                          </Badge>
                        )}
                      </div>
                      
                      {feedback.data.chatSessionName && (
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-400">
                            Chat: {feedback.data.chatSessionName}
                          </span>
                        </div>
                      )}
                      
                      {feedback.data.requestNames && (
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-400">
                            Requests: {feedback.data.requestNames}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Global Experience Badge */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getExperienceColor(feedback.data.globalExperience)}`}>
                        {feedback.data.globalExperience}/10
                      </div>
                      <div className="text-sm text-gray-400">
                        {getExperienceLabel(feedback.data.globalExperience)}
                      </div>
                      {feedback.data.globalExperience >= 7 ? (
                        <ThumbsUp className="h-4 w-4 text-green-500 mx-auto mt-1" />
                      ) : feedback.data.globalExperience <= 3 ? (
                        <ThumbsDown className="h-4 w-4 text-red-500 mx-auto mt-1" />
                      ) : null}
                    </div>
                  </div>
                  
                  {/* Ratings */}
                  <div className="flex items-center gap-6">
                    {feedback.data.botRating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Bot Rating:</span>
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < feedback.data.botRating! ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">({feedback.data.botRating}/5)</span>
                      </div>
                    )}
                    
                    {feedback.data.agentRating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Agent Rating:</span>
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < feedback.data.agentRating! ? 'text-blue-400 fill-current' : 'text-gray-600'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">({feedback.data.agentRating}/5)</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Comment */}
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-300 leading-relaxed">
                      {feedback.data.comment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


