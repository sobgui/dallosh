'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Grid3X3,
  List,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSodularClient } from "@/services/client";
import { 
  findSimilarPosts, 
  calculateSentimentStats, 
  groupPostsBySource,
  PostSimilarityGroup 
} from "@/utils/postAnalysis";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  totalAgents: number;
  totalRequests: number;
  totalChatSessions: number;
  totalFeedbacks: number;
  totalPosts: number;
  averageResponseTime: number;
  averageFeedbackRating: number;
  averageSentimentScore: number;
  requestStatusDistribution: {
    ongoing: number;
    processed: number;
    done: number;
    fail: number;
    cancelled: number;
  };
  feedbackRatingDistribution: {
    excellent: number;
    good: number;
    neutral: number;
    poor: number;
  };
  postSourceDistribution: {
    twitter: number;
    facebook: number;
    instagram: number;
    linkedin: number;
    other: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  chatSentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  averageChatSentimentScore: number;
  monthlyGrowth: {
    users: number;
    requests: number;
    sessions: number;
    feedbacks: number;
    posts: number;
  };
}

export default function AnalyticsPage() {
  const [similarPosts, setSimilarPosts] = useState<PostSimilarityGroup[]>([]);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  
  // Download functionality state
  const [showDataExportModal, setShowDataExportModal] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'docx'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  // Add print styles when component mounts
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .analytics-content, .analytics-content * {
          visibility: visible;
        }
        .analytics-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white !important;
          color: black !important;
        }
        .no-print {
          display: none !important;
        }
        .bg-gray-900, .bg-gray-800 {
          background: white !important;
          border: 1px solid #ddd !important;
        }
        .text-white {
          color: black !important;
        }
        .text-gray-400 {
          color: #666 !important;
        }
        .text-green-400, .text-blue-400, .text-purple-400, .text-yellow-400, .text-orange-400 {
          color: #333 !important;
        }
        .border-gray-700, .border-gray-800 {
          border-color: #ddd !important;
        }
        .shadow-lg {
          box-shadow: none !important;
        }
        .h-64 {
          height: 200px !important;
        }
        .grid {
          display: block !important;
        }
        .md\\:grid-cols-2, .md\\:grid-cols-3, .md\\:grid-cols-4, .md\\:grid-cols-5 {
          grid-template-columns: none !important;
        }
        .gap-6 {
          gap: 1rem !important;
        }
        .space-y-6 > * + * {
          margin-top: 1rem !important;
        }
        .recharts-wrapper {
          page-break-inside: avoid !important;
        }
        .recharts-surface {
          max-width: 100% !important;
        }
        .h-80 {
          height: 300px !important;
        }
        .h-64 {
          height: 200px !important;
        }
        .grid-cols-1, .grid-cols-2, .grid-cols-3, .grid-cols-4, .grid-cols-5 {
          grid-template-columns: 1fr !important;
        }
        .md\\:grid-cols-2, .md\\:grid-cols-3, .md\\:grid-cols-4, .md\\:grid-cols-5 {
          grid-template-columns: 1fr !important;
        }
        .lg\\:grid-cols-2 {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalAgents: 0,
    totalRequests: 0,
    totalChatSessions: 0,
    totalFeedbacks: 0,
    totalPosts: 0,
    averageResponseTime: 0,
    averageFeedbackRating: 0,
    averageSentimentScore: 0,
    requestStatusDistribution: {
      ongoing: 0,
      processed: 0,
      done: 0,
      fail: 0,
      cancelled: 0,
    },
    feedbackRatingDistribution: {
      excellent: 0,
      poor: 0,
      neutral: 0,
      good: 0,
    },
    postSourceDistribution: {
      twitter: 0,
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      other: 0,
    },
    sentimentDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    chatSentimentDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    averageChatSentimentScore: 0,
    monthlyGrowth: {
      users: 0,
      requests: 0,
      sessions: 0,
      feedbacks: 0,
      posts: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) return;

      // Fetch users
      const usersResult = await client.auth.query({ take: 100 });
      const users = usersResult.data?.list || [];

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) {
        console.log('📋 Requests table not found');
        setAnalytics(prev => ({ 
          ...prev, 
          totalRequests: 0, 
          requestStatusDistribution: { ongoing: 0, processed: 0, done: 0, fail: 0, cancelled: 0 },
          averageResponseTime: 0,
          monthlyGrowth: { ...prev.monthlyGrowth, requests: 0 }
        }));
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
        setAnalytics(prev => ({ 
          ...prev, 
          totalChatSessions: 0,
          monthlyGrowth: { ...prev.monthlyGrowth, sessions: 0 }
        }));
        setIsLoading(false);
        return;
      }

      // Fetch chat sessions
      const chatResult = await client.ref.from(chatTable.data.uid).query({ take: 100 });
      const chatSessions = chatResult.data?.list || [];
      console.log('💬 Chat sessions found:', chatSessions.length);
      if (chatSessions.length > 0) {
        console.log('💬 Sample chat session:', {
          uid: chatSessions[0].uid,
          source: chatSessions[0].data.source,
          hasContent: !!chatSessions[0].data.content,
          contentLength: chatSessions[0].data.content?.length || 0
        });
      }

      // Get or create feedbacks table
      let feedbacksTable = await client.tables.get({ filter: { 'data.name': 'feedbacks' } });
      let totalFeedbacks = 0;
      let averageFeedbackRating = 0;
      let feedbackRatingDistribution = { excellent: 0, good: 0, neutral: 0, poor: 0 };
      let feedbacks: any[] = [];
      
      if (feedbacksTable.data) {
        const feedbacksResult = await client.ref.from(feedbacksTable.data.uid).query({ take: 100 });
        feedbacks = feedbacksResult.data?.list || [];
        totalFeedbacks = feedbacks.length;
        
        // Calculate average global experience rating
        const validRatings = feedbacks
          .filter(feedback => feedback.data.globalExperience && feedback.data.globalExperience > 0)
          .map(feedback => feedback.data.globalExperience);
        
        if (validRatings.length > 0) {
          averageFeedbackRating = Math.round((validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length) * 10) / 10;
        }

        // Calculate rating distribution
        feedbacks.forEach(feedback => {
          if (feedback.data.globalExperience) {
            if (feedback.data.globalExperience >= 8) feedbackRatingDistribution.excellent++;
            else if (feedback.data.globalExperience >= 6) feedbackRatingDistribution.good++;
            else if (feedback.data.globalExperience >= 4) feedbackRatingDistribution.neutral++;
            else feedbackRatingDistribution.poor++;
          }
        });
      }

             // Get posts from chat sessions (chat sessions have source and content)
       let totalPosts = 0;
       let averageSentimentScore = 0;
       let postSourceDistribution = { twitter: 0, facebook: 0, instagram: 0, linkedin: 0, other: 0 };
       let sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
       let postsFromChat: any[] = [];
       
       // Initialize chat sentiment variables at the top level
       let chatSentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
       let averageChatSentimentScore = 0;
       
       if (chatTable.data) {
         // Filter chat sessions that have source and content (these are posts)
         postsFromChat = chatSessions.filter(session => 
           session.data.source && session.data.content
         );
         
         totalPosts = postsFromChat.length;
         
         if (totalPosts > 0) {
           try {
             // Use utility functions for analysis
             const sentimentStats = calculateSentimentStats(postsFromChat.map(p => ({ content: p.data.content })));
             const sourceGroups = groupPostsBySource(postsFromChat.map(p => ({ source: p.data.source, content: p.data.content })));
             
             averageSentimentScore = sentimentStats.averageScore;
             sentimentDistribution = sentimentStats.distribution;
             
             // Calculate source distribution
             postSourceDistribution = {
               twitter: sourceGroups.twitter?.length || 0,
               facebook: sourceGroups.facebook?.length || 0,
               instagram: sourceGroups.instagram?.length || 0,
               linkedin: sourceGroups.linkedin?.length || 0,
               other: sourceGroups.other?.length || 0
             };
             
             // Find similar posts for similarity analysis
             const similarGroups = findSimilarPosts(postsFromChat.map(p => ({
               uid: p.uid,
               content: p.data.content,
               userName: p.data.userName || 'Unknown User',
               source: p.data.source,
               createdAt: p.data.createdAt
             })));
             
             setSimilarPosts(similarGroups);
           } catch (error) {
             console.error('Error analyzing posts:', error);
             // Fallback to neutral values if analysis fails
             averageSentimentScore = 0;
             sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
             postSourceDistribution = { twitter: 0, facebook: 0, instagram: 0, linkedin: 0, other: 0 };
           }
         }
         
         // Calculate chat sentiment analysis from chat sessions
         if (chatSessions.length > 0) {
           try {
             // Get messages table for chat sentiment analysis
             let messagesTable = await client.tables.get({ filter: { 'data.name': 'messages' } });
             if (messagesTable.data) {
               console.log('📊 Messages table found, UID:', messagesTable.data.uid);
               
               try {
                 // Get all messages from chat sessions (API limit is 100)
                 const messagesResult = await client.ref.from(messagesTable.data.uid).query({ take: 100 });
                 console.log('📨 Messages query result (API limit: 100):', messagesResult);
                 
                 if (messagesResult.error) {
                   console.warn('⚠️ Messages query had errors:', messagesResult.error);
                 }
                 
                 const allMessages = messagesResult.data?.list || [];
                 console.log('📨 Total messages found:', allMessages.length);
                 
                 // Filter messages from users (not bots/agents)
                 const userMessages = allMessages.filter(msg => 
                   msg.data.senderType === 'user' && 
                   msg.data.content && 
                   msg.data.content.trim().length > 0
                 );
                 
                 console.log('👤 User messages found:', userMessages.length);
                 
                 if (userMessages.length > 0) {
                   // Calculate sentiment for user messages in chat sessions
                   const chatSentimentStats = calculateSentimentStats(
                     userMessages.map(msg => ({ content: msg.data.content }))
                   );
                   
                   chatSentimentDistribution = chatSentimentStats.distribution;
                   averageChatSentimentScore = chatSentimentStats.averageScore;
                   
                   console.log('😊 Chat sentiment calculated:', {
                     distribution: chatSentimentDistribution,
                     averageScore: averageChatSentimentScore
                   });
                 } else {
                   console.log('ℹ️ No user messages found for sentiment analysis');
                   // Set a default neutral state when no messages exist
                   chatSentimentDistribution = { positive: 0, neutral: 1, negative: 0 };
                   averageChatSentimentScore = 0;
                 }
               } catch (queryError) {
                 console.error('❌ Error querying messages table:', queryError);
                 // Fallback to neutral values if query fails
                 chatSentimentDistribution = { positive: 0, neutral: 1, negative: 0 };
                 averageChatSentimentScore = 0;
               }
             } else {
               console.log('ℹ️ Messages table not found, skipping chat sentiment analysis');
             }
           } catch (error) {
             console.error('❌ Error analyzing chat sentiment:', error);
             // Fallback to neutral values if analysis fails
             chatSentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
             averageChatSentimentScore = 0;
           }
         } else {
           console.log('ℹ️ No chat sessions found, setting default chat sentiment');
           // Set default values when no chat sessions exist
           chatSentimentDistribution = { positive: 0, neutral: 1, negative: 0 };
           averageChatSentimentScore = 0;
         }
       }

       // Calculate analytics
      const totalUsers = users.filter(user => user.data.fields?.role !== 'agent').length;
      const totalAgents = users.filter(user => user.data.fields?.role === 'agent').length;
      const totalRequests = requests.length;
      const totalChatSessions = chatSessions.length;

      // Calculate request status distribution
      const requestStatusDistribution = {
        ongoing: requests.filter(req => req.data.status === 'ongoing').length,
        processed: requests.filter(req => req.data.status === 'processed').length,
        done: requests.filter(req => req.data.status === 'done').length,
        fail: requests.filter(req => req.data.status === 'fail').length,
        cancelled: requests.filter(req => req.data.status === 'cancelled').length,
      };

      // Calculate average response time
      const responseTimes = requests
        .filter(req => req.data.processedAt && req.data.createdAt)
        .map(req => req.data.processedAt - req.data.createdAt);
      
      const averageResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60))
        : 0;

      // Calculate monthly growth (simplified)
      const now = Date.now();
      const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      const monthlyGrowth = {
        users: users.filter(user => user.data.createdAt > oneMonthAgo).length,
        requests: requests.filter(req => req.data.createdAt > oneMonthAgo).length,
        sessions: chatSessions.filter(session => session.data.createdAt > oneMonthAgo).length,
        feedbacks: feedbacksTable.data ? feedbacks.filter(feedback => feedback.data.createdAt > oneMonthAgo).length : 0,
        posts: chatTable.data ? postsFromChat.filter(post => post.data.createdAt > oneMonthAgo).length : 0,
      };

      console.log('📊 Final analytics state:', {
        totalUsers,
        totalAgents,
        totalRequests,
        totalChatSessions,
        totalFeedbacks,
        totalPosts,
        averageResponseTime,
        averageFeedbackRating,
        averageSentimentScore,
        requestStatusDistribution,
        feedbackRatingDistribution,
        postSourceDistribution,
        sentimentDistribution,
        chatSentimentDistribution,
        averageChatSentimentScore,
        monthlyGrowth,
      });

      setAnalytics({
        totalUsers,
        totalAgents,
        totalRequests,
        totalChatSessions,
        totalFeedbacks,
        totalPosts,
        averageResponseTime,
        averageFeedbackRating,
        averageSentimentScore,
        requestStatusDistribution,
        feedbackRatingDistribution,
        postSourceDistribution,
        sentimentDistribution,
        chatSentimentDistribution,
        averageChatSentimentScore,
        monthlyGrowth,
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart data preparation functions
  const getRequestStatusChartData = () => {
    return [
      { name: 'Ongoing', value: analytics.requestStatusDistribution.ongoing, color: '#3B82F6' },
      { name: 'Processed', value: analytics.requestStatusDistribution.processed, color: '#F59E0B' },
      { name: 'Done', value: analytics.requestStatusDistribution.done, color: '#10B981' },
      { name: 'Failed', value: analytics.requestStatusDistribution.fail, color: '#EF4444' },
      { name: 'Cancelled', value: analytics.requestStatusDistribution.cancelled, color: '#6B7280' },
    ].filter(item => item.value > 0);
  };

  const getFeedbackRatingChartData = () => {
    return [
      { name: 'Excellent (8-10)', value: analytics.feedbackRatingDistribution.excellent, color: '#10B981' },
      { name: 'Good (6-7)', value: analytics.feedbackRatingDistribution.good, color: '#3B82F6' },
      { name: 'Neutral (4-5)', value: analytics.feedbackRatingDistribution.neutral, color: '#F59E0B' },
      { name: 'Poor (0-3)', value: analytics.feedbackRatingDistribution.poor, color: '#EF4444' },
    ].filter(item => item.value > 0);
  };

  const getPostSourceChartData = () => {
    return [
      { name: 'Twitter', value: analytics.postSourceDistribution.twitter, color: '#1DA1F2' },
      { name: 'Facebook', value: analytics.postSourceDistribution.facebook, color: '#1877F2' },
      { name: 'Instagram', value: analytics.postSourceDistribution.instagram, color: '#E4405F' },
      { name: 'LinkedIn', value: analytics.postSourceDistribution.linkedin, color: '#0A66C2' },
      { name: 'Other', value: analytics.postSourceDistribution.other, color: '#6B7280' },
    ].filter(item => item.value > 0);
  };

  const getSentimentChartData = () => {
    return [
      { name: 'Positive', value: analytics.sentimentDistribution.positive, color: '#10B981' },
      { name: 'Neutral', value: analytics.sentimentDistribution.neutral, color: '#6B7280' },
      { name: 'Negative', value: analytics.sentimentDistribution.negative, color: '#EF4444' },
    ].filter(item => item.value > 0);
  };

  const getChatSentimentChartData = () => {
    console.log('📊 Getting chat sentiment chart data:', analytics.chatSentimentDistribution);
    const data = [
      { name: 'Positive', value: analytics.chatSentimentDistribution.positive, color: '#10B981' },
      { name: 'Neutral', value: analytics.chatSentimentDistribution.neutral, color: '#6B7280' },
      { name: 'Negative', value: analytics.chatSentimentDistribution.negative, color: '#EF4444' },
    ].filter(item => item.value > 0);
    console.log('📊 Filtered chat sentiment data:', data);
    return data;
  };

  const getMonthlyGrowthChartData = () => {
    return [
      { name: 'Users', value: analytics.monthlyGrowth.users, color: '#3B82F6' },
      { name: 'Requests', value: analytics.monthlyGrowth.requests, color: '#8B5CF6' },
      { name: 'Sessions', value: analytics.monthlyGrowth.sessions, color: '#F59E0B' },
      { name: 'Feedbacks', value: analytics.monthlyGrowth.feedbacks, color: '#10B981' },
      { name: 'Posts', value: analytics.monthlyGrowth.posts, color: '#EF4444' },
    ];
  };

  // Download functionality functions
  const handleDownloadPDF = () => {
    // Set print title and trigger print dialog for PDF generation
    const originalTitle = document.title;
    document.title = `Dallosh Analytics Report - ${new Date().toLocaleDateString()}`;
    
    // Trigger print dialog
    window.print();
    
    // Restore original title after printing
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDataExport = async () => {
    if (selectedReports.length === 0) {
      alert('Please select at least one report to export.');
      return;
    }

    setIsExporting(true);
    try {
      // Prepare data based on selected reports
      const exportData: any = {};
      
      if (selectedReports.includes('request-status')) {
        exportData.requestStatus = getRequestStatusChartData();
      }
      
      if (selectedReports.includes('post-sentiment')) {
        exportData.postSentiment = getSentimentChartData();
      }
      
      if (selectedReports.includes('chat-sentiment')) {
        exportData.chatSentiment = getChatSentimentChartData();
      }
      
      if (selectedReports.includes('feedback-distribution')) {
        exportData.feedbackDistribution = getFeedbackRatingChartData();
      }
      
      if (selectedReports.includes('monthly-growth')) {
        exportData.monthlyGrowth = getMonthlyGrowthChartData();
      }

      // Generate and download file based on format
      if (exportFormat === 'csv') {
        downloadCSV(exportData);
      } else if (exportFormat === 'xlsx') {
        downloadXLSX(exportData);
      } else if (exportFormat === 'docx') {
        downloadDOCX(exportData);
      }
      
      setShowDataExportModal(false);
      setSelectedReports([]);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (data: any) => {
    let csvContent = '';
    
    Object.entries(data).forEach(([reportName, reportData]: [string, any]) => {
      csvContent += `${reportName.toUpperCase()}\n`;
      csvContent += 'Name,Value,Color\n';
      reportData.forEach((item: any) => {
        csvContent += `${item.name},${item.value},${item.color}\n`;
      });
      csvContent += '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadXLSX = (data: any) => {
    // For now, we'll create a simple CSV-like structure
    // In a real implementation, you'd use a library like xlsx
    downloadCSV(data);
  };

  const downloadDOCX = (data: any) => {
    // For now, we'll create a simple CSV-like structure
    // In a real implementation, you'd use a library like docx
    downloadCSV(data);
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Custom tooltip component for better styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-gray-300" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 analytics-content">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-black mb-2">Dallosh Analytics Report</h1>
        <p className="text-lg text-gray-600">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        <p className="text-md text-gray-600">Platform performance and usage statistics</p>
      </div>
      
      {/* Page Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400">Platform performance and usage statistics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Last 30 days</span>
          </div>
          
          {/* Download Dropdown */}
          <DropdownMenu className="no-print">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white w-48">
              <DropdownMenuItem 
                onClick={handleDownloadPDF}
                className="cursor-pointer hover:bg-gray-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                As PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDataExportModal(true)}
                className="cursor-pointer hover:bg-gray-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                As Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalUsers}</div>
            <p className="text-xs text-gray-400">
              +{analytics.monthlyGrowth.users} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Support Agents</CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalAgents}</div>
            <p className="text-xs text-gray-400">Active agents</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalRequests}</div>
            <p className="text-xs text-gray-400">
              +{analytics.monthlyGrowth.requests} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalChatSessions}</div>
            <p className="text-xs text-gray-400">
              +{analytics.monthlyGrowth.sessions} this month
            </p>
          </CardContent>
        </Card>

                 <Card className="bg-gray-900 border-gray-800">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-gray-400">Total Feedbacks</CardTitle>
             <MessageSquare className="h-4 w-4 text-indigo-400" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-white">{analytics.totalFeedbacks}</div>
             <p className="text-xs text-gray-400">
               +{analytics.monthlyGrowth.feedbacks} this month
             </p>
           </CardContent>
         </Card>

         <Card className="bg-gray-900 border-gray-800">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-gray-400">Total Posts</CardTitle>
             <MessageSquare className="h-4 w-4 text-orange-400" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-white">{analytics.totalPosts}</div>
             <p className="text-xs text-gray-400">
               +{analytics.monthlyGrowth.posts} this month
             </p>
           </CardContent>
         </Card>
       </div>

             {/* Performance Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Response Time</CardTitle>
             <CardDescription className="text-gray-400">
               Average time to first response
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-blue-400 mb-2">
               {analytics.averageResponseTime}m
             </div>
             <p className="text-sm text-gray-400">
               Average response time in minutes
             </p>
           </CardContent>
         </Card>

         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Request Status</CardTitle>
             <CardDescription className="text-gray-400">
               Distribution of request statuses
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-2">
             <div className="flex items-center justify-between">
               <span className="text-sm text-gray-400">Ongoing</span>
               <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                 {analytics.requestStatusDistribution.ongoing}
               </Badge>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm text-gray-400">Processed</span>
               <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                 {analytics.requestStatusDistribution.processed}
               </Badge>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm text-gray-400">Completed</span>
               <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                 {analytics.requestStatusDistribution.done}
               </Badge>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm text-gray-400">Failed</span>
               <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                 {analytics.requestStatusDistribution.fail}
               </Badge>
             </div>
           </CardContent>
         </Card>

         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Post Sentiment</CardTitle>
             <CardDescription className="text-gray-400">
               Average sentiment score from user posts
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-purple-400 mb-2">
               {analytics.averageSentimentScore}
             </div>
             <p className="text-sm text-gray-400">
               Sentiment score range: -5 to +5
             </p>
           </CardContent>
         </Card>

         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Chat Sentiment</CardTitle>
             <CardDescription className="text-gray-400">
               Average sentiment score from chat messages
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-indigo-400 mb-2">
               {analytics.averageChatSentimentScore}
             </div>
             <p className="text-sm text-gray-400">
               Sentiment score range: -5 to +5
             </p>
           </CardContent>
         </Card>
       </div>

      {/* Feedback Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Customer Satisfaction</CardTitle>
            <CardDescription className="text-gray-400">
              Average feedback rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {analytics.averageFeedbackRating}/10
            </div>
            <p className="text-sm text-gray-400">
              Overall customer experience score
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Feedback Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Rating distribution breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Excellent (8-10)</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {analytics.feedbackRatingDistribution.excellent}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Good (6-7)</span>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {analytics.feedbackRatingDistribution.good}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Neutral (4-5)</span>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {analytics.feedbackRatingDistribution.neutral}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Poor (0-3)</span>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {analytics.feedbackRatingDistribution.poor}
              </Badge>
            </div>
          </CardContent>
        </Card>
             </div>

       {/* Interactive Charts Section */}
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <h2 className="text-2xl font-bold text-white">Data Visualizations</h2>
           <div className="flex items-center gap-2 no-print">
             <Button
               variant={layoutMode === 'grid' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setLayoutMode('grid')}
               className="flex items-center gap-2"
             >
               <Grid3X3 className="h-4 w-4" />
               Grid
             </Button>
             <Button
               variant={layoutMode === 'list' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setLayoutMode('list')}
               className="flex items-center gap-2"
             >
               <List className="h-4 w-4" />
               List
             </Button>
           </div>
         </div>
         
         {/* Charts Container with Layout Switching */}
         <div className={layoutMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}>
           {/* Request Status Distribution - Pie Chart */}
           <Card className="bg-gray-900 border-gray-800">
             <CardHeader>
               <CardTitle className="text-white">Request Status Distribution</CardTitle>
               <CardDescription className="text-gray-400">
                 Visual breakdown of support request statuses
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={getRequestStatusChartData()}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                       outerRadius={80}
                       fill="#8884d8"
                       dataKey="value"
                     >
                       {getRequestStatusChartData().map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip content={<CustomTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             </CardContent>
           </Card>

         {/* Feedback Rating Distribution - Bar Chart */}
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Feedback Rating Distribution</CardTitle>
             <CardDescription className="text-gray-400">
               Customer satisfaction ratings breakdown
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={getFeedbackRatingChartData()}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                   <XAxis 
                     dataKey="name" 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <YAxis 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <Tooltip content={<CustomTooltip />} />
                   <Bar dataKey="value" fill="#8884d8">
                     {getFeedbackRatingChartData().map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>

         {/* Post Source Distribution - Horizontal Bar Chart */}
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Post Source Distribution</CardTitle>
             <CardDescription className="text-gray-400">
               Social media platform breakdown
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart 
                   data={getPostSourceChartData()} 
                   layout="horizontal"
                   margin={{ left: 100 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                   <XAxis 
                     type="number" 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <YAxis 
                     type="category" 
                     dataKey="name" 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <Tooltip content={<CustomTooltip />} />
                   <Bar dataKey="value" fill="#8884d8">
                     {getPostSourceChartData().map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>

         {/* Sentiment Distribution - Doughnut Chart */}
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Post Sentiment Distribution</CardTitle>
             <CardDescription className="text-gray-400">
               Post sentiment analysis breakdown
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={getSentimentChartData()}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="value"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   >
                     {getSentimentChartData().map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>

         {/* Chat Sentiment Distribution - Doughnut Chart */}
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Chat Sentiment Distribution</CardTitle>
             <CardDescription className="text-gray-400">
               Chat message sentiment analysis breakdown
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={getChatSentimentChartData()}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="value"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   >
                     {getChatSentimentChartData().map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>

         {/* Monthly Growth - Area Chart */}
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Monthly Growth Trends</CardTitle>
             <CardDescription className="text-gray-400">
               Growth metrics over the last 30 days
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={getMonthlyGrowthChartData()}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                   <XAxis 
                     dataKey="name" 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <YAxis 
                     stroke="#9CA3AF"
                     fontSize={12}
                   />
                   <Tooltip content={<CustomTooltip />} />
                   <Area 
                     type="monotone" 
                     dataKey="value" 
                     stroke="#8884d8" 
                     fill="#8884d8" 
                     fillOpacity={0.6}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
           </div>
         </div>

       {/* Similar Posts Analysis */}
       {similarPosts.length > 0 && (
         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Similar Posts Analysis</CardTitle>
             <CardDescription className="text-gray-400">
               Posts with similar content patterns and common themes
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {similarPosts.map((group, index) => (
                 <div key={index} className="p-4 bg-gray-800 rounded-lg">
                   <div className="flex items-center gap-2 mb-3">
                     <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                       {group.posts.length} similar posts
                     </Badge>
                     <span className="text-sm text-gray-400">
                       Similarity: {Math.round(group.similarity * 100)}%
                     </span>
                   </div>
                   
                   {group.commonWords.length > 0 && (
                     <div className="mb-3">
                       <span className="text-sm text-gray-400">Common words: </span>
                       <div className="flex flex-wrap gap-1 mt-1">
                         {group.commonWords.slice(0, 8).map((word, wordIndex) => (
                           <Badge key={wordIndex} variant="outline" className="text-xs">
                             {word}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   <div className="space-y-2">
                     {group.posts.map((post) => (
                       <div key={post.uid} className="flex items-start gap-3 p-3 bg-gray-700 rounded">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-medium text-white">{post.userName}</span>
                             <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                               {post.source}
                             </Badge>
                           </div>
                           <p className="text-gray-300 text-sm">{post.content}</p>
                           <span className="text-xs text-gray-400">
                             {new Date(post.createdAt).toLocaleDateString()}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}

       {/* Growth Chart Placeholder */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Monthly Growth</CardTitle>
          <CardDescription className="text-gray-400">
            Platform growth over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-600" />
              <p>Chart visualization coming soon</p>
              <p className="text-sm">Monthly growth data is being collected</p>
            </div>
          </div>
        </CardContent>
      </Card>

             {/* Quick Stats */}
       <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">User Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400 mb-2">
              {analytics.totalRequests > 0 ? Math.round((analytics.totalChatSessions / analytics.totalRequests) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-400">
              Users who create requests also start chat sessions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {analytics.totalRequests > 0 ? Math.round((analytics.requestStatusDistribution.done / analytics.totalRequests) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-400">
              Successfully resolved requests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Agent Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {analytics.totalAgents > 0 ? Math.round(analytics.totalRequests / analytics.totalAgents) : 0}
            </div>
            <p className="text-sm text-gray-400">
              Average requests per agent
            </p>
          </CardContent>
        </Card>

                 <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Customer Satisfaction</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-yellow-400 mb-2">
               {analytics.totalFeedbacks > 0 ? Math.round((analytics.feedbackRatingDistribution.excellent + analytics.feedbackRatingDistribution.good) / analytics.totalFeedbacks * 100) : 0}%
             </div>
             <p className="text-sm text-gray-400">
               Satisfied customers (8+ rating)
             </p>
           </CardContent>
         </Card>

         <Card className="bg-gray-900 border-gray-800">
           <CardHeader>
             <CardTitle className="text-white">Post Engagement</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-orange-400 mb-2">
               {analytics.totalPosts > 0 ? Math.round((analytics.sentimentDistribution.positive / analytics.totalPosts) * 100) : 0}%
             </div>
             <p className="text-sm text-gray-400">
               Positive sentiment posts
             </p>
           </CardContent>
         </Card>
       </div>

       {/* Data Export Modal */}
       <Dialog open={showDataExportModal} onOpenChange={setShowDataExportModal} className="print:hidden">
         <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <FileDown className="h-5 w-5" />
               Export Analytics Data
             </DialogTitle>
             <DialogDescription className="text-gray-400">
               Select the reports you want to export and choose your preferred format.
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             {/* Report Selection */}
             <div>
               <Label className="text-white mb-3 block">Select Reports</Label>
               <div className="space-y-2">
                 {[
                   { id: 'request-status', label: 'Request Status Distribution', icon: <BarChart3 className="h-4 w-4" /> },
                   { id: 'post-sentiment', label: 'Post Sentiment Distribution', icon: <TrendingUp className="h-4 w-4" /> },
                   { id: 'chat-sentiment', label: 'Chat Sentiment Distribution', icon: <MessageSquare className="h-4 w-4" /> },
                   { id: 'feedback-distribution', label: 'Feedback Rating Distribution', icon: <CheckCircle className="h-4 w-4" /> },
                   { id: 'monthly-growth', label: 'Monthly Growth Trends', icon: <TrendingUp className="h-4 w-4" /> }
                 ].map((report) => (
                   <div key={report.id} className="flex items-center space-x-2">
                     <Checkbox
                       id={report.id}
                       checked={selectedReports.includes(report.id)}
                       onCheckedChange={() => toggleReportSelection(report.id)}
                       className="border-gray-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                     />
                     <Label 
                       htmlFor={report.id} 
                       className="flex items-center gap-2 cursor-pointer text-sm"
                     >
                       {report.icon}
                       {report.label}
                     </Label>
                   </div>
                 ))}
               </div>
             </div>
             
             {/* Format Selection */}
             <div>
               <Label className="text-white mb-2 block">Export Format</Label>
               <Select value={exportFormat} onValueChange={(value: 'xlsx' | 'csv' | 'docx') => setExportFormat(value)}>
                 <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="bg-gray-800 border-gray-700 text-white">
                   <SelectItem value="xlsx">
                     <div className="flex items-center gap-2">
                       <FileSpreadsheet className="h-4 w-4" />
                       Excel (.xlsx)
                     </div>
                   </SelectItem>
                   <SelectItem value="csv">
                     <div className="flex items-center gap-2">
                       <FileText className="h-4 w-4" />
                       <span>CSV (.csv)</span>
                     </div>
                   </SelectItem>
                   <SelectItem value="docx">
                     <div className="flex items-center gap-2">
                       <FileText className="h-4 w-4" />
                       <span>Word (.docx)</span>
                     </div>
                   </SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setShowDataExportModal(false)}
               className="border-gray-600 text-gray-300 hover:bg-gray-700"
             >
               Cancel
             </Button>
             <Button
               onClick={handleDataExport}
               disabled={isExporting || selectedReports.length === 0}
               className="bg-green-600 hover:bg-green-700"
             >
               {isExporting ? (
                 <>
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                   Exporting...
                 </>
               ) : (
                 <>
                   <FileDown className="h-4 w-4 mr-2" />
                   Export Data
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
