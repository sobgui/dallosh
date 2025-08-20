'use client';

import { getSodularClient, databaseID, dalloshAIBaseUrl } from "@/services/client";

// Import Pipecat SDK (like in reference implementation)
import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'; 


// System instructions for AI (from reference implementation)
const VOICE_IDS = {
  "en_us": {
    "language": "English",
  },
  "fr_fr": {
    "language": "French",
  }
};

const current_language = "fr_fr";
//const languages_list = Object.values(VOICE_IDS).map(voice => `- Language Code: ${voice}, Language: ${voice.language}`).join('\n');

const DEFAULT_SYSTEM_INSTRUCTIONS = `
You are a helpful AI assistant working for a telecom network company named 'Free Mobile'. 
You are a customer service agent. 
You are responsible for answering questions and helping customers with their issues.


The language response for you must absolutely speak fluently with the user is:
- ${VOICE_IDS[current_language]['language']}


IMPORTANT RULES:
1. Keep responses concise and natural for voice realtime conversation with a customer.
2. Be helpful, friendly, and engaging. Also put some comma (,) to make pauses to make it sound more natural for the voice.
3. Avoid long responses, keep it short for voice realtime conversation and to the point, avoid using emojis, avoid using markdown or bullet point or numbered list, avoid using special characters, avoid using html tags, avoid using bold, italic, underline, etc.

NOTE: During your exchange with the user, sometimes the user could tell you that he needs to make a request or want to discuss with the real agent to intervene, 
you respond by asking what kind of issue the user wants the agent to intervene if his previous message did not mention it, then you should call the function 'send_user_request' to create a new request in the database to notify the agent.
You will do it once, you must not duplicate the request if the user ask you to do it again or if it does exist already.
`;

// Types from the reference app
export interface ChatSession {
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
  };
}

export interface ChatMessage {
  uid: string;
  data: {
    chatId: string;
    content: string;
    senderId: string;
    senderName: string;
    senderType: 'user' | 'assistant';
    createdAt: number;
    isRead: boolean;
    isEdited?: boolean;
    editedAt?: number;
    agentId?: string; // Track if message is from agent
  };
}

export interface Request {
  uid: string;
  data: {
    chatId: string;
    name: string;
    description: string;
    userId: string;
    userName: string;
    createdAt: number;
    label: 'urgent' | 'normal' | 'low';
    status: 'ongoing' | 'processed' | 'done' | 'fail' | 'cancelled';
    technicianId?: string;
    technicianName?: string;
    technicianNote?: string;
    processedAt?: number;
  };
}

export interface TableUIDs {
  chat?: string;
  messages?: string;
  requests?: string;
}

// Bot configuration interface
interface BotConfig {
  system_instructions: string;
  fields: Record<string, string>;
}

// Chat Manager - handles sessions and messages with Sodular
export class ChatManager {
  private currentSessionId: string | null = null;
  private tableUIDs: TableUIDs = {};
  private onSessionChangeCallback?: (sessionId: string | null) => void;
  private onMessagesUpdateCallback?: (messages: ChatMessage[]) => void;

  constructor() {
    // Initialize with empty state
  }

  // Initialize table UIDs
  async initializeTableUIDs(): Promise<TableUIDs> {
    try {
      const client = await getSodularClient();
      if (!client) throw new Error('No Sodular client available');

      const tableNames = ['chat', 'messages'];
      const uids: any = {};

      for (const tableName of tableNames) {
        try {
          console.log(`🔍 Looking for ${tableName} table...`);
          const table = await client.tables.get({ filter: { 'data.name': tableName } });
          
          if (table.data?.uid) {
            console.log(`✅ Found ${tableName} table with UID:`, table.data.uid);
            uids[tableName] = table.data.uid;
          } else {
            // Double-check with query to avoid false negatives
            console.log(`🔍 No ${tableName} table found with get(), checking with query...`);
            const allTables = await client.tables.query({ take: 100 });
            const existingTable = allTables.data?.list?.find(t => t.data?.name === tableName);
            
            if (existingTable) {
              console.log(`✅ Found ${tableName} table with query, UID:`, existingTable.uid);
              uids[tableName] = existingTable.uid;
            } else if (tableName === 'messages') {
              // Create messages table if it doesn't exist
              console.log(`📋 Creating ${tableName} table...`);
              const messagesUID = await this.createMessagesTable(client);
              if (messagesUID) {
                uids[tableName] = messagesUID;
              }
            }
            // Note: requests table is handled by RequestManager class
          }
        } catch (error) {
          console.error(`Error getting ${tableName} table:`, error);
          if (tableName === 'messages') {
            console.log(`📋 Creating ${tableName} table due to error...`);
            const messagesUID = await this.createMessagesTable(client);
            if (messagesUID) {
              uids[tableName] = messagesUID;
            }
          }
          // Note: requests table is handled by RequestManager class
        }
      }

      this.tableUIDs = uids;
      return uids;
    } catch (error) {
      console.error('Error initializing table UIDs:', error);
      return {};
    }
  }

  private async createMessagesTable(client: any): Promise<string | null> {
    try {
      const messagesTableSchema = {
        name: 'messages',
        description: 'Chat messages',
        fields: [
          { name: 'chatId', type: 'text', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'senderId', type: 'text', required: true },
          { name: 'senderName', type: 'text', required: true },
          { name: 'senderType', type: 'text', required: true }, // 'user' or 'assistant'
          { name: 'createdAt', type: 'number', required: true },
          { name: 'isRead', type: 'boolean', defaultValue: false },
          { name: 'isEdited', type: 'boolean', defaultValue: false },
          { name: 'editedAt', type: 'number' },
        ],
      };

      const result = await client.tables.create({ data: messagesTableSchema });
      return result.data?.uid || null;
    } catch (error) {
      console.error('Error creating messages table:', error);
      return null;
    }
  }

  // Set current session
  setCurrentSession(sessionId: string | null) {
    this.currentSessionId = sessionId;
    if (this.onSessionChangeCallback) {
      this.onSessionChangeCallback(sessionId);
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Fetch session by ID
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.chat) return null;

      const sessionResult = await client.ref.from(this.tableUIDs.chat).query({
        filter: { uid: sessionId },
        take: 1
      });

      return sessionResult.data?.list?.[0] || null;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  // Fetch all sessions for a user
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      console.log('🔍 getUserSessions called with userId:', userId);
      console.log('📋 Current tableUIDs:', this.tableUIDs);
      
      const client = await getSodularClient();
      if (!client) {
        console.error('❌ No Sodular client available');
        return [];
      }
      
      if (!this.tableUIDs.chat) {
        console.error('❌ Chat table UID not available. TableUIDs:', this.tableUIDs);
        return [];
      }

      console.log('🔍 Querying chat table:', this.tableUIDs.chat);
      const sessionsResult = await client.ref.from(this.tableUIDs.chat).query({
        take: 100,
      });

      console.log('📊 Raw sessions result:', sessionsResult);
      console.log('📋 Sessions data:', sessionsResult.data);
      console.log('📋 Sessions list:', sessionsResult.data?.list);

      if (sessionsResult.data?.list) {
        // Filter sessions where user is the author or has access
        const userSessions = sessionsResult.data.list.filter(session => {
          console.log('🔍 Session data:', session.data);
          // User can see sessions they created
          if (session.data.authorId === userId) {
            return true;
          }
          // User can also see sessions where they are mentioned or invited
          // For now, show all sessions to debug the issue
          return true;
        });
        
        console.log('👤 Filtered user sessions:', userSessions);
        
        // Sort by last message time or creation time
        const sortedSessions = userSessions.sort((a, b) => 
          (b.data.lastMessageTime || b.data.createdAt) - (a.data.lastMessageTime || a.data.createdAt)
        );
        
        console.log('📊 Final sorted sessions:', sortedSessions);
        return sortedSessions;
      }

      return [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  // Fetch messages for a session
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.messages) return [];

      const messagesResult = await client.ref.from(this.tableUIDs.messages).query({
        filter: { 'data.chatId': sessionId },
        take: 100
      });

      if (messagesResult.data?.list) {
        const sortedMessages = messagesResult.data.list.sort((a: any, b: any) => 
          (a.data.createdAt || 0) - (b.data.createdAt || 0)
        );
        return sortedMessages;
      }

      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Add a new message
  async addMessage(sessionId: string, content: string, senderType: 'user' | 'assistant', senderData: { id: string; name: string }, agentId?: string): Promise<ChatMessage | null> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.messages) return null;

      const messageData = {
        chatId: sessionId,
        content: content.trim(),
        senderId: senderData.id,
        senderName: senderData.name,
        senderType,
        createdAt: Date.now(),
        isRead: false,
        isEdited: false,
        agentId
      };

      const result = await client.ref.from(this.tableUIDs.messages).create({
        data: messageData
      });

      if (result.data) {
        const newMessage: ChatMessage = {
          uid: result.data.uid,
          data: result.data.data
        };

        console.log('✅ Message added successfully:', {
          uid: newMessage.uid,
          content: newMessage.data.content.substring(0, 100) + '...',
          senderType: newMessage.data.senderType,
          sessionId
        });

        // Update session's last message
        await this.updateSessionLastMessage(sessionId, content);

        // Trigger callback if set
        if (this.onMessagesUpdateCallback) {
          console.log('📡 Triggering onMessagesUpdate callback...');
          const allMessages = await this.getSessionMessages(sessionId);
          console.log('📊 All messages for callback:', allMessages.length, allMessages.map(m => ({
            uid: m.uid,
            content: m.data.content.substring(0, 50) + '...',
            senderType: m.data.senderType
          })));
          this.onMessagesUpdateCallback(allMessages);
          console.log('✅ Callback triggered successfully');
        } else {
          console.log('⚠️ No onMessagesUpdate callback set');
        }

        return newMessage;
      }

      return null;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  // Update last message of session
  private async updateSessionLastMessage(sessionId: string, content: string) {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.chat) return;

