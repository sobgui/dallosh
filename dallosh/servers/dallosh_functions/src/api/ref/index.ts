import { getSodularClient } from '../../services/client';

// Bot configuration
const BOT_CONFIG = {
  BOT_NAME: 'dallosh_bot',
  TRIGGER_MENTION: '@free',
  FRONTEND_HOST: process.env.FRONTEND_HOST || 'http://localhost:3000',
  BOT_AVATAR: 'https://via.placeholder.com/40x40/3B82F6/FFFFFF?text=🤖'
};

// Bot state management
let botInitialized = false;
let tableUIDs: {
  posts?: string;
  comments?: string;
  chat?: string;
  messages?: string;
  users?: string;
} = {};
let eventListeners: any[] = [];
let isListening = false;

// Initialize bot and get table UIDs
async function initializeBot() {
  if (botInitialized) return;
  
  try {
    console.log('🤖 Initializing bot...');
    const client = await getSodularClient();
    if (!client) {
      throw new Error('Failed to get Sodular client');
    }

    // Get or create required tables
    const tables = ['posts', 'comments', 'chat', 'messages', 'users'];
    
    for (const tableName of tables) {
      try {
        const table = await client.tables.get({ filter: { 'data.name': tableName } });
        if (table.data?.uid) {
          tableUIDs[tableName as keyof typeof tableUIDs] = table.data.uid;
          console.log(`✅ Table ${tableName} found with UID:`, table.data.uid);
        } else {
          // Create table if it doesn't exist
          const tableSchema = getTableSchema(tableName);
          if (tableSchema) {
            const newTable = await client.tables.create({ data: tableSchema });
            if (newTable.data?.uid) {
              tableUIDs[tableName as keyof typeof tableUIDs] = newTable.data.uid;
              console.log(`✅ Table ${tableName} created with UID:`, newTable.data.uid);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error with table ${tableName}:`, error);
      }
    }

    botInitialized = true;
    console.log('🤖 Bot initialization complete');
    console.log('📋 Table UIDs:', tableUIDs);
  } catch (error) {
    console.error('❌ Bot initialization failed:', error);
    botInitialized = false;
    throw error;
  }
}

// Clean up event listeners
function cleanupEventListeners() {
  if (eventListeners.length > 0) {
    console.log('🧹 Cleaning up event listeners...');
    eventListeners.forEach(listener => {
      try {
        if (listener && typeof listener.off === 'function') {
          listener.off();
        }
      } catch (error) {
        console.warn('⚠️ Error cleaning up listener:', error);
      }
    });
    eventListeners = [];
    isListening = false;
  }
}

// Set up event listeners with error handling
function setupEventListeners(client: any) {
  try {
    if (!tableUIDs.posts) {
      console.error('❌ Posts table UID not available');
      return false;
    }

    console.log('🔌 Setting up ref event listeners...');

    // Clean up any existing listeners first
    cleanupEventListeners();

    // Set up event listeners for posts table
    const refClient = client.ref.from(tableUIDs.posts);
    
    const listeners = [
      refClient.on('created', (data: any) => {
        console.log('🆕 Post created event received:', data);
        handlePostCreated(data, client);
      }),
      refClient.on('replaced', (data: any) => {
        console.log('🔄 Post replaced event received:', data);
      }),
      refClient.on('patched', (data: any) => {
        console.log('🔧 Post patched event received:', data);
      }),
      refClient.on('deleted', (data: any) => {
        console.log('🗑️ Post deleted event received:', data);
      })
    ];

    // Store listeners for cleanup
    eventListeners.push(...listeners);

    console.log('✅ Ref event listeners set up successfully');
    console.log('🤖 Bot is now listening for @free mentions...');
    isListening = true;
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up event listeners:', error);
    isListening = false;
    return false;
  }
}

// Get table schema for creation
function getTableSchema(tableName: string) {
  const schemas: Record<string, any> = {
    posts: {
      name: 'posts',
      description: 'Social media posts',
      fields: [
        { name: 'content', type: 'text', required: true },
        { name: 'authorId', type: 'text', required: true },
        { name: 'authorName', type: 'text', required: true },
        { name: 'authorUsername', type: 'text', required: true },
        { name: 'mentions', type: 'array' },
        { name: 'hashtags', type: 'array' },
        { name: 'createdAt', type: 'number', required: true }
      ]
    },
    comments: {
      name: 'comments',
      description: 'Post comments',
      fields: [
        { name: 'content', type: 'text', required: true },
        { name: 'postId', type: 'text', required: true },
        { name: 'authorId', type: 'text', required: true },
        { name: 'authorName', type: 'text', required: true },
        { name: 'authorUsername', type: 'text', required: true },
        { name: 'createdAt', type: 'number', required: true }
      ]
    },
    chat: {
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
        { name: 'lastMessageTime', type: 'number' }
      ]
    },
    messages: {
      name: 'messages',
      description: 'Chat messages',
      fields: [
        { name: 'chatId', type: 'text', required: true },
        { name: 'content', type: 'text', required: true },
        { name: 'senderId', type: 'text', required: true },
        { name: 'senderName', type: 'text', required: true },
        { name: 'senderType', type: 'text', required: true },
        { name: 'createdAt', type: 'number', required: true },
        { name: 'isRead', type: 'boolean', defaultValue: false }
      ]
    },
    users: {
      name: 'users',
      description: 'User accounts',
      fields: [
        { name: 'username', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'displayName', type: 'text', required: true },
        { name: 'imageUrl', type: 'text' },
        { name: 'createdAt', type: 'number', required: true }
      ]
    }
  };

  return schemas[tableName];
}

// Parse post content for mentions
function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Check if post mentions the bot trigger
function shouldBotRespond(postContent: string): boolean {
  const mentions = parseMentions(postContent);
  return mentions.includes('free');
}

// Create a chat session for the user
async function createChatSession(postData: any, client: any): Promise<string | null> {
  try {
    if (!tableUIDs.chat) {
      console.error('❌ Chat table UID not available');
      return null;
    }

    const chatData = {
      name: `Ticket - ${Date.now()}`,
      type: 'support',
      status: 'active',
      source: 'twitter',
      sourceId: postData.uid,
      authorId: postData.authorId,
      authorName: postData.authorName,
      content: `${postData.content.substring(0, 100)}`,
      createdAt: Date.now(),
      lastMessage: 'Chat session created',
      lastMessageTime: Date.now()
    };

    const chatResult = await client.ref.from(tableUIDs.chat).create({
      data: chatData
    });

    if (chatResult.data?.uid) {
      console.log('✅ Chat session created:', chatResult.data.uid);
      return chatResult.data.uid;
    }

    return null;
  } catch (error) {
    console.error('❌ Error creating chat session:', error);
    return null;
  }
}

// Create bot comment with invite link
async function createBotComment(postId: string, chatId: string, postData: any, client: any): Promise<boolean> {
  try {
    if (!tableUIDs.comments) {
      console.error('❌ Comments table UID not available');
      return false;
    }

    const inviteLink = `${BOT_CONFIG.FRONTEND_HOST}/chat/${chatId}`;
    const commentContent = `@${postData.authorUsername} 🎉 You've been invited to a free support chat! Click here to join: ${inviteLink}`;

    const commentData = {
      content: commentContent,
      postId: postId,
      authorId: BOT_CONFIG.BOT_NAME,
      authorName: 'Dallosh Bot',
      authorUsername: BOT_CONFIG.BOT_NAME,
      createdAt: Date.now()
    };

    const commentResult = await client.ref.from(tableUIDs.comments).create({
      data: commentData
    });

    if (commentResult.data?.uid) {
      console.log('✅ Bot comment created:', commentResult.data.uid);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error creating bot comment:', error);
    return false;
  }
}

// Handle post creation event
async function handlePostCreated(postData: any, client: any) {
  try {
    console.log('📝 New post detected:', postData.uid);
    console.log('📋 Post content:', postData.data.content);
    console.log('👤 Author:', postData.data.authorName);

    // Check if bot should respond
    if (!shouldBotRespond(postData.data.content)) {
      console.log('⏭️ Post does not mention @free, skipping...');
      return;
    }

    console.log('🎯 Bot trigger detected! Creating chat session...');

    // Create chat session
    const chatId = await createChatSession(postData.data, client);
    if (!chatId) {
      console.error('❌ Failed to create chat session');
      return;
    }

    // Create bot comment with invite
    const commentCreated = await createBotComment(postData.uid, chatId, postData.data, client);
    if (commentCreated) {
      console.log('✅ Bot response completed successfully');
    } else {
      console.error('❌ Failed to create bot comment');
    }

  } catch (error) {
    console.error('❌ Error handling post creation:', error);
  }
}

// Main ref listener function
export const refFunctions = async (client: any) => {
  try {
    // Initialize bot first
    await initializeBot();
    
    if (!botInitialized) {
      console.error('❌ Bot not initialized, cannot set up listeners');
      return;
    }

    // Set up event listeners
    setupEventListeners(client);

  } catch (error) {
    console.error('❌ Error setting up ref listeners:', error);
  }
};

// Re-setup bot after reconnection
export async function reinitializeBot(client: any): Promise<boolean> {
  try {
    console.log('🔄 Reinitializing bot after reconnection...');
    
    // Reset bot state
    botInitialized = false;
    cleanupEventListeners();
    
    // Re-initialize
    await initializeBot();
    
    if (botInitialized) {
      // Re-setup event listeners
      const success = setupEventListeners(client);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Bot reinitialization failed:', error);
    return false;
  }
}

// Check if bot is currently listening
export function isBotListening(): boolean {
  return isListening && botInitialized;
}

// Export for testing
export { initializeBot, handlePostCreated, shouldBotRespond, parseMentions };
