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
  StarOff,
  FileText,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ChatSession {
  uid: string;
  data: {
    name: string;
    authorName: string;
    createdAt: number;
  };
}

interface SupportRequest {
  uid: string;
  data: {
    name: string;
    description: string;
    status: string;
    createdAt: number;
  };
}

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

export default function FeedbacksPage() {
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [userRequests, setUserRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    chatSessionId: '',
    requestIds: [] as string[],
    botRating: 0,
    agentRating: 0,
    globalExperience: 5,
    comment: ''
  });

  useEffect(() => {
    if (user) {
      console.log('🔄 User authenticated, fetching feedbacks for:', user.uid);
      fetchUserFeedbacks();
      fetchChatSessions();
      fetchUserRequests();
      setupRealtimeListeners();
    } else {
      console.log('⚠️ No user found, cannot fetch feedbacks');
    }
  }, [user]);

  // Setup real-time listeners for feedbacks
  const setupRealtimeListeners = async () => {
    try {
      console.log('🔔 Setting up real-time listeners for customer feedbacks...');
      const client = await getSodularClient();
      if (!client) {
        console.error('❌ No Sodular client available for real-time listeners');
        return;
      }

      // Get or create feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      if (!feedbacksTable.data) {
        console.log('📋 Feedbacks table not found, setting up listeners will be skipped');
        return;
      }
      console.log('✅ Found feedbacks table:', feedbacksTable.data.uid);

      // Listen for new feedbacks
      const createListener = client.ref.from(feedbacksTable.data.uid).on('created', (data: any) => {
        if (data && data.data && data.data.userId === user?.uid) {
          console.log('📨 New feedback received in real-time:', data);
          setFeedbacks(prev => {
            const exists = prev.some(feedback => feedback.uid === data.uid);
            if (exists) return prev;
            return [data, ...prev];
          });
        }
      });

      // Listen for feedback updates
      const updateListener = client.ref.from(feedbacksTable.data.uid).on('patched', (data: any) => {
        if (data && data.data && data.data.userId === user?.uid) {
          console.log('📝 Feedback updated in real-time:', data);
          setFeedbacks(prev => prev.map(feedback => 
            feedback.uid === data.uid ? data : feedback
          ));
        }
      });

      // Listen for feedback deletions
      const deleteListener = client.ref.from(feedbacksTable.data.uid).on('deleted', (data: any) => {
        if (data && data.data && data.data.userId === user?.uid) {
          console.log('🗑️ Feedback deleted in real-time:', data);
          setFeedbacks(prev => prev.filter(feedback => feedback.uid !== data.uid));
        }
      });

      // Cleanup function - Note: Sodular client listeners don't have unsubscribe method
      return () => {
        console.log('🧹 Cleaning up feedback listeners');
      };
    } catch (error) {
      console.error('❌ Error setting up real-time feedback listeners:', error);
    }
  };

  const fetchUserFeedbacks = async () => {
    try {
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

      // Query feedbacks for current user
      const feedbacksResult = await client.ref.from(feedbacksTable.data.uid).query({
        filter: { 'data.userId': user!.uid },
        take: 100
      });

      if (feedbacksResult.data?.list) {
        const sortedFeedbacks = feedbacksResult.data.list.sort((a: any, b: any) => 
          (b.data.createdAt || 0) - (a.data.createdAt || 0)
        );
        setFeedbacks(sortedFeedbacks);
        console.log('✅ Fetched user feedbacks:', sortedFeedbacks.length);
      } else {
        setFeedbacks([]);
        console.log('No feedbacks found for user');
      }
    } catch (error) {
      console.error('Error fetching user feedbacks:', error);
      setFeedbacks([]);
    }
  };

  const fetchChatSessions = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create chat table
      let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data) return;

      // Query chat sessions for current user
      const chatResult = await client.ref.from(chatTable.data.uid).query({
        filter: { 'data.authorId': user!.uid },
        take: 100
      });

      if (chatResult.data?.list) {
        setChatSessions(chatResult.data.list);
        console.log('✅ Fetched chat sessions:', chatResult.data.list.length);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  const fetchUserRequests = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) return;

      // Query requests for current user
      const requestsResult = await client.ref.from(requestsTable.data.uid).query({
        filter: { 'data.userId': user!.uid },
        take: 100
      });

      if (requestsResult.data?.list) {
        setUserRequests(requestsResult.data.list);
        console.log('✅ Fetched user requests:', requestsResult.data.list.length);
      }
    } catch (error) {
      console.error('Error fetching user requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.comment.trim() || formData.globalExperience < 0) {
      alert('Please provide a comment and set your global experience rating.');
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      if (!feedbacksTable.data) return;

             const feedbackData = {
         userId: user!.uid,
         userName: user!.data?.fields?.displayName || user!.data?.username || 'Unknown',
         chatSessionId: formData.chatSessionId && formData.chatSessionId !== 'none' ? formData.chatSessionId : undefined,
         chatSessionName: formData.chatSessionId && formData.chatSessionId !== 'none' ? chatSessions.find(s => s.uid === formData.chatSessionId)?.data.name : undefined,
         requestIds: formData.requestIds.length > 0 ? formData.requestIds.join(',') : undefined,
         requestNames: formData.requestIds.length > 0 
           ? formData.requestIds.map(id => userRequests.find(r => r.uid === id)?.data.name).filter(Boolean).join(', ')
           : undefined,
         botRating: formData.botRating > 0 ? formData.botRating : undefined,
         agentRating: formData.agentRating > 0 ? formData.agentRating : undefined,
         globalExperience: formData.globalExperience,
         comment: formData.comment.trim(),
         createdAt: Date.now(),
       };

      if (editingFeedback) {
        // Update existing feedback
        const result = await client.ref.from(feedbacksTable.data.uid).patch(
          { uid: editingFeedback.uid },
          { data: { ...feedbackData, updatedAt: Date.now() } }
        );
        
        if (result.data) {
          console.log('Feedback updated successfully');
          setShowFeedbackForm(false);
          setEditingFeedback(null);
          resetForm();
          await fetchUserFeedbacks();
        }
      } else {
        // Create new feedback
        const result = await client.ref.from(feedbacksTable.data.uid).create({ data: feedbackData });
        
        if (result.data) {
          console.log('Feedback created successfully');
          setShowFeedbackForm(false);
          resetForm();
          await fetchUserFeedbacks();
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      if (!feedbacksTable.data?.uid) return;

      // Delete the feedback
      const result = await client.ref.from(feedbacksTable.data.uid).delete({ uid: feedbackId });
      
      if (!result.error) {
        console.log('Feedback deleted successfully');
        await fetchUserFeedbacks();
      } else {
        console.error('Failed to delete feedback:', result.error);
        alert('Failed to delete feedback: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Error deleting feedback. Please try again.');
    }
  };

     const handleEditFeedback = (feedback: Feedback) => {
     setEditingFeedback(feedback);
     setFormData({
       chatSessionId: feedback.data.chatSessionId || 'none',
       requestIds: feedback.data.requestIds ? 
         (Array.isArray(feedback.data.requestIds) ? feedback.data.requestIds : feedback.data.requestIds.split(',').filter(Boolean)) 
         : [],
       botRating: feedback.data.botRating || 0,
       agentRating: feedback.data.agentRating || 0,
       globalExperience: feedback.data.globalExperience,
       comment: feedback.data.comment
     });
     setShowFeedbackForm(true);
   };

     const resetForm = () => {
     setFormData({
       chatSessionId: 'none',
       requestIds: [],
       botRating: 0,
       agentRating: 0,
       globalExperience: 5,
       comment: ''
     });
   };

  const closeForm = () => {
    setShowFeedbackForm(false);
    setEditingFeedback(null);
    resetForm();
  };

  const renderStars = (rating: number, maxRating: number = 5) => {
    return Array.from({ length: maxRating }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => {
          if (editingFeedback) {
            setFormData(prev => ({ ...prev, botRating: i + 1 }));
          } else {
            setFormData(prev => ({ ...prev, botRating: i + 1 }));
          }
        }}
        className="text-2xl hover:scale-110 transition-transform"
      >
        {i < rating ? (
          <Star className="text-yellow-400 fill-current" />
        ) : (
          <StarOff className="text-gray-400" />
        )}
      </button>
    ));
  };

  const renderAgentStars = (rating: number, maxRating: number = 5) => {
    return Array.from({ length: maxRating }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => {
          if (editingFeedback) {
            setFormData(prev => ({ ...prev, agentRating: i + 1 }));
          } else {
            setFormData(prev => ({ ...prev, agentRating: i + 1 }));
          }
        }}
        className="text-2xl hover:scale-110 transition-transform"
      >
        {i < rating ? (
          <Star className="text-blue-400 fill-current" />
        ) : (
          <StarOff className="text-gray-400" />
        )}
      </button>
    ));
  };

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-white">Loading feedbacks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Feedbacks</h1>
          <Button 
            onClick={() => setShowFeedbackForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No feedbacks yet
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Share your experience with our service to help us improve.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {feedbacks.map((feedback) => (
              <Card 
                key={feedback.uid} 
                className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-gray-700"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(feedback.data.createdAt)}
                        </span>
                        {feedback.data.updatedAt && feedback.data.updatedAt !== feedback.data.createdAt && (
                          <Badge variant="secondary" className="text-xs">
                            Updated {formatDate(feedback.data.updatedAt)}
                          </Badge>
                        )}
                      </div>
                      
                      {feedback.data.chatSessionName && (
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Chat: {feedback.data.chatSessionName}
                          </span>
                        </div>
                      )}
                      
                      {feedback.data.requestNames && (
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Requests: {feedback.data.requestNames}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem
                          onClick={() => handleEditFeedback(feedback)}
                          className="text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Feedback
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteFeedback(feedback.uid)}
                          className="text-red-400 hover:bg-gray-700 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Feedback
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Ratings */}
                    <div className="flex items-center gap-6">
                      {feedback.data.botRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Bot:</span>
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < feedback.data.botRating! ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {feedback.data.agentRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Agent:</span>
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < feedback.data.agentRating! ? 'text-blue-400 fill-current' : 'text-gray-400'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Global Experience */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Global Experience:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feedback.data.globalExperience}/10
                      </span>
                      {feedback.data.globalExperience >= 7 ? (
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                      ) : feedback.data.globalExperience <= 3 ? (
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                    
                    {/* Comment */}
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {feedback.data.comment}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingFeedback ? 'Edit Feedback' : 'Submit Feedback'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeForm}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-6">
              {/* Chat Session Selection */}
              <div>
                <Label htmlFor="chatSession">Chat Session (Optional)</Label>
                                 <Select 
                   value={formData.chatSessionId} 
                   onValueChange={(value) => setFormData(prev => ({ ...prev, chatSessionId: value }))}
                 >
                   <SelectTrigger className="bg-white dark:bg-neutral-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                     <SelectValue placeholder="Select a chat session" />
                   </SelectTrigger>
                   <SelectContent className="bg-white dark:bg-neutral-800 border-gray-300 dark:border-gray-700">
                     <SelectItem value="none">None</SelectItem>
                     {chatSessions.map((session) => (
                       <SelectItem key={session.uid} value={session.uid}>
                         {session.data.name} - {formatDate(session.data.createdAt)}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>

              {/* Request Selection */}
              <div>
                <Label htmlFor="requests">Related Requests (Optional)</Label>
                <Select 
                  onValueChange={(value) => {
                    if (value && !formData.requestIds.includes(value)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        requestIds: [...prev.requestIds, value] 
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-neutral-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Add a request" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-800 border-gray-300 dark:border-gray-700">
                    {userRequests
                      .filter(req => !formData.requestIds.includes(req.uid))
                      .map((request) => (
                        <SelectItem key={request.uid} value={request.uid}>
                          {request.data.name} - {request.data.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {/* Selected Requests */}
                {formData.requestIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.requestIds.map((requestId) => {
                      const request = userRequests.find(r => r.uid === requestId);
                      return (
                        <Badge 
                          key={requestId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {request?.data.name || requestId}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              requestIds: prev.requestIds.filter(id => id !== requestId)
                            }))}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bot Rating */}
              <div>
                <Label>Bot Rating (Optional)</Label>
                <div className="flex items-center gap-2 mt-2">
                  {renderStars(formData.botRating)}
                  <span className="text-sm text-gray-500 ml-2">
                    {formData.botRating > 0 ? `${formData.botRating}/5` : 'Not rated'}
                  </span>
                </div>
              </div>

              {/* Agent Rating */}
              <div>
                <Label>Agent Rating (Optional)</Label>
                <div className="flex items-center gap-2 mt-2">
                  {renderAgentStars(formData.agentRating)}
                  <span className="text-sm text-gray-500 ml-2">
                    {formData.agentRating > 0 ? `${formData.agentRating}/5` : 'Not rated'}
                  </span>
                </div>
              </div>

              {/* Global Experience */}
              <div>
                <Label htmlFor="globalExperience">
                  Global Experience Rating (Required) - {formData.globalExperience}/10
                </Label>
                <div className="mt-2">
                  <Slider
                    value={[formData.globalExperience]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, globalExperience: value }))}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment">Comment (Required)</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with our service..."
                  className="bg-white dark:bg-neutral-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={4}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