      await client.ref.from(this.tableUIDs.chat).patch({ uid: sessionId }, {
        data: {
          lastMessage: content.trim(),
          lastMessageTime: Date.now(),
          status: 'active'
        }
      });
    } catch (error) {
      console.error('Error updating session last message:', error);
    }
  }

  // Edit a message
  async editMessage(messageId: string, newContent: string): Promise<boolean> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.messages) return false;

      await client.ref.from(this.tableUIDs.messages).patch({ uid: messageId }, {
        data: {
          content: newContent.trim(),
          isEdited: true,
          editedAt: Date.now()
        }
      });

      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  // Delete a message
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting message from database:', messageId);
      
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.messages) {
        console.log('❌ No client or messages table available');
        return false;
      }

      console.log('🗑️ Executing delete operation...');
      const deleteResult = await client.ref.from(this.tableUIDs.messages).delete({ uid: messageId });
      console.log('✅ Delete operation completed:', deleteResult);
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      return false;
    }
  }

  // Set up real-time listeners for messages (placeholder for now)
  setupRealtimeListeners(sessionId: string, onMessageUpdate: (messages: ChatMessage[]) => void) {
    // TODO: Implement real-time listeners when Sodular client supports them
    console.log('Real-time listeners not yet implemented');
    return null;
  }

  // Set callbacks
  onSessionChange(callback: (sessionId: string | null) => void) {
    this.onSessionChangeCallback = callback;
  }

  onMessagesUpdate(callback: (messages: ChatMessage[]) => void) {
    this.onMessagesUpdateCallback = callback;
  }

  // Check if agent has joined a session
  async hasAgentJoined(sessionId: string): Promise<boolean> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.chat) return false;

      const sessionResult = await client.ref.from(this.tableUIDs.chat).query({
        filter: { uid: sessionId },
        take: 1
      });

      if (sessionResult.data?.list?.[0]) {
        return !!sessionResult.data.list[0].data.agentId;
      }

      return false;
    } catch (error) {
      console.error('Error checking agent status:', error);
      return false;
    }
  }

  // Send direct text message (user to agent or agent to user)
  async sendDirectTextMessage(sessionId: string, content: string, senderId: string, senderName: string, senderType: 'user' | 'assistant', agentId?: string): Promise<boolean> {
    try {
      console.log('📤 Sending direct text message:', { sessionId, content, senderId, senderName, senderType, agentId });
      
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.messages) {
        console.error('❌ No client or messages table available for direct messaging');
        return false;
      }

      const messageData = {
        chatId: sessionId,
        content: content.trim(),
        senderId,
        senderName,
        senderType,
        createdAt: Date.now(),
        isRead: false,
        agentId, // Include agentId if message is from agent
      };

      console.log('📝 Creating message with data:', messageData);
      const result = await client.ref.from(this.tableUIDs.messages).create({ data: messageData });
      
      if (result.data) {
        console.log('✅ Direct message sent successfully:', result.data);
        
        // Update session's last message info
        await this.updateSessionLastMessage(sessionId, content);
        
        // Trigger messages update callback
        if (this.onMessagesUpdateCallback) {
          const allMessages = await this.getSessionMessages(sessionId);
          this.onMessagesUpdateCallback(allMessages);
        }
        
        return true;
      } else {
        console.error('❌ Failed to send direct message:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending direct message:', error);
      return false;
    }
  }

  // Delete a session and all its messages
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Starting deletion of session:', sessionId);
      
      const client = await getSodularClient();
      if (!client) {
        console.error('❌ No Sodular client available for deletion');
        return false;
      }
      
      if (!this.tableUIDs.chat) {
        console.error('❌ Chat table UID not available for deletion');
        return false;
      }

      // Delete related messages if messages table exists
      if (this.tableUIDs.messages) {
        try {
          console.log('🗑️ Deleting related messages for session:', sessionId);
          const messagesResult = await client.ref.from(this.tableUIDs.messages).query({
            filter: { 'data.chatId': sessionId },
            take: 100,
          });
          const toDelete = messagesResult.data?.list || [];
          console.log(`🗑️ Found ${toDelete.length} messages to delete`);
          
          for (const msg of toDelete) {
            try {
              const deleteResult = await client.ref.from(this.tableUIDs.messages).delete({ uid: msg.uid });
              console.log(`✅ Deleted message ${msg.uid}:`, deleteResult);
            } catch (msgError) {
              console.error(`❌ Failed to delete message ${msg.uid}:`, msgError);
            }
          }
        } catch (err) {
          console.error('❌ Error deleting messages for session:', err);
        }
      }

      // Delete related requests if requests table exists
      if (this.tableUIDs.requests) {
        try {
          console.log('🗑️ Deleting related requests for session:', sessionId);
          const requestsResult = await client.ref.from(this.tableUIDs.requests).query({
            filter: { 'data.chatId': sessionId },
            take: 100,
          });
          const toDelete = requestsResult.data?.list || [];
          console.log(`🗑️ Found ${toDelete.length} requests to delete`);
          
          for (const req of toDelete) {
            try {
              const deleteResult = await client.ref.from(this.tableUIDs.requests).delete({ uid: req.uid });
              console.log(`✅ Deleted request ${req.uid}:`, deleteResult);
            } catch (reqError) {
              console.error(`❌ Failed to delete request ${req.uid}:`, reqError);
            }
          }
        } catch (err) {
          console.error('❌ Error deleting requests for session:', err);
        }
      }

      // Delete session row
      console.log('🗑️ Deleting session from chat table:', sessionId);
      const sessionDeleteResult = await client.ref.from(this.tableUIDs.chat).delete({ uid: sessionId });
      console.log('✅ Session deletion result:', sessionDeleteResult);
      
      // Verify deletion was successful
      if (!sessionDeleteResult.data) {
        console.error('❌ Session deletion failed - no data returned');
        return false;
      }

      // Clear current session if needed
      if (this.currentSessionId === sessionId) {
        console.log('🔄 Clearing current session reference');
        this.setCurrentSession(null);
      }

      console.log('✅ Session deletion completed successfully');

      // Notify listeners (layout) to refresh sidebar
      try {
        if (typeof window !== 'undefined') {
          console.log('📡 Dispatching chat:sessions-updated event...');
          window.dispatchEvent(new CustomEvent('chat:sessions-updated'));
          console.log('✅ Event dispatched successfully');
        } else {
          console.log('⚠️ Window not available, cannot dispatch event');
        }
      } catch (eventError) {
        console.error('❌ Error dispatching event:', eventError);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      return false;
    }
  }
}

// Request Manager - handles technical assistance requests
export class RequestManager {
  private tableUIDs: TableUIDs = {};
  private onRequestsUpdateCallback?: (requests: Request[]) => void;

  constructor() {
    // Initialize with empty state
  }

  // Initialize table UIDs
  async initializeTableUIDs(): Promise<TableUIDs> {
    try {
      const client = await getSodularClient();
      if (!client) throw new Error('No Sodular client available');

      const tableNames = ['chat', 'messages', 'requests'];
      const uids: any = {};

      for (const tableName of tableNames) {
        try {
          const table = await client.tables.get({ filter: { 'data.name': tableName } });
          if (table.data?.uid) {
            uids[tableName] = table.data.uid;
          } else if (tableName === 'requests') {
            // Create requests table if it doesn't exist
            const requestsUID = await this.createRequestsTable(client);
            if (requestsUID) {
              uids[tableName] = requestsUID;
            }
          }
        } catch (error) {
          console.error(`Error getting ${tableName} table:`, error);
          if (tableName === 'requests') {
            const requestsUID = await this.createRequestsTable(client);
            if (requestsUID) {
              uids[tableName] = requestsUID;
            }
          }
        }
      }

      this.tableUIDs = uids;
      return uids;
    } catch (error) {
      console.error('Error initializing table UIDs:', error);
      return {};
    }
  }

  private async createRequestsTable(client: any): Promise<string | null> {
    try {
      const requestsTableSchema = {
        name: 'requests',
        description: 'Technical assistance requests',
        fields: [
          { name: 'chatId', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'userId', type: 'text', required: true },
          { name: 'userName', type: 'text', required: true },
          { name: 'createdAt', type: 'number', required: true },
          { name: 'label', type: 'text', required: true },
          { name: 'status', type: 'text', required: true },
          { name: 'technicianId', type: 'text' },
          { name: 'technicianName', type: 'text' },
          { name: 'technicianNote', type: 'text' },
          { name: 'processedAt', type: 'number' },
        ],
      };

      const result = await client.tables.create({ data: requestsTableSchema });
      return result.data?.uid || null;
    } catch (error) {
      console.error('Error creating requests table:', error);
      return null;
    }
  }

  // Create a new request
  async createRequest(requestData: Omit<Request['data'], 'uid'>): Promise<Request | null> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return null;

      const result = await client.ref.from(this.tableUIDs.requests).create({
        data: requestData
      });

      if (result.data) {
        const newRequest: Request = {
          uid: result.data.uid,
          data: result.data.data
        };

        // Trigger callback if set
        if (this.onRequestsUpdateCallback) {
          const allRequests = await this.getUserRequests(requestData.userId);
          this.onRequestsUpdateCallback(allRequests);
        }

        return newRequest;
      }

      return null;
    } catch (error) {
      console.error('Error creating request:', error);
      return null;
    }
  }

  // Get requests for a specific user
  async getUserRequests(userId: string): Promise<Request[]> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return [];

      const requestsResult = await client.ref.from(this.tableUIDs.requests).query({
        filter: { 'data.userId': userId },
        take: 100
      });

      if (requestsResult.data?.list) {
        const sortedRequests = requestsResult.data.list.sort((a: any, b: any) => 
          (b.data.createdAt || 0) - (a.data.createdAt || 0)
        );
        return sortedRequests;
      }

      return [];
    } catch (error) {
      console.error('Error fetching user requests:', error);
      return [];
    }
  }

  // Get requests for a specific chat session
  async getChatRequests(chatId: string): Promise<Request[]> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return [];

      const requestsResult = await client.ref.from(this.tableUIDs.requests).query({
        filter: { 'data.chatId': chatId },
        take: 100
      });

      if (requestsResult.data?.list) {
        const sortedRequests = requestsResult.data.list.sort((a: any, b: any) => 
          (b.data.createdAt || 0) - (a.data.createdAt || 0)
        );
        return sortedRequests;
      }

      return [];
    } catch (error) {
      console.error('Error fetching chat requests:', error);
      return [];
    }
  }

  // Update request status (for technicians)
  async updateRequestStatus(requestId: string, status: Request['data']['status'], technicianData?: { id: string; name: string; note?: string }): Promise<boolean> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return false;

      const updateData: any = {
        status,
        processedAt: Date.now()
      };

      if (technicianData) {
        updateData.technicianId = technicianData.id;
        updateData.technicianName = technicianData.name;
        if (technicianData.note) {
          updateData.technicianNote = technicianData.note;
        }
      }

      await client.ref.from(this.tableUIDs.requests).patch({ uid: requestId }, {
        data: updateData
      });

      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      return false;
    }
  }

  // Delete a request
  async deleteRequest(requestId: string): Promise<boolean> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return false;

      await client.ref.from(this.tableUIDs.requests).delete({ uid: requestId });
      return true;
    } catch (error) {
      console.error('Error deleting request:', error);
      return false;
    }
  }

  // Delete all requests for a chat session (cascade delete)
  async deleteChatRequests(chatId: string): Promise<boolean> {
    try {
      const client = await getSodularClient();
      if (!client || !this.tableUIDs.requests) return false;

      const requestsResult = await client.ref.from(this.tableUIDs.requests).query({
        filter: { 'data.chatId': chatId },
        take: 100,
      });

      const toDelete = requestsResult.data?.list || [];
      for (const req of toDelete) {
        await client.ref.from(this.tableUIDs.requests).delete({ uid: req.uid });
      }

      return true;
    } catch (error) {
      console.error('Error deleting chat requests:', error);
      return false;
    }
  }

  // Set callbacks
  onRequestsUpdate(callback: (requests: Request[]) => void) {
    this.onRequestsUpdateCallback = callback;
  }
}

