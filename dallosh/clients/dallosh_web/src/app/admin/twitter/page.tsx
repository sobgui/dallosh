'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, Bot, Eye, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSodularClient } from "@/services/client";

interface Stats {
  totalPosts: number;
  activeUsers: number;
  botMentions: number;
  engagementRate: number;
}

interface RecentPost {
  uid: string;
  data: {
    content: string;
    authorName: string;
    authorUsername: string;
    createdAt: number;
    mentions: string[];
    likes: number;
    comments: number;
  };
}

export default function AdminTwitterPage() {
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    activeUsers: 0,
    botMentions: 0,
    engagementRate: 0,
  });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Fetch posts
      const postsResult = await client.ref.from("posts").query({ take: 100 });
      const posts = postsResult.data?.list || [];

      // Fetch users
      const usersResult = await client.ref.from("users").query({ take: 100 });
      const users = usersResult.data?.list || [];

      // Calculate stats
      const totalPosts = posts.length;
      const activeUsers = users.length;
      const botMentions = posts.filter(post => 
        post.data.mentions && post.data.mentions.includes("dallosh_bot")
      ).length;
      
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.data.likes + post.data.comments, 0
      );
      const engagementRate = totalPosts > 0 ? Math.round((totalEngagement / totalPosts) * 100) / 100 : 0;

      setStats({
        totalPosts,
        activeUsers,
        botMentions,
        engagementRate,
      });

      // Get recent posts with bot mentions
      const postsWithBotMentions = posts
        .filter(post => post.data.mentions && post.data.mentions.includes("dallosh_bot"))
        .sort((a, b) => b.data.createdAt - a.data.createdAt)
        .slice(0, 5);

      setRecentPosts(postsWithBotMentions);
      setIsLoading(false);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          <h1 className="text-3xl font-bold text-white">Twitter Overview</h1>
          <p className="text-gray-400">Monitor your Twitter integration and bot performance</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/twitter/settings">
            <Button variant="outline">
              <Bot className="h-4 w-4 mr-2" />
              Bot Settings
            </Button>
          </Link>
          <Link href="/admin/twitter/analytics">
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalPosts}</div>
            <p className="text-xs text-gray-400">All time posts</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeUsers}</div>
            <p className="text-xs text-gray-400">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Bot Mentions</CardTitle>
            <Bot className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.botMentions}</div>
            <p className="text-xs text-gray-400">Support requests</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.engagementRate}</div>
            <p className="text-xs text-gray-400">Avg per post</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bot Mentions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 text-purple-400" />
            Recent Bot Mentions
          </CardTitle>
          <CardDescription className="text-gray-400">
            Latest posts that mentioned the bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p>No bot mentions yet</p>
              <p className="text-sm">Users will appear here when they mention @dallosh_bot</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.uid} className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{post.data.authorName}</span>
                      <span className="text-gray-400">@{post.data.authorUsername}</span>
                      <Badge variant="secondary" className="bg-purple-600 text-white">
                        <Bot className="h-3 w-3 mr-1" />
                        Bot Mentioned
                      </Badge>
                    </div>
                    <p className="text-gray-300 mb-2">{post.data.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(post.data.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.data.likes} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.data.comments} comments
                      </span>
                    </div>
                  </div>
                  <Link href={`/admin/twitter/posts/${post.uid}`}>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Manage Posts</CardTitle>
            <CardDescription className="text-gray-400">
              View, moderate, and manage all posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/twitter/posts">
              <Button className="w-full">View All Posts</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">User Management</CardTitle>
            <CardDescription className="text-gray-400">
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/twitter/users">
              <Button className="w-full">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Bot Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Configure bot behavior and responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/twitter/settings">
              <Button className="w-full">Configure Bot</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


