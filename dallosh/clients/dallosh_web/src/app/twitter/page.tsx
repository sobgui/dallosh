'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { getSodularClient } from "@/services/client";
import { 
  Heart, 
  MessageCircle, 
  Repeat, 
  Share, 
  MoreHorizontal, 
  Bot, 
  Image, 
  Smile, 
  MapPin, 
  Calendar,
  Reply,
  Bookmark,
  Eye,
  BarChart3,
  Edit,
  Trash2,
  Check,
  X,
  Crown,
  Settings
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { PostSkeleton, PostSkeletonList } from "@/components/post-skeleton";
import { MentionTextarea } from "@/components/mention-textarea";
import { parseMentions, extractMentions, extractHashtags, extractUrls } from "@/lib/utils/mention-parser";

interface Post {
  uid: string;
  data: {
    content: string;
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorImage?: string;
    likes: number;
    reposts: number;
    createdAt: number;
    updatedAt?: number;
    mentions: string[];
    hashtags: string[];
    urls?: string[];
    viewCount?: number;
  };
  createdAt: number;
}

interface User {
  uid: string;
  data: {
    username: string;
    displayName: string;
    imageUrl?: string;
    verified?: boolean;
  };
}

interface Comment {
  uid: string;
  data: {
    content: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorImage?: string;
    createdAt: number;
  };
  createdAt: number;
}

export default function TwitterPage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [botName, setBotName] = useState("dallosh_bot");
  // Removed old reply dialog system - now using inline comments
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  
  // Pagination states
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [commentOffsets, setCommentOffsets] = useState<Record<string, number>>({});
  const [hasMoreComments, setHasMoreComments] = useState<Record<string, boolean>>({});
  const [loadingMoreComments, setLoadingMoreComments] = useState<Record<string, boolean>>({});
  
  // Constants for pagination
  const POSTS_PER_PAGE = 30;
  const COMMENTS_PER_PAGE = 10;
  
  // Post and comment management states
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");
  
  // Table UIDs cache
  const [tableUIDs, setTableUIDs] = useState<{
    posts?: string;
    users?: string;
    comments?: string;
    likes?: string;
    reposts?: string;
    follows?: string;
    bookmarks?: string;
    chat?: string;
    messages?: string;
    bot_settings?: string;
  }>({});

  // Function to get or create a table and return its UID
  const getOrCreateTable = async (client: any, tableName: string, tableSchema: any) => {
    console.log(`Getting/creating table: ${tableName}`);
    
    // Try to get existing table using the same pattern as the reference
    let table = await client.tables.get({ filter: { 'data.name': tableName } });
    
    console.log(`Table get result for ${tableName}:`, table);
    
    // If table doesn't exist, create it
    if (!table.data) {
      console.log(`Creating new table: ${tableName}`);
      table = await client.tables.create({
        data: {
          name: tableName,
          description: tableSchema.description,
          fields: tableSchema.fields,
        }
      });
      console.log(`Table creation result for ${tableName}:`, table);
    }
    
    // Return the table UID
    if (table.data && table.data.uid) {
      console.log(`Using table ${tableName} with UID:`, table.data.uid);
      return table.data.uid;
    }
    
    throw new Error(`Failed to get or create table ${tableName}`);
  };

  // Initialize all required tables
  const initializeTables = async () => {
    try {
      const client = await getSodularClient();
      if (!client) {
        console.error("Failed to get Sodular client");
        return {};
      }

      console.log("Initializing tables...");

      // Define table schemas
      const tableSchemas = {
        posts: {
          description: "Social media posts",
          fields: [
            { name: "content", type: "text", required: true },
            { name: "authorId", type: "text", required: true },
            { name: "authorName", type: "text", required: true },
            { name: "authorUsername", type: "text", required: true },
            { name: "authorImage", type: "text" },
            { name: "likes", type: "number", defaultValue: 0 },
            { name: "reposts", type: "number", defaultValue: 0 },
            { name: "createdAt", type: "number", required: true },
            { name: "mentions", type: "array" },
            { name: "hashtags", type: "array" },
            { name: "urls", type: "array" },
            { name: "viewCount", type: "number", defaultValue: 0 },
          ],
        },
        users: {
          description: "User accounts",
          fields: [
            { name: "username", type: "text", required: true },
            { name: "email", type: "text", required: true },
            { name: "displayName", type: "text", required: true },
            { name: "imageUrl", type: "text" },
            { name: "bio", type: "text" },
            { name: "isAdmin", type: "boolean", defaultValue: false },
            { name: "createdAt", type: "number", required: true },
            { name: "followers", type: "number", defaultValue: 0 },
            { name: "following", type: "number", defaultValue: 0 },
            { name: "verified", type: "boolean", defaultValue: false },
          ],
        },
        comments: {
          description: "Post comments",
          fields: [
            { name: "content", type: "text", required: true },
            { name: "postId", type: "text", required: true },
            { name: "authorId", type: "text", required: true },
            { name: "authorName", type: "text", required: true },
            { name: "authorUsername", type: "text", required: true },
            { name: "authorImage", type: "text" },
            { name: "createdAt", type: "number", required: true },
          ],
        },
        bot_settings: {
          description: "Bot configuration",
          fields: [
            { name: "botName", type: "text", required: true, defaultValue: "dallosh_bot" },
            { name: "welcomeMessage", type: "text" },
            { name: "autoResponse", type: "boolean", defaultValue: true },
            { name: "updatedAt", type: "number", required: true },
          ],
        },
        likes: {
          description: "Post and comment likes",
          fields: [
            { name: "userId", type: "text", required: true },
            { name: "postId", type: "text" },
            { name: "commentId", type: "text" },
            { name: "createdAt", type: "number", required: true },
            { name: "type", type: "text", required: true }, // "post" or "comment"
          ],
        },
        reposts: {
          description: "Post reposts",
          fields: [
            { name: "userId", type: "text", required: true },
            { name: "postId", type: "text", required: true },
            { name: "createdAt", type: "number", required: true },
            { name: "quote", type: "text" }, // Optional quote text
            { name: "isQuote", type: "boolean", defaultValue: false },
          ],
        },
        follows: {
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
        bookmarks: {
          description: "User bookmarks",
          fields: [
            { name: "userId", type: "text", required: true },
            { name: "postId", type: "text", required: true },
            { name: "createdAt", type: "number", required: true },
            { name: "note", type: "text" },
            { name: "tags", type: "array" },
          ],
        },
      };

      // Initialize all tables
      const tableUIDs: any = {};
      
      for (const [tableName, schema] of Object.entries(tableSchemas)) {
        try {
          const uid = await getOrCreateTable(client, tableName, schema);
          tableUIDs[tableName] = uid;
        } catch (error) {
          console.error(`Failed to initialize table ${tableName}:`, error);
        }
      }

      console.log("All table UIDs:", tableUIDs);
      setTableUIDs(tableUIDs);
      return tableUIDs;

    } catch (error) {
      console.error("Error initializing tables:", error);
      return {};
    }
  };

  // Handle mention detection when post content or cursor position changes
  useEffect(() => {
    handleMentionDetection(newPost, cursorPosition);
  }, [newPost, cursorPosition, users, tableUIDs.users]);

  useEffect(() => {
    console.log("Twitter page mounted, user:", user);
    
    const initializeData = async () => {
      try {
        console.log("Initializing data...");
        
        // First initialize tables
        const uids = await initializeTables();
        
        // Then fetch data
        if (Object.keys(uids).length > 0) {
          await Promise.all([
            fetchPosts(uids),
            fetchUsers(uids),
            fetchBotSettings(uids),
            fetchUserInteractions(uids),
          ]);
          
          // Fetch comment counts after all tables are initialized
          if (uids.comments) {
            console.log("Fetching comment counts after initialization, posts count:", posts.length);
            // Use the latest posts from state or fetch fresh
            const currentPosts = posts.length > 0 ? posts : [];
            if (currentPosts.length > 0) {
              await fetchCommentCountsForPosts(currentPosts, uids);
            } else {
              // Posts might not be set yet, try fetching posts again
              const client = await getSodularClient();
              if (client && uids.posts) {
                const postsResult = await client.ref.from(uids.posts).query({ take: 50 });
                if (postsResult.data?.list) {
                  const sortedPosts = postsResult.data.list.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
                  await fetchCommentCountsForPosts(sortedPosts, uids);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, [user]);

  // Fetch comment counts whenever posts change and tables are ready
  useEffect(() => {
    if (posts.length > 0 && tableUIDs.comments) {
      console.log("🔥 Fetching comment counts for", posts.length, "posts...");
      fetchCommentCountsForPosts(posts, tableUIDs);
    }
  }, [posts, tableUIDs.comments]);

  // Fetch comment counts for all posts efficiently
  const fetchCommentCountsForPosts = async (posts: any[], uids: any, appendMode = false) => {
    try {
      const client = await getSodularClient();
      if (!client || !uids.comments) {
        console.log("Cannot fetch comment counts - missing client or comments table UID");
        return;
      }

      console.log("Fetching comment counts for posts");

      // Get specific post IDs to fetch comments for
      const postIds = posts.map(post => post.uid);
      console.log("Fetching comments for post IDs:", postIds);

      // Get all comments at once (server limit is 50)
      const commentsResult = await client.ref.from(uids.comments).query({
        take: 50,
      });

      if (commentsResult.data && commentsResult.data.list) {
        // Group comments by postId, filtering for current posts
        const commentsByPost: Record<string, any[]> = {};
        
        commentsResult.data.list.forEach((comment: any) => {
          const postId = comment.data.postId;
          if (postId && postIds.includes(postId)) {
            if (!commentsByPost[postId]) {
              commentsByPost[postId] = [];
            }
            commentsByPost[postId].push(comment);
          }
        });

        // Sort comments for each post
        Object.keys(commentsByPost).forEach(postId => {
          commentsByPost[postId].sort((a, b) => 
            (a.data.createdAt || 0) - (b.data.createdAt || 0)
          );
        });

        if (appendMode) {
          // Merge with existing comments
          setComments(prevComments => ({
            ...prevComments,
            ...commentsByPost
          }));
        } else {
          // Replace all comments
          setComments(commentsByPost);
        }
        
        console.log("✅ Comment counts loaded:", Object.keys(commentsByPost).length, "posts with comments");
      }
    } catch (error) {
      console.error("Error fetching comment counts:", error);
    }
  };

  // Reset pagination and reload posts from beginning
  const resetAndRefreshPosts = async () => {
    setPostsOffset(0);
    setHasMorePosts(true);
    await fetchPosts(tableUIDs, false);
  };

  // Load more posts function
  const loadMorePosts = async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    
    setLoadingMorePosts(true);
    await fetchPosts(tableUIDs, true);
    setLoadingMorePosts(false);
  };

  const fetchPosts = async (customTableUIDs?: any, loadMore = false) => {
    try {
      if (!loadMore) {
        setIsLoadingPosts(true);
      }
      const client = await getSodularClient();
      if (!client) {
        console.log("No client available for fetching posts");
        return;
      }

      const uids = customTableUIDs || tableUIDs;
      if (!uids.posts) {
        console.log("Posts table UID not available");
        return;
      }

      const offset = loadMore ? postsOffset : 0;
      console.log(`Fetching posts using table UID: ${uids.posts}, offset: ${offset}, take: ${POSTS_PER_PAGE}`);
      
      const postsResult = await client.ref.from(uids.posts).query({
        take: POSTS_PER_PAGE,
        skip: offset,
      });

      console.log("Posts result:", postsResult);

      if (postsResult.data) {
        const newPosts = postsResult.data.list || [];
        
        // Sort posts by creation date (newest first)
        const sortedNewPosts = newPosts
          .sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
        
        console.log("New posts fetched:", sortedNewPosts.length);
        
        if (loadMore) {
          // Append to existing posts
          setPosts(prevPosts => [...prevPosts, ...sortedNewPosts]);
          setPostsOffset(prev => prev + POSTS_PER_PAGE);
        } else {
          // Replace existing posts (initial load)
          setPosts(sortedNewPosts);
          setPostsOffset(POSTS_PER_PAGE);
        }
        
        // Check if there are more posts to load
        setHasMorePosts(newPosts.length === POSTS_PER_PAGE);
        
        // Fetch comment counts for new posts if comments table is available
        if (uids.comments && sortedNewPosts.length > 0) {
          await fetchCommentCountsForPosts(sortedNewPosts, uids, loadMore);
        }
      } else {
        console.log("No posts data received");
        if (!loadMore) {
          setPosts([]);
        }
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      if (!loadMore) {
        setPosts([]);
      }
    } finally {
      if (!loadMore) {
        setIsLoadingPosts(false);
      }
    }
  };

  const fetchUsers = async (tableUIDs?: any) => {
    try {
      const client = await getSodularClient();
      if (!client) {
        console.log("No client available");
        return;
      }

      const uids = tableUIDs || {};
      if (!uids.users) {
        console.log("Users table UID not available");
        return;
      }

      console.log("Fetching users using table UID:", uids.users);
      const usersResult = await client.ref.from(uids.users).query({
        take: 100,
      });

      console.log("Users result:", usersResult);

      if (usersResult.data) {
        const usersList = usersResult.data.list || [];
        console.log("Users fetched:", usersList.length, usersList);
        setUsers(usersList);

        // If no users exist, create some sample users for testing
        if (usersList.length === 0) {
          console.log("No users found, creating sample users...");
          await createSampleUsers(client, uids.users);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const createSampleUsers = async (client?: any, usersTableUID?: string) => {
    try {
      const sodularClient = client || await getSodularClient();
      if (!sodularClient) {
        console.error("No client available for creating sample users");
        return;
      }

      const userTableId = usersTableUID || tableUIDs.users;
      if (!userTableId) {
        console.error("Users table UID not available");
        return;
      }

      console.log("Creating sample users...");
      
      const sampleUsers = [
        { username: "john_doe", displayName: "John Doe", email: "john@example.com" },
        { username: "jane_smith", displayName: "Jane Smith", email: "jane@example.com" },
        { username: "dallosh_bot", displayName: "Dallosh Bot", email: "bot@dallosh.com" },
        { username: "alice_wilson", displayName: "Alice Wilson", email: "alice@example.com" },
        { username: "bob_johnson", displayName: "Bob Johnson", email: "bob@example.com" },
      ];

      for (const userData of sampleUsers) {
        try {
          const result = await sodularClient.ref.from(userTableId).create({
            data: {
              ...userData,
              isAdmin: userData.username === "dallosh_bot",
              createdAt: Date.now(),
            },
          });
          console.log(`Created user ${userData.username}:`, result);
        } catch (userError) {
          console.error(`Failed to create user ${userData.username}:`, userError);
        }
      }

      console.log("Sample users creation completed");
      // Refetch users
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error("Error creating sample users:", error);
    }
  };

  const fetchBotSettings = async (tableUIDs?: any) => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      const uids = tableUIDs || {};
      if (!uids.bot_settings) {
        console.log("Bot settings table UID not available");
        return;
      }

      const botSettings = await client.ref.from(uids.bot_settings).query({ take: 1 });
      if (botSettings.data?.list && botSettings.data.list.length > 0) {
        setBotName(botSettings.data.list[0].data.botName);
      } else {
        // Create default bot settings if none exist
        await client.ref.from(uids.bot_settings).create({
          data: {
            botName: "dallosh_bot",
            welcomeMessage: "Hello! I'm here to help. How can I assist you today?",
            autoResponse: true,
            updatedAt: Date.now(),
          },
        });
        setBotName("dallosh_bot");
      }
    } catch (error) {
      console.error("Error fetching bot settings:", error);
    }
  };

  const fetchUserInteractions = async (tableUIDs?: any) => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      const uids = tableUIDs || {};

      // Fetch user's likes (only if likes table exists)
      if (uids.likes) {
        const likesResult = await client.ref.from(uids.likes).query({
          take: 50,
        });
        if (likesResult.data?.list) {
          const likedPostIds = new Set(
            likesResult.data.list
              .filter(like => like.data.userId === user?.uid && like.data.type === "post")
              .map(like => like.data.postId)
          );
          setLikedPosts(likedPostIds);
        }
      }

      // Fetch user's reposts (only if reposts table exists)
      if (uids.reposts) {
        const repostsResult = await client.ref.from(uids.reposts).query({
          take: 50,
        });
        if (repostsResult.data?.list) {
          const repostedPostIds = new Set(
            repostsResult.data.list
              .filter(repost => repost.data.userId === user?.uid)
              .map(repost => repost.data.postId)
          );
          setRepostedPosts(repostedPostIds);
        }
      }

      // Fetch user's bookmarks (only if bookmarks table exists)
      if (uids.bookmarks) {
        const bookmarksResult = await client.ref.from(uids.bookmarks).query({
          take: 50,
        });
        if (bookmarksResult.data?.list) {
          const bookmarkedPostIds = new Set(
            bookmarksResult.data.list
              .filter(bookmark => bookmark.data.userId === user?.uid)
              .map(bookmark => bookmark.data.postId)
          );
          setBookmarkedPosts(bookmarkedPostIds);
        }
      }
    } catch (error) {
      console.error("Error fetching user interactions:", error);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.trim()) {
      console.log("Cannot submit - no content");
      return;
    }

    if (!user) {
      console.log("Cannot submit - no user logged in");
      alert("Please log in to post");
      return;
    }

    // Check if tables are properly initialized
    if (!tableUIDs.posts || Object.keys(tableUIDs).length === 0) {
      alert("Tables are still being initialized. Please wait a moment and try again!");
      return;
    }

    setIsSubmitting(true);
    console.log("=== SUBMITTING POST ===");
    console.log("Post content:", newPost);
    console.log("User:", user);
    console.log("Table UIDs:", tableUIDs);

    try {
      const client = await getSodularClient();
      if (!client) {
        console.error("Failed to get Sodular client");
        alert("Connection error. Please try again.");
        return;
      }

      console.log("Client obtained successfully");

      // Extract mentions, hashtags, and URLs
      const mentions = extractMentions(newPost);
      const hashtags = extractHashtags(newPost);
      const urls = extractUrls(newPost);

      // Create the post data
      const postData = {
        content: newPost,
        authorId: user.uid,
        authorName: user.data.fields?.displayName || user.data.username || "Unknown User",
        authorUsername: user.data.username || "unknown",
        authorImage: user.data.imageUrl || "",
        likes: 0,
        reposts: 0,
        createdAt: Date.now(),
        mentions,
        hashtags,
        urls,
        viewCount: 0,
      };

      console.log("Creating post with data:", postData);

      // Check if posts table UID is available
      if (!tableUIDs.posts) {
        console.error("Posts table UID not available");
        alert("Table not initialized. Please refresh the page.");
        return;
      }

      // Create the post using table UID
      const postResult = await client.ref.from(tableUIDs.posts).create({
        data: postData,
      });

      console.log("Post creation result:", postResult);

      if (postResult.data && postResult.data.uid) {
        console.log("✅ Post created successfully!");
        setNewPost("");
        
        // Refresh posts to show the new one
        setTimeout(() => {
          resetAndRefreshPosts();
        }, 500);

        // Handle bot mentions
        if (mentions.includes(botName)) {
          console.log("Bot mentioned, creating bot reply...");
          await handleBotMention(postResult.data.uid, client);
        }
      } else {
        console.error("Post creation failed:", postResult);
        alert("Failed to create post. Please try again.");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bot mentions by creating a comment reply
  const handleBotMention = async (postId: string, client: any) => {
    try {
      if (!tableUIDs.comments) {
        console.error("Comments table UID not available");
        return;
      }

      console.log("Creating bot reply comment for post:", postId);

      const botComment = await client.ref.from(tableUIDs.comments).create({
        data: {
          content: `Hello! Thanks for mentioning me. I'm here to help with any questions or support you need. How can I assist you today?`,
          postId: postId,
          authorId: "bot",
          authorName: "Dallosh Bot",
          authorUsername: botName,
          authorImage: "",
          createdAt: Date.now(),
          likes: 0,
          mentions: [],
        },
      });

      console.log("Bot comment created:", botComment);

      // No need to update comment count - calculated dynamically

    } catch (error) {
      console.error("Error creating bot reply:", error);
    }
  };

  // Get comment count for a post
  const getCommentCount = (postId: string): number => {
    return comments[postId]?.length || 0;
  };

  // Toggle comment expansion and fetch comments
  const toggleComments = async (postId: string) => {
    const isExpanded = expandedComments.has(postId);
    
    if (isExpanded) {
      // Collapse comments
      const newExpanded = new Set(expandedComments);
      newExpanded.delete(postId);
      setExpandedComments(newExpanded);
    } else {
      // Expand comments and fetch them
      const newExpanded = new Set(expandedComments);
      newExpanded.add(postId);
      setExpandedComments(newExpanded);
      
      // Fetch comments for this post
      await fetchCommentsForPost(postId);
    }
  };

  // Fetch comments for a specific post (only if not already loaded)
  const fetchCommentsForPost = async (postId: string, loadMore = false) => {
    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.comments) {
        console.log("Cannot fetch comments - missing client or comments table UID");
        return;
      }

      const offset = loadMore ? (commentOffsets[postId] || 0) : 0;
      console.log(`Fetching comments for post ${postId}, offset: ${offset}, take: ${COMMENTS_PER_PAGE}`);

      const commentsResult = await client.ref.from(tableUIDs.comments).query({
        filter: {
          'data.postId': postId
        },
        take: COMMENTS_PER_PAGE,
        skip: offset
      });

      console.log(`Comments result:`, commentsResult);

      if (commentsResult.data && commentsResult.data.list) {
        // Sort comments by creation date (oldest first)
        const sortedComments = commentsResult.data.list.sort((a, b) => 
          (a.data.createdAt || 0) - (b.data.createdAt || 0)
        );
        
        console.log(`New comments for post ${postId}:`, sortedComments.length);
        
        if (loadMore) {
          // Append to existing comments
          setComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), ...sortedComments]
          }));
          setCommentOffsets(prev => ({
            ...prev,
            [postId]: offset + COMMENTS_PER_PAGE
          }));
        } else {
          // Replace existing comments (initial load)
          setComments(prev => ({
            ...prev,
            [postId]: sortedComments
          }));
          setCommentOffsets(prev => ({
            ...prev,
            [postId]: COMMENTS_PER_PAGE
          }));
        }
        
        // Check if there are more comments to load
        setHasMoreComments(prev => ({
          ...prev,
          [postId]: sortedComments.length === COMMENTS_PER_PAGE
        }));
        
      } else {
        console.log(`No comments found for post ${postId}`);
        if (!loadMore) {
          setComments(prev => ({
            ...prev,
            [postId]: []
          }));
          setHasMoreComments(prev => ({
            ...prev,
            [postId]: false
          }));
        }
      }

    } catch (error) {
      console.error("Error fetching comments:", error);
      if (!loadMore) {
        setComments(prev => ({
          ...prev,
          [postId]: []
        }));
      }
    }
  };

  // Load more comments for a specific post
  const loadMoreComments = async (postId: string) => {
    if (loadingMoreComments[postId] || !hasMoreComments[postId]) return;
    
    setLoadingMoreComments(prev => ({ ...prev, [postId]: true }));
    await fetchCommentsForPost(postId, true);
    setLoadingMoreComments(prev => ({ ...prev, [postId]: false }));
  };

  // Post Management Functions
  const handleEditPost = (post: any) => {
    setEditingPost(post.uid);
    setEditPostContent(post.data.content);
  };

  const handleCancelEditPost = () => {
    setEditingPost(null);
    setEditPostContent("");
  };

  const handleSaveEditPost = async () => {
    if (!editPostContent.trim() || !editingPost || !user) return;

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.posts) {
        alert("Connection error. Please try again.");
        return;
      }

      // Extract mentions, hashtags, and URLs from edited content
      const mentions = extractMentions(editPostContent);
      const hashtags = extractHashtags(editPostContent);
      const urls = extractUrls(editPostContent);

      const updateData = {
        content: editPostContent.trim(),
        mentions,
        hashtags,
        urls,
        updatedAt: Date.now(),
      };

      console.log("Updating post:", editingPost, "with data:", updateData);

      const result = await client.ref.from(tableUIDs.posts).patch({ uid: editingPost }, {
        data: updateData
      });

      if (result.data) {
        console.log("✅ Post updated successfully!");
        setEditingPost(null);
        setEditPostContent("");
        await resetAndRefreshPosts();
      } else {
        console.error("Failed to update post:", result);
        alert("Failed to update post. Please try again.");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Error updating post. Please try again.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.posts) {
        alert("Connection error. Please try again.");
        return;
      }

      console.log("Deleting post:", postId);

      const result = await client.ref.from(tableUIDs.posts).delete({ uid: postId });

      if (!result.error) {
        console.log("✅ Post deleted successfully!");
        await resetAndRefreshPosts();
      } else {
        console.error("Failed to delete post:", result);
        alert("Failed to delete post. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Error deleting post. Please try again.");
    }
  };

  // Comment Management Functions
  const handleEditComment = (comment: any) => {
    setEditingComment(comment.uid);
    setEditCommentContent(comment.data.content);
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditCommentContent("");
  };

  const handleSaveEditComment = async (postId: string) => {
    if (!editCommentContent.trim() || !editingComment || !user) return;

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.comments) {
        alert("Connection error. Please try again.");
        return;
      }

      const updateData = {
        content: editCommentContent.trim(),
        updatedAt: Date.now(),
      };

      console.log("Updating comment:", editingComment, "with data:", updateData);

      const result = await client.ref.from(tableUIDs.comments).patch({ uid: editingComment }, {
        data: updateData
      });

      if (result.data) {
        console.log("✅ Comment updated successfully!");
        setEditingComment(null);
        setEditCommentContent("");
        
        // Refresh comments for this specific post
        setComments(prev => ({
          ...prev,
          [postId]: []
        }));
        await fetchCommentsForPost(postId, false);
      } else {
        console.error("Failed to update comment:", result);
        alert("Failed to update comment. Please try again.");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Error updating comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string, isPostOwner: boolean = false) => {
    if (!user) return;
    
    const message = isPostOwner 
      ? "Are you sure you want to delete this comment from your post?"
      : "Are you sure you want to delete your comment?";
    
    if (!confirm(message + " This action cannot be undone.")) {
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.comments) {
        alert("Connection error. Please try again.");
        return;
      }

      console.log("Deleting comment:", commentId);

      const result = await client.ref.from(tableUIDs.comments).delete({ uid: commentId });

      if (!result.error) {
        console.log("✅ Comment deleted successfully!");
        
        // Remove comment from local state immediately for better UX
        setComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(comment => comment.uid !== commentId)
        }));
        
        // Refresh posts to update comment counts
        await resetAndRefreshPosts();
      } else {
        console.error("Failed to delete comment:", result);
        alert("Failed to delete comment. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Error deleting comment. Please try again.");
    }
  };

  // Handle reply submission for inline comments
  const handleInlineReply = async (postId: string) => {
    const replyContent = replyInputs[postId];
    if (!replyContent?.trim() || !user) return;

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.comments) return;

      console.log("Creating inline comment reply:", {
        content: replyContent,
        postId: postId
      });

      const commentResult = await client.ref.from(tableUIDs.comments).create({
        data: {
          content: replyContent,
          postId: postId,
          authorId: user.uid,
          authorName: user.data.fields?.displayName || user.data.username || "Unknown User",
          authorUsername: user.data.username || "unknown",
          authorImage: user.data.imageUrl || "",
          createdAt: Date.now(),
        },
      });

      console.log("Comment creation result:", commentResult);

      if (commentResult.data && commentResult.data.uid) {
        console.log("✅ Comment created successfully!");
        
        // Add the comment directly to local state (immediate update)
        const newComment = {
          uid: commentResult.data.uid,
          data: commentResult.data.data,
          createdAt: commentResult.data.createdAt
        };
        
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment].sort((a, b) => 
            (a.data.createdAt || 0) - (b.data.createdAt || 0)
          )
        }));
        
        // Clear the reply input
        setReplyInputs(prev => ({
          ...prev,
          [postId]: ""
        }));

        console.log("Comment added to local state:", newComment);
      } else {
        console.error("Comment creation failed:", commentResult);
        alert("Failed to create comment. Please try again.");
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      alert(`Failed to create comment: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Old reply function removed - now using inline comment system

  const handleLike = async (post: Post) => {
    if (!user) return;

    try {
      const client = await getSodularClient();
      if (!client) return;

      const isLiked = likedPosts.has(post.uid);

      if (isLiked) {
        // Unlike
        if (!tableUIDs.likes) return;
        
        const likesResult = await client.ref.from(tableUIDs.likes).query({
          take: 50,
        });
        
        if (likesResult.data?.list) {
          const likeToDelete = likesResult.data.list.find(
            like => like.data.userId === user.uid && like.data.postId === post.uid && like.data.type === "post"
          );
          
          if (likeToDelete) {
            await client.ref.from(tableUIDs.likes).delete({ uid: likeToDelete.uid });
          }
        }

        // Update post like count
        if (!tableUIDs.posts) return;
        await client.ref.from(tableUIDs.posts).patch(
          { uid: post.uid },
          {
            data: {
              likes: Math.max(0, post.data.likes - 1),
            },
          }
        );

        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.uid);
          return newSet;
        });
      } else {
        // Like
        if (!tableUIDs.likes) return;
        await client.ref.from(tableUIDs.likes).create({
          data: {
            userId: user.uid,
            postId: post.uid,
            createdAt: Date.now(),
            type: "post",
          },
        });

        // Update post like count
        if (!tableUIDs.posts) return;
        await client.ref.from(tableUIDs.posts).patch(
          { uid: post.uid },
          {
            data: {
              likes: post.data.likes + 1,
            },
          }
        );

        setLikedPosts(prev => new Set(prev).add(post.uid));
      }

      // Refresh posts to show updated counts
      await resetAndRefreshPosts();
    } catch (error) {
      console.error("Error handling like:", error);
    }
  };

  const handleRepost = async (post: Post) => {
    if (!user) return;

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.reposts || !tableUIDs.posts) return;

      const isReposted = repostedPosts.has(post.uid);

      if (isReposted) {
        // Remove repost
        const repostsResult = await client.ref.from(tableUIDs.reposts).query({
          take: 50,
        });
        
        if (repostsResult.data?.list) {
          const repostToDelete = repostsResult.data.list.find(
            repost => repost.data.userId === user.uid && repost.data.postId === post.uid
          );
          
          if (repostToDelete) {
            await client.ref.from(tableUIDs.reposts).delete({ uid: repostToDelete.uid });
          }
        }

        // Update post repost count
        await client.ref.from(tableUIDs.posts).patch(
          { uid: post.uid },
          {
            data: {
              reposts: Math.max(0, post.data.reposts - 1),
            },
          }
        );

        setRepostedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.uid);
          return newSet;
        });
      } else {
        // Create repost
        await client.ref.from(tableUIDs.reposts).create({
          data: {
            userId: user.uid,
            postId: post.uid,
            createdAt: Date.now(),
            isQuote: false,
          },
        });

        // Update post repost count
        await client.ref.from(tableUIDs.posts).patch(
          { uid: post.uid },
          {
            data: {
              reposts: post.data.reposts + 1,
            },
          }
        );

        setRepostedPosts(prev => new Set(prev).add(post.uid));
      }

      // Refresh posts to show updated counts
      await resetAndRefreshPosts();
    } catch (error) {
      console.error("Error handling repost:", error);
    }
  };

  const handleBookmark = async (post: Post) => {
    if (!user) return;

    try {
      const client = await getSodularClient();
      if (!client || !tableUIDs.bookmarks) return;

      const isBookmarked = bookmarkedPosts.has(post.uid);

      if (isBookmarked) {
        // Remove bookmark
        const bookmarksResult = await client.ref.from(tableUIDs.bookmarks).query({
          take: 50,
        });
        
        if (bookmarksResult.data?.list) {
          const bookmarkToDelete = bookmarksResult.data.list.find(
            bookmark => bookmark.data.userId === user.uid && bookmark.data.postId === post.uid
          );
          
          if (bookmarkToDelete) {
            await client.ref.from(tableUIDs.bookmarks).delete({ uid: bookmarkToDelete.uid });
          }
        }

        setBookmarkedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.uid);
          return newSet;
        });
      } else {
        // Create bookmark
        await client.ref.from(tableUIDs.bookmarks).create({
          data: {
            userId: user.uid,
            postId: post.uid,
            createdAt: Date.now(),
            tags: [],
          },
        });

        setBookmarkedPosts(prev => new Set(prev).add(post.uid));
      }
    } catch (error) {
      console.error("Error handling bookmark:", error);
    }
  };

  const handleMentionDetection = (value: string, cursorPos: number) => {
    // Check for @ mentions - find the last @ before cursor position
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1) {
      // Get the text after the @ symbol up to cursor
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      
      // Check if we're still typing a mention (no space or newline after @)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        if (users.length === 0) {
          setShowUserSuggestions(false);
          return;
        }

        if (textAfterAt.length > 0) {
          // Filter users based on search query
          const filteredUsers = users.filter(u => 
            u.data.username && // Only include users with valid usernames
            (
              (u.data.username?.toLowerCase().includes(textAfterAt.toLowerCase())) ||
              (u.data.displayName?.toLowerCase().includes(textAfterAt.toLowerCase()))
            )
          ).slice(0, 5);
          
          setUserSuggestions(filteredUsers);
          setShowUserSuggestions(filteredUsers.length > 0);
        } else {
          // Show top users when just typed @ (only users with valid usernames)
          const topUsers = users.filter(u => u.data.username).slice(0, 5);
          setUserSuggestions(topUsers);
          setShowUserSuggestions(topUsers.length > 0);
        }
      } else {
        setShowUserSuggestions(false);
      }
    } else {
      setShowUserSuggestions(false);
    }
  };

  const insertUserMention = (username: string) => {
    if (!username || username.trim() === "") return;
    
    const textBeforeCursor = newPost.slice(0, cursorPosition);
    const textAfterCursor = newPost.slice(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol === -1) return;
    
    const beforeMention = newPost.slice(0, lastAtSymbol);
    const newValue = beforeMention + `@${username} ` + textAfterCursor;
    const newCursorPos = lastAtSymbol + username.length + 2; // +2 for @ and space
    
    setNewPost(newValue);
    setShowUserSuggestions(false);
    setCursorPosition(newCursorPos);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const displayName = user?.data?.fields?.displayName || user?.data?.username || 'User';

  return (
    <div className="w-full min-h-screen">
      {/* Header with tabs */}
      <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex">
          <button className="flex-1 py-4 text-center hover:bg-gray-900 transition-colors border-b-2 border-blue-500 text-white font-semibold relative">
            For you
            {(isInitialLoading || isLoadingPosts) && (
              <div className="absolute top-2 right-4">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
              </div>
            )}
          </button>
          <button className="flex-1 py-4 text-center hover:bg-gray-900 transition-colors text-gray-500 font-semibold">
            Following
          </button>
        </div>
      </div>

      {/* Create Post */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.data?.imageUrl} alt={user?.data?.username} />
            <AvatarFallback className="bg-gray-600 text-white">{user?.data?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <form onSubmit={handlePostSubmit}>
              <div className="relative">
                <MentionTextarea
                  value={newPost}
                  onChange={(value) => setNewPost(value)}
                  onCursorPositionChange={(position) => setCursorPosition(position)}
                  placeholder="What is happening?!"
                  className="bg-transparent border-0 text-xl placeholder-gray-500 focus:ring-0 resize-none min-h-[60px] text-white focus:outline-none"
                  maxLength={280}
                />
                {showUserSuggestions && userSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-black border border-gray-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto mt-1">
                    {userSuggestions.map((user, index) => (
                      <button
                        key={user.uid || index}
                        type="button"
                        onClick={() => insertUserMention(user.data.username || "")}
                        className="w-full p-4 hover:bg-gray-900 flex items-center gap-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.data.imageUrl} alt={user.data.username} />
                          <AvatarFallback className="bg-gray-600 text-white font-semibold">
                            {(user.data.username || "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-bold text-white">{user.data.displayName || user.data.username || "Unknown"}</div>
                          <div className="text-sm text-gray-400">@{user.data.username || "unknown"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-blue-500">
                  <button type="button" className="hover:bg-blue-500 hover:bg-opacity-10 p-2 rounded-full transition-colors">
                    <Image className="h-5 w-5" />
                  </button>
                  <button type="button" className="hover:bg-blue-500 hover:bg-opacity-10 p-2 rounded-full transition-colors">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button type="button" className="hover:bg-blue-500 hover:bg-opacity-10 p-2 rounded-full transition-colors">
                    <MapPin className="h-5 w-5" />
                  </button>
                  <button type="button" className="hover:bg-blue-500 hover:bg-opacity-10 p-2 rounded-full transition-colors">
                    <Calendar className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {newPost.length > 260 && (
                    <div className="text-sm text-red-400 font-medium">
                      {280 - newPost.length}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    disabled={!newPost.trim() || isSubmitting || newPost.length > 280}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500 disabled:opacity-50 rounded-full px-6 py-2 font-bold text-white"
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="divide-y divide-gray-800">
        {/* Show skeleton loading on initial load */}
        {isInitialLoading && (
          <PostSkeletonList count={5} />
        )}
        
        {/* Show skeleton loading when refreshing posts */}
        {!isInitialLoading && isLoadingPosts && posts.length === 0 && (
          <PostSkeletonList count={3} />
        )}
        
        {/* Render actual posts */}
        {!isInitialLoading && posts.map((post, index) => (
          <div 
            key={post.uid} 
            className="px-4 py-3 hover:bg-gray-950 hover:bg-opacity-50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-top-2"
            style={{ 
              animationDelay: `${index * 50}ms`,
              animationDuration: '300ms',
              animationFillMode: 'both'
            }}
          >
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 mt-1">
                <AvatarImage src={post.data.authorImage} alt={post.data.authorUsername} />
                <AvatarFallback className="bg-gray-600 text-white">{(post.data.authorUsername || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-white truncate">{post.data.authorName}</span>
                  <span className="text-gray-500 truncate">@{post.data.authorUsername}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500 hover:underline">{formatDate(post.data.createdAt)}</span>
                  {post.data.mentions.includes(botName) && (
                    <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400 border-0">
                      <Bot className="h-3 w-3 mr-1" />
                      Bot
                    </Badge>
                  )}
                  
                  {/* Post Management Menu - only show for post owner */}
                  {user && post.data.authorId === user.uid && (
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-400 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-gray-700">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post);
                            }}
                            className="text-white hover:bg-gray-800 cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit post
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.uid);
                            }}
                            className="text-red-400 hover:bg-gray-800 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Admin Dashboard Menu - show for admin users */}
                  {user && (user.data.fields?.isAdmin || user.data.email === 'admin@dallosh.com') && (
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-800 text-blue-400 hover:text-blue-300"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-gray-700">
                          <DropdownMenuItem asChild>
                            <Link href="/admin/twitter" className="cursor-pointer text-white">
                              <Crown className="mr-2 h-4 w-4" />
                              <span>Twitter Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/dallosh" className="cursor-pointer text-white">
                              <Bot className="mr-2 h-4 w-4" />
                              <span>Dallosh Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                
                {/* Post Content or Edit Mode */}
                {editingPost === post.uid ? (
                  <div className="mb-3">
                    <MentionTextarea
                      value={editPostContent}
                      onChange={(value) => setEditPostContent(value)}
                      className="bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[100px] text-[15px]"
                      placeholder="What's happening?"
                      maxLength={280}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-400">
                        {editPostContent.length}/280
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCancelEditPost}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveEditPost}
                          disabled={!editPostContent.trim() || editPostContent === post.data.content}
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-white text-[15px] leading-5 mb-3 whitespace-pre-wrap break-words">
                    {parseMentions(post.data.content)}
                    {post.data.updatedAt && post.data.updatedAt !== post.data.createdAt && (
                      <span className="text-gray-500 text-xs ml-2">(edited)</span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between max-w-md">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComments(post.uid);
                    }}
                    className={`flex items-center gap-2 transition-colors group ${
                      expandedComments.has(post.uid) 
                        ? 'text-blue-500' 
                        : 'text-gray-500 hover:text-blue-500'
                    }`}
                  >
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-sm">{getCommentCount(post.uid)}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRepost(post);
                    }}
                    className={`flex items-center gap-2 transition-colors group ${
                      repostedPosts.has(post.uid) 
                        ? 'text-green-500' 
                        : 'text-gray-500 hover:text-green-500'
                    }`}
                  >
                    <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                      <Repeat className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-sm">{post.data.reposts}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post);
                    }}
                    className={`flex items-center gap-2 transition-colors group ${
                      likedPosts.has(post.uid) 
                        ? 'text-red-500' 
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <div className="p-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                      <Heart className={`h-[18px] w-[18px] ${likedPosts.has(post.uid) ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-sm">{post.data.likes}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                      setShowPostDialog(true);
                    }}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors group"
                  >
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                      <BarChart3 className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-sm">{post.data.viewCount || 0}</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(post);
                      }}
                      className={`p-2 rounded-full transition-colors group ${
                        bookmarkedPosts.has(post.uid) 
                          ? 'text-blue-500' 
                          : 'text-gray-500 hover:text-blue-500'
                      }`}
                    >
                      <div className="group-hover:bg-blue-500/10 p-1 rounded-full">
                        <Bookmark className={`h-[18px] w-[18px] ${bookmarkedPosts.has(post.uid) ? 'fill-current' : ''}`} />
                      </div>
                    </button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-500/10 transition-colors"
                        >
                          <Share className="h-[18px] w-[18px]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-gray-800">
                        <DropdownMenuItem className="text-white">Copy link to post</DropdownMenuItem>
                        <DropdownMenuItem className="text-white">Send via Direct Message</DropdownMenuItem>
                        <DropdownMenuItem className="text-white">Share post via...</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            {expandedComments.has(post.uid) && (
              <div className="mt-2 border-t border-gray-800">
                {/* Existing Comments */}
                {comments[post.uid]?.length > 0 ? (
                  comments[post.uid].map((comment) => (
                  <div key={comment.uid} className="flex gap-3 px-4 py-3 border-b border-gray-800/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.data.authorImage} alt={comment.data.authorUsername} />
                      <AvatarFallback className="bg-gray-600 text-white text-sm">
                        {(comment.data.authorUsername || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-semibold text-white text-sm">{comment.data.authorName}</span>
                        <span className="text-gray-500 text-sm">@{comment.data.authorUsername}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 text-sm">{formatDate(comment.data.createdAt)}</span>
                        
                        {/* Comment Management Menu */}
                        {user && (
                          // Show edit/delete for comment owner OR delete for post owner
                          (comment.data.authorId === user.uid || post.data.authorId === user.uid) && (
                            <div className="ml-auto">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-800 text-gray-400 hover:text-white"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black border-gray-700">
                                  {/* Edit option only for comment owner */}
                                  {comment.data.authorId === user.uid && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditComment(comment);
                                      }}
                                      className="text-white hover:bg-gray-800 cursor-pointer"
                                    >
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit comment
                                    </DropdownMenuItem>
                                  )}
                                  {/* Delete option for comment owner OR post owner */}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(
                                        comment.uid, 
                                        post.uid, 
                                        post.data.authorId === user.uid && comment.data.authorId !== user.uid
                                      );
                                    }}
                                    className="text-red-400 hover:bg-gray-800 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete comment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )
                        )}
                        
                        {/* Admin Dashboard Menu for Comments - show for admin users */}
                        {user && (user.data.fields?.isAdmin || user.data.email === 'admin@dallosh.com') && (
                          <div className="ml-auto">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-gray-800 text-blue-400 hover:text-blue-300"
                                >
                                  <Crown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-black border-gray-700">
                                <DropdownMenuItem asChild>
                                  <Link href="/admin/twitter" className="cursor-pointer text-white">
                                    <Crown className="mr-2 h-3 w-3" />
                                    <span>Twitter Dashboard</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href="/admin/dallosh" className="cursor-pointer text-white">
                                    <Bot className="mr-2 h-3 w-3" />
                                    <span>Dallosh Dashboard</span>
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      {/* Comment Content or Edit Mode */}
                      {editingComment === comment.uid ? (
                        <div className="mt-1">
                          <MentionTextarea
                            value={editCommentContent}
                            onChange={(value) => setEditCommentContent(value)}
                            className="bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[60px] text-sm"
                            placeholder="Write your comment..."
                            maxLength={280}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-gray-400">
                              {editCommentContent.length}/280
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleCancelEditComment}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleSaveEditComment(post.uid)}
                                disabled={!editCommentContent.trim() || editCommentContent === comment.data.content}
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white text-sm leading-5 whitespace-pre-wrap break-words">
                          {parseMentions(comment.data.content)}
                          {comment.data.updatedAt && comment.data.updatedAt !== comment.data.createdAt && (
                            <span className="text-gray-500 text-xs ml-2">(edited)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                )}

                {/* Load More Comments Button */}
                {hasMoreComments[post.uid] && comments[post.uid]?.length > 0 && (
                  <div className="px-4 py-3">
                    <Button
                      onClick={() => loadMoreComments(post.uid)}
                      disabled={loadingMoreComments[post.uid]}
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-500 hover:bg-blue-500/10 border border-gray-700 hover:border-blue-500"
                    >
                      {loadingMoreComments[post.uid] ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                          Loading more comments...
                        </>
                      ) : (
                        `Load more comments`
                      )}
                    </Button>
                  </div>
                )}

                {/* Reply Input */}
                <div className="flex gap-3 px-4 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.data.imageUrl} alt={user?.data.username} />
                    <AvatarFallback className="bg-gray-600 text-white text-sm">
                      {(user?.data.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <MentionTextarea
                        placeholder="Post your reply"
                        value={replyInputs[post.uid] || ""}
                        onChange={(value) => setReplyInputs(prev => ({
                          ...prev,
                          [post.uid]: value
                        }))}
                        className="flex-1 bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[80px] text-sm"
                        maxLength={280}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-400">
                        {(replyInputs[post.uid] || "").length}/280
                      </div>
                      <Button 
                        onClick={() => handleInlineReply(post.uid)}
                        disabled={!(replyInputs[post.uid] || "").trim()}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 rounded-full px-4"
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Load More Posts Button */}
        {hasMorePosts && posts.length > 0 && !isInitialLoading && (
          <div className="px-4 py-6 border-t border-gray-800">
            <Button
              onClick={loadMorePosts}
              disabled={loadingMorePosts}
              variant="outline"
              className="w-full bg-transparent border-gray-700 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500 transition-all duration-200"
            >
              {loadingMorePosts ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  Loading more posts...
                </>
              ) : (
                "Load more posts"
              )}
            </Button>
          </div>
        )}
        
        {/* Show skeleton while loading more posts */}
        {loadingMorePosts && (
          <PostSkeletonList count={3} />
        )}
      </div>

      {!isInitialLoading && !isLoadingPosts && posts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No posts yet</div>
          <div className="text-sm text-gray-500">Be the first to post something!</div>
          
          {/* Debug Info */}
          <div className="mt-8 p-4 bg-gray-800 rounded-lg text-left max-w-md mx-auto">
            <h3 className="text-white font-bold mb-2">Debug Info:</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <div>User: {user ? `${user.data.username} (${user.uid})` : 'Not logged in'}</div>
              <div>Users loaded: {users.length}</div>
              <div>Show suggestions: {showUserSuggestions ? 'true' : 'false'}</div>
              <div>Bot name: {botName}</div>
            </div>
            
            {users.length === 0 && (
              <button
                onClick={() => createSampleUsers()}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Sample Users
              </button>
            )}
          </div>
        </div>
      )}

      {/* Old Reply Dialog removed - now using inline comments */}

      {/* Post Detail Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedPost.data.authorImage} alt={selectedPost.data.authorUsername} />
                  <AvatarFallback>{(selectedPost.data.authorUsername || "U")[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{selectedPost.data.authorName}</span>
                    <span className="text-gray-400">@{selectedPost.data.authorUsername}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500">{formatDate(selectedPost.data.createdAt)}</span>
                  </div>
                  <p className="text-gray-300">{selectedPost.data.content}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{selectedPost.data.viewCount || 0}</div>
                  <div className="text-sm text-gray-400">Views</div>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{selectedPost.data.reposts}</div>
                  <div className="text-sm text-gray-400">Reposts</div>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{selectedPost.data.likes}</div>
                  <div className="text-sm text-gray-400">Likes</div>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{selectedPost ? getCommentCount(selectedPost.uid) : 0}</div>
                  <div className="text-sm text-gray-400">Replies</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