// Transcription Manager - handles voice transcription
export class TranscriptionManager {
  private currentTranscription: string = '';
  private isTranscribing: boolean = false;
  private onTranscriptionUpdateCallback?: (text: string, isFinal: boolean) => void;
  private onTypingIndicatorCallback?: (isVisible: boolean) => void;

  updateTranscription(text: string, isFinal: boolean = false) {
    if (isFinal) {
      this.currentTranscription = '';
      this.isTranscribing = false;
    } else {
      this.currentTranscription = text;
      this.isTranscribing = true;
    }

    if (this.onTranscriptionUpdateCallback) {
      this.onTranscriptionUpdateCallback(text, isFinal);
    }
  }

  clearTranscription() {
    this.currentTranscription = '';
    this.isTranscribing = false;
    if (this.onTranscriptionUpdateCallback) {
      this.onTranscriptionUpdateCallback('', true);
    }
  }

  showTypingIndicator() {
    if (this.onTypingIndicatorCallback) {
      this.onTypingIndicatorCallback(true);
    }
  }

  hideTypingIndicator() {
    if (this.onTypingIndicatorCallback) {
      this.onTypingIndicatorCallback(false);
    }
  }

  getCurrentTranscription(): string {
    return this.currentTranscription;
  }

  isCurrentlyTranscribing(): boolean {
    return this.isTranscribing;
  }

  // Set callbacks
  onTranscriptionUpdate(callback: (text: string, isFinal: boolean) => void) {
    this.onTranscriptionUpdateCallback = callback;
  }

  onTypingIndicator(callback: (isVisible: boolean) => void) {
    this.onTypingIndicatorCallback = callback;
  }
}

// WebRTC Voice Manager - handles Pipecat integration
export class VoiceManager {
  private pcClient: any = null;
  private connected: boolean = false;
  private connecting: boolean = false;
  private voiceInputEnabled: boolean = false;
  private voiceInputEnabledBeforeConnect: boolean = false;
  private audioOutputEnabled: boolean = false; // Start muted by default
  private audioOutputEnabledBeforeConnect: boolean = false;
  private currentAssistantMessage: any = null;
  private currentAssistantMessageUid: string | null = null;
  private currentAssistantMessageContent: string = '';
  private currentUserTranscript: any = null;
  private currentSessionId: string | null = null;
  private currentUserInfo: { id: string; name: string } | null = null;
  // Removed blocking save flag - using queue system now
  private lastProcessedMessageId: string | null = null; // Track last processed message to prevent duplicates

  // Callbacks
  private onConnectionStateCallback?: (connected: boolean) => void;
  private onVoiceStateCallback?: (voiceEnabled: boolean, audioEnabled: boolean) => void;
  private onUserTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private onBotTranscriptCallback?: (text: string) => void;
  private onBotSpeakingCallback?: (isSpeaking: boolean) => void;
  private onBotReadyCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor(
    private chatManager: ChatManager,
    private transcriptionManager: TranscriptionManager
  ) {}
  
  // Set current session ID for the onServerMessage callback
  setCurrentSessionId(sessionId: string | null) {
    this.currentSessionId = sessionId;
    console.log('🎯 VoiceManager: Current session ID set to:', this.currentSessionId);
  }
  


