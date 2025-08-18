'use client';

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Settings, 
  LogOut, 
  Crown, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  MoreHorizontal,
  Bookmark,
  FileText,
  Users,
  Zap,
  X
} from "lucide-react";
import Link from "next/link";
import { getSodularClient } from "@/services/client";
import { useEffect, useState } from "react";

export default function TwitterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [botName, setBotName] = useState("dallosh_bot");

  useEffect(() => {
    // Initialize tables if they don't exist
    const initializeTables = async () => {
      try {
        const client = await getSodularClient();
        if (!client) return;

        // Check if posts table exists
        const postsTableExists = await client.tables.exists("posts");
        if (!postsTableExists) {
          await client.tables.create({
            data: {
              name: "posts",
              description: "Social media posts",
              fields: [
                { name: "content", type: "text", required: true },
                { name: "authorId", type: "text", required: true },
                { name: "authorName", type: "text", required: true },
                { name: "authorUsername", type: "text", required: true },
                { name: "authorImage", type: "text" },
                { name: "likes", type: "number", defaultValue: 0 },
                { name: "reposts", type: "number", defaultValue: 0 },
                { name: "comments", type: "number", defaultValue: 0 },
                { name: "createdAt", type: "number", required: true },
                { name: "mentions", type: "array" },
                { name: "hashtags", type: "array" },
                { name: "parentPostId", type: "text" }, // For replies
                { name: "isRepost", type: "boolean", defaultValue: false },
                { name: "originalPostId", type: "text" }, // For reposts
                { name: "media", type: "array" }, // For images/videos
                { name: "poll", type: "object" }, // For polls
                { name: "location", type: "text" },
                { name: "language", type: "text", defaultValue: "en" },
                { name: "sensitive", type: "boolean", defaultValue: false },
                { name: "viewCount", type: "number", defaultValue: 0 },
              ],
            },
          });
        }

        // Check if users table exists
        const usersTableExists = await client.tables.exists("users");
        if (!usersTableExists) {
          await client.tables.create({
            data: {
              name: "users",
              description: "User accounts",
              fields: [
                { name: "username", type: "text", required: true, unique: true },
                { name: "email", type: "text", required: true, unique: true },
                { name: "displayName", type: "text", required: true },
                { name: "imageUrl", type: "text" },
                { name: "bio", type: "text" },
                { name: "isAdmin", type: "boolean", defaultValue: false },
                { name: "createdAt", type: "number", required: true },
                { name: "followers", type: "number", defaultValue: 0 },
                { name: "following", type: "number", defaultValue: 0 },
                { name: "verified", type: "boolean", defaultValue: false },
                { name: "location", type: "text" },
                { name: "website", type: "text" },
                { name: "birthDate", type: "text" },
                { name: "theme", type: "text", defaultValue: "light" },
                { name: "language", type: "text", defaultValue: "en" },
                { name: "timezone", type: "text" },
                { name: "lastActive", type: "number" },
                { name: "isPrivate", type: "boolean", defaultValue: false },
                { name: "isSuspended", type: "boolean", defaultValue: false },
                { name: "suspensionReason", type: "text" },
              ],
            },
          });
        }

        // Check if comments table exists
        const commentsTableExists = await client.tables.exists("comments");
        if (!commentsTableExists) {
          await client.tables.create({
            data: {
              name: "comments",
              description: "Post comments/replies",
              fields: [
                { name: "content", type: "text", required: true },
                { name: "postId", type: "text", required: true },
                { name: "authorId", type: "text", required: true },
                { name: "authorName", type: "text", required: true },
                { name: "authorUsername", type: "text", required: true },
                { name: "authorImage", type: "text" },
                { name: "createdAt", type: "number", required: true },
                { name: "likes", type: "number", defaultValue: 0 },
                { name: "reposts", type: "number", defaultValue: 0 },
                { name: "replies", type: "number", defaultValue: 0 },
                { name: "parentCommentId", type: "text" }, // For nested replies
                { name: "mentions", type: "array" },
                { name: "hashtags", type: "array" },
                { name: "media", type: "array" },
                { name: "isEdited", type: "boolean", defaultValue: false },
                { name: "editedAt", type: "number" },
                { name: "language", type: "text", defaultValue: "en" },
                { name: "sensitive", type: "boolean", defaultValue: false },
              ],
            },
          });
        }

        // Check if likes table exists
        const likesTableExists = await client.tables.exists("likes");
        if (!likesTableExists) {
          await client.tables.create({
            data: {
              name: "likes",
              description: "Post and comment likes",
              fields: [
                { name: "userId", type: "text", required: true },
                { name: "postId", type: "text" },
                { name: "commentId", type: "text" },
                { name: "createdAt", type: "number", required: true },
                { name: "type", type: "text", required: true }, // "post" or "comment"
              ],
            },
          });
        }

        // Check if reposts table exists
        const repostsTableExists = await client.tables.exists("reposts");
        if (!repostsTableExists) {
          await client.tables.create({
            data: {
              name: "reposts",
              description: "Post reposts",
              fields: [
                { name: "userId", type: "text", required: true },
                { name: "postId", type: "text", required: true },
                { name: "createdAt", type: "number", required: true },
                { name: "quote", type: "text" }, // Optional quote text
                { name: "isQuote", type: "boolean", defaultValue: false },
              ],
            },
          });
        }

        // Check if follows table exists
        const followsTableExists = await client.tables.exists("follows");
        if (!followsTableExists) {
          await client.tables.create({
            data: {
              name: "follows",
              description: "User follow relationships",
              fields: [
                { name: "followerId", type: "text", required: true },
                { name: "followingId", type: "text", required: true },
                { name: "createdAt", type: "number", required: true },
                { name: "isMuted", type: "boolean", defaultValue: false },
                { name: "isBlocked", type: "boolean", defaultValue: false },
                { name: "notifications", type: "boolean", defaultValue: true },
              ],
            },
          });
        }

        // Check if chat table exists
        const chatTableExists = await client.tables.exists("chat");
        if (!chatTableExists) {
          await client.tables.create({
            data: {
              name: "chat",
              description: "Chat sessions",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "type", type: "text", required: true },
                { name: "status", type: "text", required: true },
                { name: "source", type: "text" },
                { name: "sourceId", type: "text" },
                { name: "authorId", type: "text", required: true },
                { name: "authorName", type: "text", required: true },
                { name: "content", type: "text" },
                { name: "createdAt", type: "number", required: true },
                { name: "lastMessage", type: "text" },
                { name: "lastMessageTime", type: "number" },
              ],
            },
          });
        }

        // Check if messages table exists
        const messagesTableExists = await client.tables.exists("messages");
        if (!messagesTableExists) {
          await client.tables.create({
            data: {
              name: "messages",
              description: "Chat messages",
              fields: [
                { name: "content", type: "text", required: true },
                { name: "chat_id", type: "text", required: true },
                { name: "authorId", type: "text", required: true },
                { name: "authorName", type: "text", required: true },
                { name: "authorType", type: "text", required: true },
                { name: "createdAt", type: "number", required: true },
              ],
            },
          });
        }

        // Check if bot settings table exists
        const botSettingsTableExists = await client.tables.exists("bot_settings");
        if (!botSettingsTableExists) {
          await client.tables.create({
            data: {
              name: "bot_settings",
              description: "Bot configuration",
              fields: [
                { name: "botName", type: "text", required: true, defaultValue: "dallosh_bot" },
                { name: "welcomeMessage", type: "text" },
                { name: "autoResponse", type: "boolean", defaultValue: true },
                { name: "updatedAt", type: "number", required: true },
              ],
            },
          });

          // Create default bot settings
          await client.ref.from("bot_settings").create({
            data: {
              botName: "dallosh_bot",
              welcomeMessage: "Hello! I'm here to help. How can I assist you today?",
              autoResponse: true,
              updatedAt: Date.now(),
            },
          });
        }

        // Check if notifications table exists
        const notificationsTableExists = await client.tables.exists("notifications");
        if (!notificationsTableExists) {
          await client.tables.create({
            data: {
              name: "notifications",
              description: "User notifications",
              fields: [
                { name: "userId", type: "text", required: true },
                { name: "type", type: "text", required: true }, // "like", "comment", "repost", "follow", "mention"
                { name: "title", type: "text", required: true },
                { name: "message", type: "text", required: true },
                { name: "relatedId", type: "text" }, // postId, commentId, userId, etc.
                { name: "createdAt", type: "number", required: true },
                { name: "isRead", type: "boolean", defaultValue: false },
                { name: "isDeleted", type: "boolean", defaultValue: false },
                { name: "senderId", type: "text" },
                { name: "senderName", type: "text" },
                { name: "senderUsername", type: "text" },
                { name: "senderImage", type: "text" },
              ],
            },
          });
        }

        // Check if hashtags table exists
        const hashtagsTableExists = await client.tables.exists("hashtags");
        if (!hashtagsTableExists) {
          await client.tables.create({
            data: {
              name: "hashtags",
              description: "Hashtag tracking",
              fields: [
                { name: "name", type: "text", required: true, unique: true },
                { name: "count", type: "number", defaultValue: 0 },
                { name: "trending", type: "boolean", defaultValue: false },
                { name: "createdAt", type: "number", required: true },
                { name: "lastUsed", type: "number", required: true },
                { name: "category", type: "text" },
                { name: "description", type: "text" },
              ],
            },
          });
        }

        // Check if bookmarks table exists
        const bookmarksTableExists = await client.tables.exists("bookmarks");
        if (!bookmarksTableExists) {
          await client.tables.create({
            data: {
              name: "bookmarks",
              description: "User bookmarks",
              fields: [
                { name: "userId", type: "text", required: true },
                { name: "postId", type: "text", required: true },
                { name: "createdAt", type: "number", required: true },
                { name: "note", type: "text" },
                { name: "tags", type: "array" },
              ],
            },
          });
        }

        // Get bot name from settings
        const botSettings = await client.ref.from("bot_settings").query({ take: 1 });
        if (botSettings.data?.list && botSettings.data.list.length > 0) {
          setBotName(botSettings.data.list[0].data.botName);
        }

      } catch (error) {
        console.error("Error initializing tables:", error);
      }
    };

    initializeTables();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Check if user is admin from custom fields or auth store
  const isAdmin = user?.data?.fields?.isAdmin || false;
  const isAdminFromAuth = useAuthStore.getState().isAdmin();
  const isAgent = useAuthStore.getState().isAgent();
  const userRole = useAuthStore.getState().getUserRole();
  const displayName = user?.data?.fields?.displayName || user?.data?.username || 'User';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <div className="flex max-w-6xl mx-auto">
          {/* Left Sidebar - Twitter Navigation */}
          <div className="w-64 min-h-screen px-4 py-4">
            {/* Logo */}
            <div className="mb-8 px-3">
              <X className="h-8 w-8 text-white" />
            </div>
            
            {/* Navigation Menu */}
            <nav className="space-y-1">
              <Link href="/twitter" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Home className="h-7 w-7" />
                <span className="font-normal">Home</span>
              </Link>
              <Link href="/explore" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Search className="h-7 w-7" />
                <span className="font-normal">Explore</span>
              </Link>
              <Link href="/notifications" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Bell className="h-7 w-7" />
                <span className="font-normal">Notifications</span>
              </Link>
              <Link href="/chat" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Mail className="h-7 w-7" />
                <span className="font-normal">Messages</span>
              </Link>
              <Link href="/grok" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Bot className="h-7 w-7" />
                <span className="font-normal">Grok</span>
              </Link>
              <Link href="/lists" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <FileText className="h-7 w-7" />
                <span className="font-normal">Lists</span>
              </Link>
              <Link href="/bookmarks" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Bookmark className="h-7 w-7" />
                <span className="font-normal">Bookmarks</span>
              </Link>
              <Link href="/communities" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <Users className="h-7 w-7" />
                <span className="font-normal">Communities</span>
              </Link>
              <Link href="/premium" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <X className="h-7 w-7" />
                <span className="font-normal">Premium</span>
              </Link>
              <Link href="/twitter/profile" className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl">
                <User className="h-7 w-7" />
                <span className="font-normal">Profile</span>
              </Link>
              <button className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 text-xl w-full text-left">
                <MoreHorizontal className="h-7 w-7" />
                <span className="font-normal">More</span>
              </button>
            </nav>

            {/* Post Button */}
            <div className="mt-8 px-3">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-lg">
                Post
              </Button>
            </div>

            {/* User Profile */}
            <div className="mt-auto mb-4 px-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-900 transition-all duration-200 w-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.data?.imageUrl} alt={user?.data?.username} />
                      <AvatarFallback>{user?.data?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-white">{displayName}</div>
                      <div className="text-gray-500">@{user?.data?.username}</div>
                    </div>
                    <MoreHorizontal className="h-5 w-5 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-black border-gray-800">
                  {/* User Role Indicator */}
                  {(isAdmin || isAdminFromAuth || isAgent) && (
                    <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3 w-3" />
                        <span className="capitalize">{userRole || 'User'}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Admin Dashboard Navigation */}
                  {(isAdmin || isAdminFromAuth || isAgent) && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/twitter" className="cursor-pointer text-white">
                          <Crown className="mr-2 h-4 w-4" />
                          <span>Go to Twitter Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dallosh" className="cursor-pointer text-white">
                          <Bot className="mr-2 h-4 w-4" />
                          <span>Go to Dallosh Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-800" />
                    </>
                  )}
                  
                  {/* User Profile Link */}
                  <DropdownMenuItem asChild>
                    <Link href="/twitter/profile" className="cursor-pointer text-white">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-gray-800" />
                  
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-white">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out @{user?.data?.username}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 border-l border-r border-gray-800 min-h-screen">
            {children}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 min-h-screen px-4 py-4">
            {/* Search Box */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="Search"
                  className="w-full pl-12 pr-4 py-3 bg-gray-900 border-0 rounded-full text-white placeholder-gray-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subscribe to Premium */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Subscribe to Premium</h3>
              <p className="text-gray-400 text-sm mb-3">
                Subscribe to unlock new features and if eligible, receive a share of ads revenue.
              </p>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-full">
                Subscribe
              </Button>
            </div>

            {/* What's happening */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <h3 className="text-xl font-bold text-white mb-4">What's happening</h3>
              <div className="space-y-3">
                <div className="cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <div className="text-gray-500 text-sm">Wrestling · Trending</div>
                  <div className="text-white font-bold">WWE Speed</div>
                  <div className="text-gray-500 text-sm">22.8K posts</div>
                </div>
                <div className="cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <div className="text-gray-500 text-sm">Technology · Trending</div>
                  <div className="text-white font-bold">Samsung</div>
                  <div className="text-gray-500 text-sm">92.8K posts</div>
                </div>
                <div className="cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <div className="text-gray-500 text-sm">Action games · Trending</div>
                  <div className="text-white font-bold">#GenshinImpact</div>
                  <div className="text-gray-500 text-sm">50.7K posts</div>
                </div>
                <div className="cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <div className="text-gray-500 text-sm">Technology · Trending</div>
                  <div className="text-white font-bold">Xiaomi</div>
                  <div className="text-gray-500 text-sm">6,352 posts</div>
                </div>
                <div className="cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <div className="text-gray-500 text-sm">Trending</div>
                  <div className="text-white font-bold">GitHub</div>
                  <div className="text-gray-500 text-sm">34.8K posts</div>
                </div>
              </div>
              <button className="text-blue-500 hover:underline text-sm mt-3">Show more</button>
            </div>

            {/* Who to follow */}
            <div className="bg-gray-900 rounded-2xl p-4">
              <h3 className="text-xl font-bold text-white mb-4">Who to follow</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-500 text-white">D</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-bold">daylight</div>
                      <div className="text-gray-500 text-sm">@daylightco</div>
                    </div>
                  </div>
                  <Button className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1 rounded-full text-sm">
                    Follow
                  </Button>
                </div>
              </div>
              <button className="text-blue-500 hover:underline text-sm mt-3">Show more</button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