  // Generate a unique message ID that can handle non-Latin1 characters
  private generateMessageId(content: string): string {
    try {
      // Try to use btoa if content is Latin1 compatible
      if (/^[\x00-\xFF]*$/.test(content)) {
        return btoa(content).slice(0, 16);
      } else {
        // For non-Latin1 characters, use a hash-based approach
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          const char = content.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36).slice(0, 16);
      }
    } catch (error) {
      // Fallback to timestamp-based ID if all else fails
      console.warn('⚠️ Error generating message ID, using fallback:', error);
      return Date.now().toString(36).slice(0, 16);
    }
  }

  // WebRTC support check (EXACT from reference)
  checkWebRTCSupport(): boolean {
    const support = {
      RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
      mediaDevices: typeof navigator.mediaDevices !== 'undefined',
      getUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
      isSecureContext: window.isSecureContext,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    };

    console.log('WebRTC support:', support);

    if (!support.RTCPeerConnection) {
      alert('WebRTC is not supported in this browser');
      return false;
    }

    if (!support.mediaDevices || !support.getUserMedia) {
      alert('Media devices are not supported in this browser');
      return false;
    }

    if (!support.isSecureContext && !support.isLocalhost) {
      alert('Not in secure context - WebRTC requires HTTPS or localhost');
      return false;
    }

    return true;
  }

  // Initialize Pipecat client (following official Pipecat examples)
  async initializePipecatClient(serverBaseUrl: string = 'http://localhost:7860') {
    if (!this.checkWebRTCSupport()) {
      throw new Error('WebRTC is not supported in this environment');
    }

    try {
      const transport = new SmallWebRTCTransport({
        // Optional configuration for the transport
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          
        ],
      });

      console.log('🎤 Creating PipecatClient with enableMic: false (disabled by default)');
      
      // Store reference to this for callbacks to preserve context
      const self = this;
      
      const client = new PipecatClient({
        transport: transport,
        enableMic: false, // Start with mic DISABLED by default
        enableCam: false,
        callbacks: {
          // Connection state changes
          onConnected: () => {
            console.log('✅ Pipecat client connected');
            self.connected = true;
            
            // Apply saved audio output settings
            if (self.audioOutputEnabledBeforeConnect !== undefined) {
              self.audioOutputEnabled = self.audioOutputEnabledBeforeConnect;
              console.log('🔊 Restored audio output state:', self.audioOutputEnabled);
            }
            
            // Apply saved voice input settings
            if (self.voiceInputEnabledBeforeConnect !== undefined) {
              self.voiceInputEnabled = self.voiceInputEnabledBeforeConnect;
              console.log('🎤 Restored voice input state:', self.voiceInputEnabled);
            }
            
            // Notify UI of connection state change
            if (self.onConnectionStateCallback) {
              self.onConnectionStateCallback(true);
            }
            
            // Notify UI of voice state
            if (self.onVoiceStateCallback) {
              self.onVoiceStateCallback(self.voiceInputEnabled, self.audioOutputEnabled);
            }
            
            // Notify that bot is ready
            if (self.onBotReadyCallback) {
              self.onBotReadyCallback();
            }
            
                      // Wait for data channel to be fully ready before allowing messages
          console.log('⏳ Waiting for data channel to be fully ready...');
          
          // Function to check if data channel is truly ready
          const checkDataChannelReady = async () => {
            try {
              if (self.connected && self.pcClient) {
                console.log('🔄 Syncing restored voice input state with Pipecat...');
                await self.syncVoiceInputState();
                
                // Test the data channel with a simple message
                try {
                  await self.pcClient.sendClientMessage('ping', { test: true });
                  console.log('✅ Data channel test successful - connection is ready');
                  // Don't set dataChannelReady flag - we'll test it directly when needed
                } catch (testError) {
                  console.log('⏳ Data channel test failed, will retry...');
                  // Schedule another check
                  setTimeout(checkDataChannelReady, 1000);
                }
              }
            } catch (error) {
              console.error('❌ Failed to sync restored voice input state:', error);
              // Schedule another check
              setTimeout(checkDataChannelReady, 1000);
            }
          };
          
          // Initial check after 2 seconds
          setTimeout(checkDataChannelReady, 2000);
          

          },
          onDisconnected: () => {
            console.log('❌ Pipecat client disconnected');
            self.connected = false;
            self.dataChannelReady = false; // Reset data channel readiness
            if (self.onConnectionStateCallback) {
              self.onConnectionStateCallback(false);
            }
          },
          
          // Transport state changes
          onTransportStateChanged: (state) => {
            console.log('Transport state changed:', state);
          },
          
          // Bot events
          onBotConnected: (participant) => {
            console.log('Bot connected:', participant);
          },
          onBotDisconnected: (participant) => {
            console.log('Bot disconnected:', participant);
          },
          onBotReady: (data) => {
            console.log('Bot ready:', data);
            if (self.onBotReadyCallback) {
              self.onBotReadyCallback();
            }
          },
          
          // Transcript events (following official Pipecat examples)
          onUserTranscript: async (data) => {
            console.log('🎤 USER TRANSCRIPT RECEIVED:', data);
            console.log('🎤 Voice input enabled:', self.voiceInputEnabled);
            
            // ONLY process voice input if voice input is actually enabled
            if (!self.voiceInputEnabled) {
              console.log('🎤 Voice input is disabled, ignoring transcript');
              return;
            }
            
            if (data.final) {
              // Final transcript - accumulate all chunks and save
              const finalText = self.accumulateUserTranscriptChunks(data.text || '');
              const cleanText = self.cleanTranscriptText(finalText);
              
              console.log('🎤 Processing final transcript:', {
                originalText: data.text,
                accumulatedText: finalText,
                cleanedText: cleanText,
                lastSaved: self.lastSavedUserTranscript,
                isDuplicate: cleanText === self.lastSavedUserTranscript
              });
              
              if (cleanText && cleanText !== self.lastSavedUserTranscript) {
                self.currentUserTranscript = cleanText;
                self.lastSavedUserTranscript = cleanText;
                console.log('🎤 Final user transcript (accumulated):', cleanText);
                
                // Queue user voice message save to database (non-blocking)
                if (self.currentSessionId && self.chatManager) {
                  console.log('📦 Queuing user voice message for database save:', cleanText);
                  
                  self.queueDatabaseOperation(async () => {
                    console.log('💾 Saving user voice message to database (QUEUED):', cleanText);
                    
                    try {
                      const userMessage = await self.chatManager.addMessage(
                        self.currentSessionId!,
                        cleanText,
                        'user',
                        { id: 'user', name: 'user' }
                      );
                      
                      if (userMessage) {
                        console.log('✅ User voice message saved to database (QUEUED):', userMessage);
                      } else {
                        console.error('❌ Failed to save user voice message to database');
                      }
                    } catch (error) {
                      console.error('❌ Error saving user voice message to database:', error);
                    }
                  });
                } else {
                  console.warn('⚠️ Cannot queue user voice message - missing session ID or chat manager');
                }
                
                // Clear accumulated chunks after queuing save
                self.clearUserTranscriptChunks();
                
                if (self.onUserTranscriptCallback) self.onUserTranscriptCallback(cleanText, true);
              } else {
                console.log('🎤 Skipping duplicate user transcript:', cleanText);
                // Still clear chunks to prevent memory buildup
                self.clearUserTranscriptChunks();
              }
            } else if (data.text) {
              // Non-final transcript - accumulate chunks
              self.accumulateUserTranscriptChunks(data.text);
              if (self.onUserTranscriptCallback) self.onUserTranscriptCallback(data.text, false);
              if (self.transcriptionManager) self.transcriptionManager.updateTranscription(data.text);
            }
          },
          onUserStartedSpeaking: () => {
            console.log('🎤 USER STARTED SPEAKING');
            // Reset transcript accumulation for new speech
            self.clearUserTranscriptChunks();
            // Reset duplicate prevention for new speech
            self.lastSavedUserTranscript = null;
            if (self.transcriptionManager) self.transcriptionManager.updateTranscription('Listening...', true);
          },
          onUserStoppedSpeaking: () => {
            console.log('🎤 USER STOPPED SPEAKING');
            if (self.transcriptionManager) self.transcriptionManager.updateTranscription('', false);
          },
          
          // (duplicate removed) user speaking callbacks retained above
          onBotTranscript: (data) => {
            console.log('🤖 Pipecat onBotTranscript called with:', data);
            console.log('🤖 Data type:', typeof data);
            console.log('🤖 Data keys:', data ? Object.keys(data) : 'null/undefined');
            console.log('🤖 Data.text:', data?.text);
            console.log('🤖 Data.text type:', typeof data?.text);
            
            const text = (data?.text || '').replace(/\s+/g, ' ').trim();
            if (!text) {
              console.log('⚠️ Bot transcript text is empty');
              console.log('⚠️ Raw data.text:', data?.text);
              console.log('⚠️ Processed text:', text);
              return;
            }
            console.log('📝 Bot transcript text:', text);
            
            // Accumulate bot transcript chunks for final save
            self.accumulateBotTranscriptChunks(text);
            
            // Still call the existing callback for UI updates
            if (self.onBotTranscriptCallback) {
              console.log('📞 Calling onBotTranscriptCallback...');
              self.onBotTranscriptCallback(text);
            } else {
              console.log('❌ No onBotTranscriptCallback set');
            }
          },
          onBotLlmStarted: () => {
            console.log('Bot LLM started');
            // Clear bot transcript chunks for new conversation
            self.clearBotTranscriptChunks();
            // Reset user transcript duplicate prevention for new conversation  
            self.lastSavedUserTranscript = null;
            
            if (self.onBotSpeakingCallback) {
              self.onBotSpeakingCallback(true);
            }
          },
          onBotLlmStopped: () => {
            console.log('Bot LLM stopped');
            
            // FALLBACK: If bot stops LLM but we have accumulated transcripts, save them
            // This handles cases where onBotStoppedSpeaking might not fire
            if (self.botTranscriptChunks.length > 0) {
              console.log('🤖 FALLBACK: LLM stopped with accumulated transcripts, scheduling save');
              
              // Use a timeout to allow onBotStoppedSpeaking to fire first
              setTimeout(() => {
                if (self.botTranscriptChunks.length > 0) {
                  console.log('🤖 FALLBACK: Saving accumulated transcripts from LLM stopped event');
                  const finalBotText = self.botTranscriptChunks.join(' ');
                  const cleanBotText = self.cleanTranscriptText(finalBotText);
                  
                  if (cleanBotText && self.currentSessionId && self.chatManager) {
                    console.log('💾 FALLBACK: Saving bot message from LLM stopped:', cleanBotText);
                    self.saveBotMessage(cleanBotText);
                    // Transcript chunks will be cleared after successful save in saveBotMessage
                  }
                }
              }, 500); // Give onBotStoppedSpeaking time to fire first
            }
            
            if (self.onBotSpeakingCallback) {
              self.onBotSpeakingCallback(false);
            }
          },
          
          // Audio events
          onBotStartedSpeaking: () => {
            console.log('Bot started speaking');
            // Don't clear transcript chunks here - let them accumulate until bot stops speaking
            // Only clear when we actually save the message
            if (self.onBotSpeakingCallback) {
              self.onBotSpeakingCallback(true);
            }
          },
          onBotStoppedSpeaking: () => {
            console.log('Bot stopped speaking - PIPECAT EVENT');
            console.log('🤖 Bot transcript chunks at stop speaking:', self.botTranscriptChunks);
            console.log('🤖 Bot transcript chunks length:', self.botTranscriptChunks.length);
            
            // When bot stops speaking, save the accumulated bot transcript
            if (self.botTranscriptChunks.length > 0) {
              const finalBotText = self.botTranscriptChunks.join(' ');
              const cleanBotText = self.cleanTranscriptText(finalBotText);
              console.log('🤖 Finalizing bot transcript from PIPECAT EVENT:', cleanBotText);
              
              // Save the complete bot message now that speaking is done
              if (cleanBotText && self.currentSessionId && self.chatManager) {
                console.log('💾 Saving bot message from PIPECAT EVENT:', cleanBotText);
                self.saveBotMessage(cleanBotText);
              } else {
                console.log('⚠️ Cannot save bot message - missing data:', {
                  hasCleanText: !!cleanBotText,
                  hasSessionId: !!self.currentSessionId,
                  hasChatManager: !!self.chatManager
                });
              }
              
              // Transcript chunks will be cleared after successful save in saveBotMessage
            } else {
              console.log('⚠️ No bot transcript chunks to save in PIPECAT EVENT');
            }
            
            if (self.onBotSpeakingCallback) {
              self.onBotSpeakingCallback(false);
            }
          },
          
                     // Track events for audio setup (following official Pipecat examples)
          onTrackStarted: (track, participant) => {
            console.log('🎵 Track started:', track?.kind, participant);
            if (track && track.kind === 'audio') {
              if (participant?.local) {
                console.log('🎤 LOCAL audio track started (user microphone)');
                 // Store reference to local audio track for microphone control
                 self.localAudioTrack = track;
                 console.log('🎤 Local audio track stored for microphone control');
              } else {
                console.log('🔊 REMOTE audio track started (bot audio)');
                 
                 // Get or create audio element
                 let audioEl = self.currentAudioElement || document.getElementById('audio-el') as HTMLAudioElement;
                 
                 if (!audioEl) {
                   console.log('🔊 Creating audio element for bot audio...');
                   audioEl = document.createElement('audio');
                   audioEl.id = 'audio-el';
                   audioEl.autoplay = true;
                   audioEl.controls = false;
                   audioEl.style.display = 'none';
                   document.body.appendChild(audioEl);
                   console.log('✅ Audio element created and added to DOM');
                 }
                 
                if (audioEl) {
                   console.log('🔊 Setting up bot audio track...');
                  audioEl.srcObject = new MediaStream([track]);
                  
                  // IMPORTANT: Always start muted and only unmute if explicitly enabled
                   if (self.audioOutputEnabled) {
                    audioEl.volume = 1.0;
                    audioEl.muted = false;
                    console.log('🔊 Audio track started with volume 1.0 (unmuted)');
                  } else {
                    audioEl.volume = 0.0;
                    audioEl.muted = true;
                    console.log('🔇 Audio track started with volume 0.0 (muted)');
                  }
                  
                  // Always play to maintain flow, but volume/muted controls the sound
                  audioEl.play().catch(error => {
                    console.error('Audio playback failed:', error);
                  });
                  
                  console.log('🔊 Audio track started with volume:', audioEl.volume, 'muted:', audioEl.muted);
                   
                   // Store reference to audio element for later use
                   self.currentAudioElement = audioEl;
                 } else {
                   console.error('❌ Failed to create audio element');
                }
              }
            }
          },
          
                     // Server message handling
           onServerMessage: (message) => {
             console.log('📨 Server message received:', message);
             
             // Handle image input response from server
             if (message.type === 'image_input_response') {
               console.log('🖼️ Image input response from server:', message.data);
               console.log('💾 Saving user message to database from server response');
               
               // Debug: Log the current context
               console.log('🔍 Debug context:', {
                 hasSelf: !!self,
                 currentSessionId: self?.currentSessionId,
                 hasChatManager: !!self?.chatManager,
                 selfType: typeof self,
                 selfKeys: self ? Object.keys(self) : 'no self'
               });
               
               // Save the user message to database when server confirms receipt
               if (self?.currentSessionId && self?.chatManager) {
                 const messageData = message.data;
                 console.log('💾 Proceeding with database save...');
                 
                 self.queueDatabaseOperation(async () => {
                   try {
                     const userMessage = await self.chatManager.addMessage(
                       self.currentSessionId!,
                       messageData.content,
                       'user',
                       { id: 'user', name: 'User' }
                     );
                     
                     if (userMessage) {
                       console.log('✅ User message saved to database from server response:', userMessage);
                       
                       // Note: UI update will be triggered automatically by ChatManager.addMessage
                       console.log('🔄 User message saved, UI update should be automatic via ChatManager callback');
                     } else {
                       console.error('❌ Failed to save user message from server response');
                     }
                   } catch (error) {
                     console.error('❌ Error saving user message from server response:', error);
                   }
                 });
               } else {
                 console.warn('⚠️ Cannot save user message - missing session ID or chat manager');
                 console.warn('🔍 Current state:', {
                   currentSessionId: self?.currentSessionId,
                   hasChatManager: !!self?.chatManager,
                   chatManagerType: typeof self?.chatManager
                 });
              }
            }
          },
          
          // Error handling
          onError: (error) => {
            console.error('Pipecat client error:', error);
             if (self.onErrorCallback) {
              const errorMessage = typeof error === 'string' ? error : 
                                 (error && typeof error === 'object' && 'message' in error) ? 
                                 (error as any).message : 'Unknown error';
               self.onErrorCallback(errorMessage);
            }
          }
        }
      });

      // IMPORTANT: Assign the client to this.pcClient immediately after creation
      // This ensures the callbacks can access it properly
      this.pcClient = client;
      console.log('✅ Pipecat client assigned to this.pcClient');

      return client;
    } catch (error) {
      console.error('Failed to initialize Pipecat client:', error);
      throw error;
    }
  }

  // Connect to voice chat (EXACT copy from reference implementation)
  async connect(sessionId: string, serverBaseUrl: string = dalloshAIBaseUrl, user?: any) {
    try {
      const client = await getSodularClient();
      if(!client) {
        throw new Error('Failed to get Sodular client');
      }

            // If no user provided, fetch current user from auth
      let currentUser = user;
      if (!currentUser || !currentUser.uid) {
        try {
          console.log('🔍 No user provided, fetching current user from auth...');
          
          // Extract user ID from the access token to use in filter
          let userId = 'unknown';
          if (client.accessToken) {
            try {
              const tokenPayload = JSON.parse(atob(client.accessToken.split('.')[1]));
              userId = tokenPayload.uid || tokenPayload.sub || 'unknown';
              console.log('🔍 User ID extracted from token:', userId);
            } catch (tokenError) {
              console.warn('⚠️ Could not extract user ID from token:', tokenError);
            }
          }
          
          // Use the user ID in the filter
          const authResponse = await client.auth.get({ filter: { uid: userId } });
          if (authResponse.data) {
            currentUser = authResponse.data;
            console.log('✅ User fetched from auth:', currentUser.uid);
          } else {
            console.warn('⚠️ Could not fetch user from auth, using fallback');
            return;
          }
        } catch (authError) {
          console.error('❌ Failed to fetch user from auth:', authError);
          return;
        }
      }



      if (this.connected) {
        console.log('Already connected, skipping...');
        return;
      }

      // Ensure we're properly disconnected first
      if (this.pcClient) {
        console.log('Disconnecting existing client...');
        await this.disconnect();
      }

      // Initialize Pipecat client
      this.pcClient = await this.initializePipecatClient(serverBaseUrl);
      if (!this.pcClient) {
        throw new Error('Failed to initialize Pipecat client');
      }

      // Get session messages for context
      const messages = await this.chatManager.getSessionMessages(sessionId);
      
      // Get bot configuration
      const botConfig = await this.getBotConfigs();
      
      // Prepare session data for the server (EXACT format from reference)
      const sessionData = {
        agent_type: 'gemini',
        session_id: sessionId,
        messages: messages.map(msg => ({
          role: msg.data.senderType === 'user' ? 'user' : 'assistant',
          content: msg.data.content
        })),
        bot_settings: botConfig,
        database_id: databaseID,
        token: client.accessToken,
        user: currentUser
      };

      // Encode session data as query parameters (EXACT from reference)
      const queryParams = new URLSearchParams();
      queryParams.append('agent_type', sessionData.agent_type);
      queryParams.append('session_id', sessionData.session_id);
      queryParams.append('messages', JSON.stringify(sessionData.messages));
      queryParams.append('bot_settings', JSON.stringify(sessionData.bot_settings));
      queryParams.append('database_id',sessionData.database_id);
      queryParams.append('user', JSON.stringify(sessionData.user));

      if(sessionData.token) 
      queryParams.append('token', sessionData.token);


      // Connect to the server with session data in URL (EXACT from reference)
      await this.pcClient.connect({
        //connectionUrl: `${serverBaseUrl}/api/offer?${queryParams.toString()}`
        webrtcUrl: `${serverBaseUrl}/api/offer?${queryParams.toString()}`
      });

      console.log('Pipecat connection established');
      this.connected = true;
      
      // Set the current session ID for the onServerMessage callback
      this.setCurrentSessionId(sessionId);
      console.log('✅ Current session ID set:', this.currentSessionId);
      
      // Setup chat integration with current user info
      this.setupChatIntegration(sessionId, {
        id: currentUser.uid,
        name: currentUser.data.fields?.displayName || currentUser.data.username || 'User'
      });
      console.log('✅ Chat integration set up with user:', currentUser.uid);
      
      // Sync voice input state after connection is established
      await this.syncVoiceInputState();
      
      // Also set up a fallback sync after a short delay to ensure everything is properly synchronized
      setTimeout(async () => {
        try {
          if (this.connected && this.pcClient) {
            console.log('🔄 Fallback voice input state sync...');
            await this.syncVoiceInputState();
          }
        } catch (error) {
          console.error('❌ Fallback voice input state sync failed:', error);
        }
      }, 1000);
      
      // Debug: Show audio state before applying
      console.log('🔊 Audio state before applying:', {
        audioOutputEnabled: this.audioOutputEnabled,
        audioOutputEnabledBeforeConnect: this.audioOutputEnabledBeforeConnect
      });
      
             // Ensure audio element exists and apply current audio state
       this.ensureAudioElementExists();
      this.applyAudioState();
      
      if (this.onConnectionStateCallback) this.onConnectionStateCallback(true);

    } catch (error) {
      console.error('Connection failed:', error);
      this.connected = false;
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(false);
      }
      
      // Provide more specific error messages (from reference)
      let errorMessage = 'Connection failed';
      if (error) {
        if (error instanceof Error) {
          if (error.message && error.message.includes('Server error')) {
            errorMessage = 'Server connection failed. Please check if the server is running.';
          } else if (error.message && error.message.includes('getUserMedia')) {
            errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          } else if (error.message && error.message.includes('WebRTC')) {
            errorMessage = 'WebRTC connection failed. Please try again.';
          } else if (error.message && error.message.includes('CORS')) {
            errorMessage = 'Pipecat server not running. Please start the server on port 7860.';
          } else if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Pipecat server not accessible. Please ensure it\'s running on http://localhost:7860';
          } else if (error.message && error.message.includes('already been started')) {
            errorMessage = 'Voice client already active. Please refresh the page.';
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
      }
      
      // Check if it's likely a CORS/server not running issue
      if (errorMessage === 'Connection failed' || errorMessage === 'undefined') {
        errorMessage = 'Pipecat server not running. Please start the server on port 7860.';
      }
      
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
      throw new Error(errorMessage);
    }
  }

  // Disconnect from voice chat
  async disconnect() {
    try {
      console.log('Disconnecting voice chat...');
      
      if (this.pcClient) {
        if (this.connected) {
          await this.pcClient.disconnect();
        }
        this.pcClient = null;
      }
      
      this.connected = false;
      this.currentAssistantMessage = null;
      this.currentUserTranscript = null;
      this.currentSessionId = null;
      this.currentUserInfo = null;
      this.lastProcessedMessageId = null; // Reset message ID tracking on disconnect
      
      // Clear live message states
      this.currentLiveUserMessage = '';
      this.currentLiveBotMessage = '';
      
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(false);
      }
      
      console.log('Voice chat disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      // Force cleanup even if disconnect fails
      this.pcClient = null;
      this.connected = false;
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(false);
      }
    }
  }

  // Send text message through voice system (EXACT from reference)
  async sendTextMessage(text: string, alreadySaved: boolean = false): Promise<void> {
    console.log('📤 VoiceManager.sendTextMessage called with:', text);
    console.log('📊 Current state:', { connected: this.connected, pcClient: !!this.pcClient, alreadySaved });
    
    if (!this.connected) {
      console.error('❌ Cannot send message: not connected to server');
      throw new Error('Not connected to server');
    }

    if (!text.trim()) {
      console.log('⚠️ Empty text, not sending');
      return;
    }

    // Check if agent has joined the session
    if (this.currentSessionId) {
      const hasAgent = await this.chatManager.hasAgentJoined(this.currentSessionId);
      if (hasAgent) {
        console.log('⚠️ Agent has joined the session, bot will not respond');
        // Still save the user message but don't send to Pipecat
        if (!alreadySaved && this.currentUserInfo) {
          try {
            await this.chatManager.addMessage(
              this.currentSessionId,
              text.trim(),
              'user',
              this.currentUserInfo
            );
            console.log('✅ User message saved to database (agent session)');
          } catch (error) {
            console.error('❌ Error saving user message to database:', error);
          }
        }
        return; // Don't send to Pipecat when agent is present
      }
    }

    try {
      console.log('🚀 Sending text message to Pipecat...');

      // Only save to database if not already saved
      if (!alreadySaved && this.currentSessionId && this.currentUserInfo) {
        console.log('💾 Saving user text message to database...');
        try {
          await this.chatManager.addMessage(
            this.currentSessionId,
            text.trim(),
            'user',
            this.currentUserInfo
          );
          console.log('✅ User text message saved to database');
        } catch (error) {
          console.error('❌ Error saving user text message to database:', error);
        }
      } else if (alreadySaved) {
        console.log('📝 Message already saved to database, skipping duplicate save');
      } else {
        console.log('⚠️ No session ID or user info available for saving message');
      }

      // Send message to Pipecat - no timeout needed as Pipecat handles responses automatically
      console.log('📤 Pipecat appendToContext called...');
      await this.pcClient.appendToContext({
        role: 'user',
        content: text.trim(),
        run_immediately: true
      });
      console.log('✅ Text message sent to Pipecat successfully');
    } catch (error) {
      console.error('❌ Failed to send text message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send multimodal message (image/file + text) via WebRTC - SEPARATE METHOD
  async sendClientMessage(type: string, data: any): Promise<void> {
    console.log('🖼️ VoiceManager.sendClientMessage called with:', { type, data });
    
    if (!this.connected) {
      console.error('❌ Cannot send client message: not connected to server');
      throw new Error('Not connected to server');
    }

    if (!this.pcClient) {
      console.error('❌ No Pipecat client available');
      throw new Error('No Pipecat client available');
    }

    try {
      console.log('🚀 Sending client message via WebRTC...');
      
      // Send via custom WebRTC message
      await this.pcClient.sendClientMessage(type, data);
      console.log('✅ Client message sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to send client message:', error);
      throw new Error(`Failed to send client message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send multimodal message with file (image/file + text)
  async sendMultimodalMessage(content: string, file: File): Promise<void> {
    console.log('🖼️ VoiceManager.sendMultimodalMessage called with:', { content, fileName: file.name });
    
    if (!this.connected) {
      console.error('❌ Cannot send multimodal message: not connected to server');
      throw new Error('Not connected to server');
    }

    if (!this.pcClient) {
      console.error('❌ No Pipecat client available');
      throw new Error('No Pipecat client available');
    }

    // Check if agent has joined the session
    if (this.currentSessionId) {
      const hasAgent = await this.chatManager.hasAgentJoined(this.currentSessionId);
      if (hasAgent) {
        console.log('⚠️ Agent has joined the session, bot will not respond to multimodal message');
        // Still save the user message but don't send to Pipecat
        if (this.currentUserInfo) {
          try {
            await this.chatManager.addMessage(
              this.currentSessionId,
              content || `[File: ${file.name}]`,
              'user',
              this.currentUserInfo
            );
            console.log('✅ User multimodal message saved to database (agent session)');
          } catch (error) {
            console.error('❌ Error saving user multimodal message to database:', error);
          }
        }
        return; // Don't send to Pipecat when agent is present
      }
    }
    
        // Wait for connection to be fully stable
    console.log('⏳ Ensuring connection is fully stable...');
    await this.waitForStableConnection();
    
    try {
      console.log('🚀 Sending multimodal message via WebRTC...');
      
      // Convert file to base64
      const base64Content = await this.convertFileToBase64(file);
      const isImage = file.type.startsWith('image/');
      
      const messageData = {
        role: 'user',
        content: content || 'What do you see in this image?',
        file: {
          type: isImage ? 'image_url' : 'file',
          url: isImage ? `data:${file.type};base64,${base64Content}` : null,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          content: isImage ? null : base64Content
        }
      };

      console.log('📤 Sending via sendClientMessage:', messageData);
      console.log('🔍 Pipecat client state:', {
        connected: this.connected,
        hasPcClient: !!this.pcClient,
        pcClientType: typeof this.pcClient,
        sendClientMessageAvailable: typeof this.pcClient.sendClientMessage === 'function'
      });
      
      // Check if sendClientMessage method exists and is callable
      if (typeof this.pcClient.sendClientMessage !== 'function') {
        console.error('❌ sendClientMessage method not available on Pipecat client');
        console.error('❌ Available methods:', Object.getOwnPropertyNames(this.pcClient));
        throw new Error('sendClientMessage method not available');
      }
      
      // Check if the client is actually connected and ready
      console.log('🔍 Checking Pipecat client connection state...');
      if (this.pcClient.connectionState) {
        console.log('🔍 Connection state:', this.pcClient.connectionState);
      }
      if (this.pcClient.readyState) {
        console.log('🔍 Ready state:', this.pcClient.readyState);
      }
      
      // Use the stable connection approach - send message directly
      console.log('🚀 Sending multimodal message via stable connection...');
      
      try {
        await this.pcClient.sendClientMessage('image_input', messageData);
        console.log('✅ Multimodal message sent successfully!');
        return;
      } catch (sendError) {
        console.error('❌ Failed to send message:', sendError);
        throw new Error(`Failed to send multimodal message: ${sendError}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send multimodal message:', error);
      throw new Error(`Failed to send multimodal message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

       // Wait for connection to be fully stable before sending messages
  // Wait for connection to be fully stable before sending messages
  private async waitForStableConnection(): Promise<void> {
    console.log('🔍 Waiting for stable connection...');
    
    // Wait for basic connection
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    
    while (attempts < maxAttempts) {
      if (this.connected && this.pcClient && this.dataChannelReady) {
        console.log('✅ Connection is stable and ready');
        return;
      }
      
      console.log(`⏳ Waiting for stable connection (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.log('⚠️ Connection not fully stable, proceeding anyway...');
  }

  // Ensure voice input state is properly synchronized with Pipecat client
  async syncVoiceInputState() {
    if (!this.connected || !this.pcClient) {
      console.log('🎤 Cannot sync voice state - not connected or no client');
      return;
    }
     
     try {
       console.log('🎤 Syncing voice input state with Pipecat client...');
       console.log('🎤 Current state:', this.voiceInputEnabled);
       console.log('🎤 Pipecat client available:', !!this.pcClient);
       console.log('🎤 enableMic function available:', typeof this.pcClient.enableMic === 'function');
       console.log('🎤 Local audio track available:', !!this.localAudioTrack);
       
       // Apply current state to Pipecat client
       console.log('🎤 Calling pcClient.enableMic with:', this.voiceInputEnabled);
       await this.pcClient.enableMic(this.voiceInputEnabled);
       
       // Also control the local audio track directly for immediate effect
       if (this.localAudioTrack) {
         console.log('🎤 Controlling local audio track directly...');
         this.localAudioTrack.enabled = this.voiceInputEnabled;
         console.log('🎤 Local audio track enabled:', this.localAudioTrack.enabled);
       }
       
       console.log('✅ Voice input state synced with Pipecat client');
       console.log('🎤 Final state:', {
         voiceInputEnabled: this.voiceInputEnabled,
         pipecatMicEnabled: this.voiceInputEnabled,
         localTrackEnabled: this.localAudioTrack?.enabled,
         connected: this.connected,
         hasPcClient: !!this.pcClient
       });
       
       // Verify the sync worked by checking if we can get microphone access
       if (this.voiceInputEnabled) {
         console.log('🎤 Verifying microphone access...');
         try {
           // Check if we can access the microphone
           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
           console.log('✅ Microphone access verified - stream active:', stream.active);
           // Stop the test stream
           stream.getTracks().forEach(track => track.stop());
         } catch (micError) {
           console.error('❌ Microphone access failed:', micError);
           if (this.onErrorCallback) {
             this.onErrorCallback(`Microphone access denied: ${micError instanceof Error ? micError.message : 'Unknown error'}`);
           }
         }
       }
       
       console.log('🔍 Voice input sync verification completed');
       
     } catch (error) {
       console.error('❌ Failed to sync voice input state:', error);
       
       // Notify UI of the error
       if (this.onErrorCallback) {
         this.onErrorCallback(`Failed to sync voice input state: ${error instanceof Error ? error.message : 'Unknown error'}`);
       }
     }
   }

  // User transcript chunk accumulation
  private userTranscriptChunks: string[] = [];
  private userTranscriptStartTime: number | null = null;
  private lastSavedUserTranscript: string | null = null; // Prevent duplicate saves
  
  // Bot transcript chunk accumulation
  private botTranscriptChunks: string[] = [];
  private botTranscriptStartTime: number | null = null;
  
     // Audio element reference
   private currentAudioElement: HTMLAudioElement | null = null;
   // Local audio track for microphone control
   private localAudioTrack: MediaStreamTrack | null = null;
   // Data channel readiness flag
   private dataChannelReady: boolean = false;

  // Accumulate user transcript chunks
  private accumulateUserTranscriptChunks(text: string): string {
    if (!this.userTranscriptStartTime) {
      this.userTranscriptStartTime = Date.now();
      this.userTranscriptChunks = [];
    }
    
    // Add new chunk
    this.userTranscriptChunks.push(text);
    console.log('🎤 Accumulated transcript chunk:', text);
    console.log('🎤 Total chunks so far:', this.userTranscriptChunks.length);
    
    // Join all chunks and return
    return this.userTranscriptChunks.join(' ');
  }

  // Clear accumulated user transcript chunks
  private clearUserTranscriptChunks(): void {
    this.userTranscriptChunks = [];
    this.userTranscriptStartTime = null;
    console.log('🎤 Cleared accumulated transcript chunks');
  }

  // Clean transcript text (remove duplicates, normalize spacing)
  private cleanTranscriptText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\b(\w+(?:\s+\w+)*)\s+\1\b/g, '$1') // Remove word-level duplicates
      .replace(/(.+?)\1+/g, '$1') // Remove phrase-level duplicates
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Accumulate bot transcript chunks
  private accumulateBotTranscriptChunks(text: string): string {
    if (!this.botTranscriptStartTime) {
      this.botTranscriptStartTime = Date.now();
      this.botTranscriptChunks = [];
      console.log('🤖 Started new bot transcript accumulation at:', new Date(this.botTranscriptStartTime).toISOString());
    }
    
    // Add new chunk
    this.botTranscriptChunks.push(text);
    console.log('🤖 Accumulated bot transcript chunk:', text);
    console.log('🤖 Total bot chunks so far:', this.botTranscriptChunks.length);
    console.log('🤖 All accumulated chunks:', this.botTranscriptChunks);
    
    // Join all chunks and return
    return this.botTranscriptChunks.join(' ');
  }

  // Clear accumulated bot transcript chunks
  private clearBotTranscriptChunks(): void {
    this.botTranscriptChunks = [];
    this.botTranscriptStartTime = null;
    console.log('🤖 Cleared accumulated bot transcript chunks');
  }

  // Queue bot message save to database (non-blocking)
  private saveBotMessage(content: string): void {
    if (!content || !this.currentSessionId || !this.chatManager) {
      console.log('⚠️ Cannot queue bot message - missing content, session, or chat manager');
      return;
    }

    console.log('📦 Queuing bot message for database save:', content);
    
    this.queueDatabaseOperation(async () => {
      console.log('💾 Saving bot message to database (QUEUED):', content);
      
      try {
        const result = await this.chatManager.addMessage(
          this.currentSessionId!,
          content,
          'assistant',
          { id: 'dallosh-bot', name: 'Dallosh Bot' }
        );

        if (result) {
          console.log('✅ Bot message saved to database (QUEUED):', result);
          // Clear transcript chunks only after successful save
          this.clearBotTranscriptChunks();
        } else {
          console.error('❌ Failed to save bot message to database');
        }
      } catch (error) {
        console.error('❌ Error saving bot message to database:', error);
      }
    });
  }

  // Ensure voice input state is properly initialized and synchronized
  initializeVoiceState() {
    console.log('🎤 Initializing voice input state...');
    console.log('🎤 Current state:', {
      voiceInputEnabled: this.voiceInputEnabled,
      connected: this.connected,
      hasPcClient: !!this.pcClient
    });
    
    // Don't force disable voice input - respect user's preference
    // Only ensure it's properly synchronized when connected
    console.log('🎤 Voice input state preserved:', this.voiceInputEnabled);
    
    // Notify UI of current state
    if (this.onVoiceStateCallback) {
      this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
    }
    
    console.log('🎤 Voice input state initialized:', {
      voiceInputEnabled: this.voiceInputEnabled,
      audioOutputEnabled: this.audioOutputEnabled
    });
  }

  // Set voice input state explicitly
  async setVoiceInputState(enabled: boolean) {
    console.log('🎤 setVoiceInputState called with:', enabled, 'current state:', this.voiceInputEnabled);
    
    if (this.voiceInputEnabled === enabled) {
      console.log('🎤 Voice input already in desired state, no change needed');
      return;
    }
    
    if (!this.connected) {
      // Update state for when we connect later
      console.log('🎤 Not connected - updating state for future connection');
      this.voiceInputEnabled = enabled;
      this.voiceInputEnabledBeforeConnect = this.voiceInputEnabled;
      
      // Notify UI immediately
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
      return;
    }
    
    if (!this.pcClient) {
      console.log('❌ No Pipecat client available');
      return;
    }
    
    try {
      // Apply the new state to Pipecat client
      console.log('🎤 Setting voice input state in Pipecat:', enabled);
      await this.pcClient.enableMic(enabled);
      
      // Update our internal state
      this.voiceInputEnabled = enabled;
      console.log('✅ Voice input state set successfully:', this.voiceInputEnabled);
      
      // Notify UI of state change
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
      
    } catch (error) {
      console.error('❌ Failed to set voice input state:', error);
      
      // Notify UI of the error
      if (this.onErrorCallback) {
        this.onErrorCallback(`Failed to set voice input state: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Toggle voice input (align with reference behavior)
  async toggleVoiceInput() {
    console.log('🎤 VoiceManager.toggleVoiceInput called - connected:', this.connected, 'current state:', this.voiceInputEnabled);
    
    // Toggle the state first
    const newState = !this.voiceInputEnabled;
    console.log('🎤 Toggling voice input from', this.voiceInputEnabled, 'to', newState);
    
    if (!this.connected) {
      // Allow toggling even when not connected for UI feedback
      console.log('🎤 Not connected - updating state for UI feedback');
      this.voiceInputEnabled = newState;
      this.voiceInputEnabledBeforeConnect = this.voiceInputEnabled;
      
      console.log('🎤 Calling onVoiceStateCallback with:', this.voiceInputEnabled, this.audioOutputEnabled);
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
      return;
    }
    
    if (!this.pcClient) {
      console.log('❌ No Pipecat client available');
      return;
    }
    
    try {
             // Apply the new state to Pipecat client
       console.log('🎤 Applying voice input state to Pipecat:', newState);
       await this.pcClient.enableMic(newState);
       
       // Also control the local audio track directly for immediate effect
       if (this.localAudioTrack) {
         console.log('🎤 Controlling local audio track directly...');
         this.localAudioTrack.enabled = newState;
         console.log('🎤 Local audio track enabled:', this.localAudioTrack.enabled);
       }
       
       // Update our internal state only after successful Pipecat call
       this.voiceInputEnabled = newState;
       console.log('✅ Voice input state updated successfully:', this.voiceInputEnabled);
       
       // Notify UI of state change
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
       }
       
       // Log the final state for debugging
       console.log('🎤 Final voice input state:', {
         voiceInputEnabled: this.voiceInputEnabled,
         pipecatMicEnabled: newState,
         localTrackEnabled: this.localAudioTrack?.enabled,
         connected: this.connected,
         hasPcClient: !!this.pcClient
       });
      
      // Verify the state was applied correctly
      setTimeout(async () => {
        try {
          if (this.pcClient && typeof this.pcClient.enableMic === 'function') {
            console.log('🔍 Verifying voice input state in Pipecat...');
            // We can't directly check the mic state, but we can log our current state
            console.log('🎤 Verification - Current voice input state:', this.voiceInputEnabled);
          }
        } catch (error) {
          console.error('❌ Error verifying voice input state:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Failed to toggle voice input:', error);
      
      // Revert the state change if Pipecat call failed
      this.voiceInputEnabled = !newState;
      console.log('🔄 Reverted voice input state due to error:', this.voiceInputEnabled);
      
      // Notify UI of the reverted state
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
      
      // Also call the error callback if available
      if (this.onErrorCallback) {
        this.onErrorCallback(`Voice input toggle failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Helper function to check current audio state for debugging
  private checkAudioState() {
    let audioEl = this.currentAudioElement || document.getElementById('audio-el') as HTMLAudioElement;
    
    // Create audio element if it doesn't exist
    if (!audioEl) {
      console.log('🔊 Creating audio element for bot audio...');
      audioEl = document.createElement('audio');
      audioEl.id = 'audio-el';
      audioEl.autoplay = true;
      audioEl.controls = false;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      this.currentAudioElement = audioEl;
      console.log('✅ Audio element created and added to DOM');
    }
    
    if (audioEl) {
      console.log('🔍 Audio element state:', {
        exists: !!audioEl,
        hasSrcObject: !!audioEl.srcObject,
        currentVolume: audioEl.volume,
        muted: audioEl.muted,
        paused: audioEl.paused,
        readyState: audioEl.readyState,
        networkState: audioEl.networkState
      });
    } else {
      console.log('❌ Audio element not found');
    }
  }

     // Helper function to ensure audio element exists
   private ensureAudioElementExists() {
     if (!this.currentAudioElement && !document.getElementById('audio-el')) {
       console.log('🔊 Creating audio element for bot audio...');
       const audioEl = document.createElement('audio');
       audioEl.id = 'audio-el';
       audioEl.autoplay = true;
       audioEl.controls = false;
       audioEl.style.display = 'none';
       document.body.appendChild(audioEl);
       this.currentAudioElement = audioEl;
       console.log('✅ Audio element created and added to DOM');
    }
  }

  // Helper function to apply current audio state to audio element (EXACT from reference)
  private applyAudioState() {
     const audioEl = this.currentAudioElement || document.getElementById('audio-el') as HTMLAudioElement;
    if (audioEl && audioEl.srcObject) {
      if (this.audioOutputEnabled) {
        audioEl.volume = 1.0; // Unmute
        audioEl.muted = false; // Ensure not muted
        console.log('🔊 Audio unmuted - volume:', audioEl.volume, 'muted:', audioEl.muted);
      } else {
        audioEl.volume = 0.0; // Mute instead of pausing to maintain flow
        audioEl.muted = true; // Ensure muted
        console.log('🔇 Audio muted - volume:', audioEl.volume, 'muted:', audioEl.muted);
      }
    }
  }

  // Toggle audio output (EXACT from reference)
  toggleAudioOutput() {
    console.log('🔊 VoiceManager.toggleAudioOutput called - current state:', this.audioOutputEnabled);
    
    // Debug: Check current audio state
    this.checkAudioState();
    
    if (!this.connected) {
      // Allow toggling even when not connected for UI feedback
      this.audioOutputEnabled = !this.audioOutputEnabled;
      this.audioOutputEnabledBeforeConnect = this.audioOutputEnabled;
      
      console.log('🔊 Not connected - toggling audio state to:', this.audioOutputEnabled);
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
      return;
    }
    
    if (!this.pcClient) return;
    
    if (this.audioOutputEnabled) {
      // Mute audio
      this.audioOutputEnabled = false;
      console.log('🔇 Muting audio output');
      
      // IMMEDIATELY apply volume change to current audio element (EXACT from reference)
      const audioEl = this.currentAudioElement || document.getElementById('audio-el') as HTMLAudioElement;
      console.log('🔍 Audio element found:', !!audioEl, 'has srcObject:', !!audioEl?.srcObject, 'current volume:', audioEl?.volume);
      if (audioEl && audioEl.srcObject) {
        audioEl.volume = 0.0; // Mute instead of pausing to maintain flow
        audioEl.muted = true; // Ensure muted
        console.log('🔇 Audio element volume set to 0, muted=true, new volume:', audioEl.volume);
      } else {
        console.log('⚠️ No audio element or srcObject found for muting');
      }
      
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
    } else {
      // Unmute audio
      this.audioOutputEnabled = true;
      console.log('🔊 Unmuting audio output');
      
      // IMMEDIATELY apply volume change to current audio element (EXACT from reference)
      const audioEl = this.currentAudioElement || document.getElementById('audio-el') as HTMLAudioElement;
      console.log('🔍 Audio element found:', !!audioEl, 'has srcObject:', !!audioEl?.srcObject, 'current volume:', audioEl?.volume);
      if (audioEl && audioEl.srcObject) {
        audioEl.volume = 1.0; // Unmute
        audioEl.muted = false; // Ensure not muted
        audioEl.play().catch(error => {
          console.error('Audio playback failed:', error);
        });
        console.log('🔊 Audio element volume set to 1, muted=false, new volume:', audioEl.volume);
      } else {
        console.log('⚠️ No audio element or srcObject found for unmuting');
      }
      
      if (this.onVoiceStateCallback) {
        this.onVoiceStateCallback(this.voiceInputEnabled, this.audioOutputEnabled);
      }
    }
  }

  // Get system instructions for AI
  private getSystemInstructions(): string {
    return DEFAULT_SYSTEM_INSTRUCTIONS;
  }

  // Get bot configuration from database or fallback to default
  private async getBotConfigs(): Promise<BotConfig> {
    try {
      const client = await getSodularClient();
      if (!client) {
        console.log('⚠️ No Sodular client available, using default bot config');
        return {
          system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
          fields: {}
        };
      }

      // Get bot_settings table - use get() method for single table lookup
      console.log('🔍 Looking for bot_settings table...');
      const botSettingsTable = await client.tables.get({ filter: { 'data.name': 'bot_settings' } });
      
      let tableUID: string | null = null;
      
      if (!botSettingsTable.data) {
        // Double-check with query to avoid false negatives
        console.log('🔍 No table found with get(), checking with query...');
        const allTables = await client.tables.query({ take: 100 });
        const existingTable = allTables.data?.list?.find(table => 
          table.data?.name === 'bot_settings'
        );
        
        if (existingTable) {
          console.log('✅ Found existing bot_settings table with query, UID:', existingTable.uid);
          tableUID = existingTable.uid;
        } else {
          console.log('⚠️ No bot_settings table found, using default bot config');
          return {
            system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
            fields: {}
          };
        }
      } else {
        console.log('✅ Found bot_settings table with get(), UID:', botSettingsTable.data.uid);
        tableUID = botSettingsTable.data.uid;
      }
      
      if (!tableUID) {
        console.log('⚠️ No table UID available, using default bot config');
        return {
          system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
          fields: {}
        };
      }

      // Query for existing bot settings
      const result = await client.ref.from(tableUID).query({ take: 1 });
      
      if (result.data?.list && result.data.list.length > 0) {
        const existingSettings = result.data.list[0];
        const config: BotConfig = {
          system_instructions: existingSettings.data.system_instructions || DEFAULT_SYSTEM_INSTRUCTIONS,
          fields: existingSettings.data.fields || {}
        };
        
        console.log('✅ Loaded bot config from database:', config);
        return config;
      } else {
        console.log('⚠️ No bot settings found in database, using default bot config');
        return {
          system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
          fields: {}
        };
      }
    } catch (error) {
      console.error('❌ Error loading bot config from database:', error);
      console.log('⚠️ Using default bot config due to error');
      return {
        system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
        fields: {}
      };
    }
  }

  // Convert file to base64 for multimodal messages
  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Force sync voice input state (for debugging)
  async forceSyncVoiceInputState() {
    console.log('🔧 Force syncing voice input state...');
    console.log('🔧 Current state:', {
      voiceInputEnabled: this.voiceInputEnabled,
      connected: this.connected,
      hasPcClient: !!this.pcClient
    });
    
    if (this.connected && this.pcClient) {
             try {
         // Force re-enable mic to ensure it's working
         console.log('🔧 Force re-enabling microphone...');
         await this.pcClient.enableMic(false); // First disable
         await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit
         await this.pcClient.enableMic(this.voiceInputEnabled); // Then enable with current state
         
         // Also control the local audio track directly
         if (this.localAudioTrack) {
           console.log('🔧 Controlling local audio track directly...');
           this.localAudioTrack.enabled = this.voiceInputEnabled;
           console.log('🔧 Local audio track enabled:', this.localAudioTrack.enabled);
         }
         
         console.log('✅ Force sync completed');
       } catch (error) {
         console.error('❌ Force sync failed:', error);
       }
    } else {
      console.log('⚠️ Cannot force sync - not connected or no client');
    }
  }

  // Getters
  isConnected(): boolean {
    return this.connected;
  }

  isVoiceInputEnabled(): boolean {
    return this.voiceInputEnabled;
  }

  isAudioOutputEnabled(): boolean {
    return this.audioOutputEnabled;
  }

     // Check if Pipecat client is actually receiving microphone input
   async checkMicrophoneStatus(): Promise<{ enabled: boolean; hasAccess: boolean; error?: string; localTrackEnabled?: boolean }> {
     try {
       console.log('🔍 Checking microphone status...');
       
       // Check if we have microphone access
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       const hasAccess = stream.active;
       
       // Stop the test stream
       stream.getTracks().forEach(track => track.stop());
       
       console.log('🔍 Microphone status:', {
         enabled: this.voiceInputEnabled,
         hasAccess,
         localTrackEnabled: this.localAudioTrack?.enabled,
         connected: this.connected,
         hasPcClient: !!this.pcClient
       });
       
       return {
         enabled: this.voiceInputEnabled,
         hasAccess,
         localTrackEnabled: this.localAudioTrack?.enabled
       };
     } catch (error) {
       console.error('❌ Error checking microphone status:', error);
       return {
         enabled: this.voiceInputEnabled,
         hasAccess: false,
         localTrackEnabled: this.localAudioTrack?.enabled,
         error: error instanceof Error ? error.message : 'Unknown error'
       };
     }
  }

  // Set callbacks
  onConnectionState(callback: (connected: boolean) => void) {
    this.onConnectionStateCallback = callback;
  }

  onVoiceState(callback: (voiceEnabled: boolean, audioEnabled: boolean) => void) {
    this.onVoiceStateCallback = callback;
  }

  onUserTranscript(callback: (text: string, isFinal: boolean) => void) {
    this.onUserTranscriptCallback = callback;
  }

  onBotTranscript(callback: (text: string) => void) {
    console.log('🎯 onBotTranscript callback registered:', typeof callback);
    this.onBotTranscriptCallback = callback;
  }

  onBotSpeaking(callback: (isSpeaking: boolean) => void) {
    this.onBotSpeakingCallback = callback;
  }

  onBotReady(callback: () => void) {
    this.onBotReadyCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  // Database operation queue to prevent blocking live transcription
  private databaseQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  
  // Live message state for real-time UI updates
  private currentLiveUserMessage: string = '';
  private currentLiveBotMessage: string = '';

  // Add operation to database queue (non-blocking)
  private queueDatabaseOperation(operation: () => Promise<void>) {
    this.databaseQueue.push(operation);
    this.processDatabaseQueue(); // Process asynchronously
  }

  // Process database queue without blocking UI
  private async processDatabaseQueue() {
    if (this.isProcessingQueue || this.databaseQueue.length === 0) {
          return;
        }
        
    this.isProcessingQueue = true;
    console.log('📦 Processing database queue:', this.databaseQueue.length, 'operations');

    while (this.databaseQueue.length > 0) {
      const operation = this.databaseQueue.shift();
      if (operation) {
        try {
          await operation();
      } catch (error) {
          console.error('❌ Database queue operation failed:', error);
        }
      }
    }

    this.isProcessingQueue = false;
    console.log('✅ Database queue processing completed');
  }

  // Setup automatic integration with chat manager - REAL-TIME FIRST, DATABASE LAST
  setupChatIntegration(sessionId: string, userInfo: { id: string; name: string }) {
    // Store current session and user info for text message handling
    this.currentSessionId = sessionId;
    this.currentUserInfo = userInfo;
    
    console.log('🔧 Setting up chat integration for session:', sessionId, 'user:', userInfo);
    
    // NOTE: We do NOT set up callbacks here anymore to avoid overriding page callbacks
    // The page handles all UI updates through its own callbacks
    // This method only stores session info for database operations
  }



}

// Main Chat Service - orchestrates all managers
export class ChatService {
  private chatManager: ChatManager;
  private transcriptionManager: TranscriptionManager;
  private voiceManager: VoiceManager;
  private requestManager: RequestManager;
  private initialized: boolean = false;

  constructor() {
    this.chatManager = new ChatManager();
    this.transcriptionManager = new TranscriptionManager();
    this.voiceManager = new VoiceManager(this.chatManager, this.transcriptionManager);
    this.requestManager = new RequestManager();
    this.setupIntegrations();
  }

  private setupIntegrations() {
    // Connect transcription manager to voice manager
    this.transcriptionManager.onTranscriptionUpdate((text, isFinal) => {
      // Handle transcription updates
    });

    // Connect chat manager to voice manager for context updates
    this.chatManager.onMessagesUpdate((messages) => {
      // Handle message updates
    });
  }

  async initialize(): Promise<boolean> {
    try {
      await this.chatManager.initializeTableUIDs();
      await this.requestManager.initializeTableUIDs();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing chat service:', error);
      return false;
    }
  }

  // Getters for individual managers
  getChatManager(): ChatManager {
    return this.chatManager;
  }

  getTranscriptionManager(): TranscriptionManager {
    return this.transcriptionManager;
  }

  getVoiceManager(): VoiceManager {
    return this.voiceManager;
  }

  getRequestManager(): RequestManager {
    return this.requestManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async isSessionNew(sessionId: string): Promise<boolean> {
    try {
      const messages = await this.chatManager.getSessionMessages(sessionId);
      return messages.length === 0;
    } catch (error) {
      console.error('Error checking if session is new:', error);
      return true; // Assume new if error
    }
  }

  parseOriginalPostContent(content: string): string {
    console.log('🔍 Parsing original post content:', content);
    
    // Remove mentions (@username)
    let cleaned = content.replace(/@\w+/g, '');
    console.log('🧹 After removing mentions:', cleaned);
    
    // Remove hashtags (#tag)
    cleaned = cleaned.replace(/#\w+/g, '');
    console.log('🧹 After removing hashtags:', cleaned);
    
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    cleaned = cleaned.replace(/www\.[^\s]+/g, '');
    console.log('🧹 After removing URLs:', cleaned);
    
    // Remove extra whitespace and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    console.log('🧹 After removing extra whitespace:', cleaned);
    
    // If content is too short after cleaning, use original
    if (cleaned.length < 3) {
      console.log('⚠️ Cleaned content too short, using original');
      return content.trim();
    }
    
    console.log('✅ Final cleaned content:', cleaned);
    return cleaned;
  }

  async autoSendOriginalPost(sessionId: string, originalPostContent: string, userInfo: { id: string; name: string }): Promise<void> {
    try {
      console.log('🤖 AutoSendOriginalPost called with:', { sessionId, originalPostContent, userInfo });
      
      const cleanedContent = this.parseOriginalPostContent(originalPostContent);
      console.log('🧹 Cleaned content:', cleanedContent);
      
      if (cleanedContent && cleanedContent.length > 0) {
        console.log('✅ Content is valid, adding message...');
        const result = await this.chatManager.addMessage(sessionId, cleanedContent, 'user', userInfo);
        console.log('📝 Message add result:', result);
        
        if (result) {
          console.log('✅ Message added successfully');
        } else {
          console.error('❌ Failed to add message');
        }
      } else {
        console.log('⚠️ Cleaned content is empty or invalid');
      }
    } catch (error) {
      console.error('❌ Error auto-sending original post:', error);
    }
  }
}

// Create singleton instance
export const chatService = new ChatService();