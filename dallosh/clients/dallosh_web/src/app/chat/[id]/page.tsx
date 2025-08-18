'use client';

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { 
  Bot, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Clock, 
  User, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Phone,
  Wifi,
  WifiOff,
  Edit,
  Trash2,
  Loader2,
  FileText,
  X,
  Paperclip,
  Image,
  Upload,
  Headphones,
  Shield
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { parseMentions } from "@/lib/utils/mention-parser";
import { 
  chatService, 
  type ChatSession, 
  type ChatMessage,
  type Request
} from "../service";
import { getSodularClient } from "@/services/client";

// Types are now imported from service

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const chatId = params.id as string;
  
  // Security state - check if user has passed security requirements
  const [securityPassed, setSecurityPassed] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  
  // State
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasAutoSentOriginal, setHasAutoSentOriginal] = useState(false);
  
  // Attachment states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  
  // Debug: Track selectedFile changes
  useEffect(() => {
    console.log('🔄 selectedFile state changed:', selectedFile ? {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size
    } : null);
  }, [selectedFile]);
  
  // Create Request Modal State
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: '',
    description: '',
    label: 'normal' as Request['data']['label']
  });
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  
  // Voice chat state
  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] = useState(false);
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // Agent presence state
  const [isAgentPresent, setIsAgentPresent] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  
  // Service managers
  const chatManager = chatService.getChatManager();
  const transcriptionManager = chatService.getTranscriptionManager();
  const voiceManager = chatService.getVoiceManager();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Security check - ensure terms accepted and profile completed before allowing chat
  useEffect(() => {
    const checkSecurity = async () => {
      if (!user?.uid) return;
      
      try {
        // Check cookies for terms acceptance and profile completion
        const getCookie = (name: string): string | null => {
          const nameEQ = name + "=";
          const ca = document.cookie.split(';');
          for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
          }
          return null;
        };

        const termsAccepted = getCookie('chat_terms_accepted');
        const profileCompleted = getCookie('chat_profile_completed');
        
        console.log('🔒 Chat page security check - Terms:', termsAccepted, 'Profile:', profileCompleted);
        
        if (termsAccepted === 'true' && profileCompleted === 'true') {
          console.log('✅ Security passed, allowing chat service initialization');
          setSecurityPassed(true);
        } else {
          console.log('⚠️ Security not passed, waiting for SecurityWrapper to handle');
          // SecurityWrapper will handle showing modals, we just wait
          setSecurityPassed(false);
        }
      } catch (error) {
        console.error('Error checking security:', error);
        setSecurityPassed(false);
      } finally {
        setIsCheckingSecurity(false);
      }
    };

    checkSecurity();
  }, [user?.uid]);

  useEffect(() => {
    if (chatId && securityPassed) {
      initializeChatData();
    }
  }, [chatId, user, securityPassed]);

  // Monitor agent presence and set up message listeners
  useEffect(() => {
    if (chatSession && securityPassed) {
      checkAgentPresence();
      
      // Set up real-time message listeners
      setupMessageListeners();
      
      // Set up interval to check agent presence every 5 seconds
      const interval = setInterval(checkAgentPresence, 5000);
      
      return () => {
        clearInterval(interval);
        // Cleanup listeners will be handled by the setupMessageListeners cleanup function
      };
    }
  }, [chatSession, securityPassed]);

  // Set up message listeners when component mounts or chat session changes
  useEffect(() => {
    if (chatSession && securityPassed) {
      // Reset listener setup flag when session changes
      setIsListenersSetup(false);
      
      // Reset processed message IDs for new session
      setProcessedMessageIds(new Set());
      
      // Initial setup of message listeners
      setupMessageListeners();
      
      // Also refresh messages to ensure we have the latest
      refreshMessages();
    }
  }, [chatSession?.uid, securityPassed]); // Only re-run when the session ID changes

  // Auto-disconnect voice when agent joins
  useEffect(() => {
    if (isAgentPresent && isConnected && securityPassed) {
      console.log('👤 Agent joined, disconnecting voice chat...');
      handleDisconnect();
    }
  }, [isAgentPresent, isConnected, securityPassed]);

  // Show notification when agent joins/leaves
  const [wasAgentPresent, setWasAgentPresent] = useState(false);
  
  useEffect(() => {
    if (isAgentPresent && !wasAgentPresent && securityPassed) {
      console.log('👤 Agent joined the session');
      setWasAgentPresent(true);
      
      // Refresh messages when agent joins to get any new ones
      if (chatSession) {
        chatManager.getSessionMessages(chatSession.uid).then(setMessages);
      }
    } else if (!isAgentPresent && wasAgentPresent && securityPassed) {
      console.log('👤 Agent left the session');
      setWasAgentPresent(false);
      setAgentName(null);
      
      // Refresh messages when agent leaves
      if (chatSession) {
        chatManager.getSessionMessages(chatSession.uid).then(setMessages);
      }
    }
  }, [isAgentPresent, wasAgentPresent, chatSession, securityPassed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (securityPassed) {
      setupServiceCallbacks();
    }
    return () => {
      // Cleanup: always disconnect voice on unmount
      console.log('🧹 Component unmounting, cleaning up voice connection...');
      voiceManager.disconnect().catch(error => {
        console.log('Cleanup disconnect error (expected):', error);
      });
    };
  }, [securityPassed]);

  useEffect(() => {
    if (chatSession && !isConnected && !isConnecting && securityPassed) {
      // Auto-connect for new sessions
      const checkAndAutoConnect = async () => {
        try {
          console.log('🔍 Auto-connect check triggered...');
          console.log('📊 Auto-connect state:', { 
            chatSessionId: chatSession?.uid, 
            isConnected, 
            isConnecting,
            messagesLength: messages.length 
          });
          
          const isNew = await chatService.isSessionNew(chatSession.uid);
          console.log('🆕 Session is new:', isNew);
          
          if (isNew) {
            console.log('🆕 New session detected, auto-connecting...');
            await handleConnect();
          } else {
            console.log('📝 Existing session, not auto-connecting');
          }
        } catch (error) {
          console.error('❌ Error checking session status:', error);
        }
      };
      
      checkAndAutoConnect();
    }
  }, [chatSession, isConnected, isConnecting, securityPassed]);

  // Check agent presence in the session
  const checkAgentPresence = async () => {
    if (!chatSession) return;
    
    try {
      // Get the current session data to check for agentId
      const client = await getSodularClient();
      if (!client || !chatSession.uid) return;
      
      // Get the chat table UID
      const chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data?.uid) return;
      
      // Query the current session to get updated data including agentId
      const sessionResult = await client.ref.from(chatTable.data.uid).query({
        filter: { uid: chatSession.uid },
        take: 1
      });
      
      if (sessionResult.data?.list?.[0]) {
        const currentSessionData = sessionResult.data.list[0].data;
        const hasAgent = !!currentSessionData.agentId;
        const agentId = currentSessionData.agentId;
        
        setIsAgentPresent(hasAgent);
        
        if (hasAgent && agentId) {
          // Get agent username from the database instead of UID
          try {
            // First try to get the users table UID
            const usersTable = await client.tables.get({ filter: { 'data.name': 'users' } });
            if (usersTable.data?.uid) {
              try {
                const agentResult = await client.ref.from(usersTable.data.uid).query({
                  filter: { uid: agentId },
                  take: 1
                });
                
                if (agentResult.data?.list?.[0]) {
                  const agentData = agentResult.data.list[0].data;
                  const displayName = agentData?.fields?.displayName || agentData?.username || 'Support Agent';
                  setAgentName(displayName);
                } else {
                  // Fallback to a friendly name
                  setAgentName('Support Agent');
                }
              } catch (queryError) {
                console.warn('Could not query users table, using fallback name:', queryError);
                setAgentName('Support Agent');
              }
            } else {
              // No users table found, use fallback
              setAgentName('Support Agent');
            }
          } catch (error) {
            console.error('Error fetching agent info:', error);
            setAgentName('Support Agent');
          }
        } else {
          setAgentName(null);
        }
        
        console.log('👤 Agent presence check:', { hasAgent, agentId, agentName: agentName });
      }
    } catch (error) {
      console.error('Error checking agent presence:', error);
    }
  };

  // Set up real-time message listeners for agent messages
  const [messageListeners, setMessageListeners] = useState<any[]>([]);
  const [isListenersSetup, setIsListenersSetup] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  
  const setupMessageListeners = async () => {
    if (!chatSession || isListenersSetup) return;
    
    try {
      // Cleanup existing listeners first
      messageListeners.forEach(listener => {
        if (listener && typeof listener.unsubscribe === 'function') {
          listener.unsubscribe();
        }
      });
      
      const client = await getSodularClient();
      if (!client) return;

      // Get the messages table UID
      const messagesTable = await client.tables.get({ filter: { 'data.name': 'messages' } });
      if (!messagesTable.data?.uid) return;

      console.log('📡 Setting up real-time message listeners for customer chat...');

      // Listen for new messages in this session
      const messageListener = client.ref.from(messagesTable.data.uid).on('created', (data: any) => {
        if (data.data.chatId === chatSession.uid) {
          console.log('📨 New message received in customer chat:', data);
          console.log('🔍 Current processed message IDs:', Array.from(processedMessageIds));
          console.log('🔍 Current messages count:', messages.length);
          
          // Use a Set to track processed message IDs for this session
          setProcessedMessageIds(prev => {
            if (prev.has(data.uid)) {
              console.log('🚫 Duplicate message ID already processed, skipping:', data.uid);
              return prev;
            }
            
            // Add to processed set and update messages
            const newSet = new Set(prev);
            newSet.add(data.uid);
            
            setMessages(prevMessages => {
              // Double-check that message doesn't already exist in current state
              const alreadyExists = prevMessages.some(msg => msg.uid === data.uid);
              if (alreadyExists) {
                console.log('🚫 Message already exists in state, skipping:', data.uid);
                return prevMessages;
              }
              
              console.log('✅ Adding new message to state:', data.uid);
              console.log('📊 Messages before:', prevMessages.length, 'Messages after:', prevMessages.length + 1);
              return [...prevMessages, data];
            });
            
            return newSet;
          });
        }
      });

      // Listen for message updates
      const updateListener = client.ref.from(messagesTable.data.uid).on('patched', (data: any) => {
        if (data.data.chatId === chatSession.uid) {
          console.log('📝 Message updated in customer chat:', data);
          setMessages(prev => prev.map(msg => 
            msg.uid === data.uid ? { ...msg, data: { ...msg.data, ...data.data } } : msg
          ));
        }
      });

      // Store listeners for cleanup
      setMessageListeners([messageListener, updateListener]);
      setIsListenersSetup(true);
      
      console.log('✅ Real-time message listeners set up successfully');
    } catch (error) {
      console.error('Error setting up message listeners:', error);
    }
  };

  // Cleanup message listeners on unmount
  useEffect(() => {
    return () => {
      messageListeners.forEach(listener => {
        if (listener && typeof listener.unsubscribe === 'function') {
          listener.unsubscribe();
        }
      });
      // Reset processed message IDs
      setProcessedMessageIds(new Set());
    };
  }, [messageListeners]);

  // Handle direct text message to agent
  const handleDirectTextMessage = async () => {
    if (!newMessage.trim() || !chatSession || !user) return;
    
    try {
      setIsSending(true);
      
      // Send message directly to database (not through Pipecat)
      const success = await chatManager.sendDirectTextMessage(
        chatSession.uid,
        newMessage.trim(),
        user.uid,
        user.data?.fields?.displayName || user.data?.username || 'User',
        'user'
      );
      
      if (success) {
        setNewMessage('');
        // Refresh messages to show the new one immediately
        const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
        setMessages(updatedMessages);
        
        // Scroll to bottom to show new message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Manual refresh messages function
  const refreshMessages = async () => {
    if (!chatSession) return;
    
    try {
      console.log('🔄 Manually refreshing messages...');
      const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
      setMessages(updatedMessages);
      console.log('✅ Messages refreshed:', updatedMessages.length);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    }
  };

  useEffect(() => {
    // Trigger auto-send when:
    // 1. We're connected
    // 2. We have a chat session
    // 3. Messages array is empty (new session)
    // 4. We haven't already auto-sent
    // 5. The session has original content
    if (isConnected && 
        chatSession && 
        chatSession.data.content && 
        messages.length === 0 && 
        !hasAutoSentOriginal && 
        user) {
      
      console.log('🚀 Auto-send conditions met, starting process...');
      
      // Check if this is the first message (original post) and auto-send it
      const autoSendOriginal = async () => {
        try {
          // Add a small delay to ensure connection is fully established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('🔍 Auto-send triggered - checking session status...');
          console.log('📊 Current state:', { 
            isConnected, 
            chatSessionId: chatSession?.uid, 
            messagesLength: messages.length, 
            hasAutoSent: hasAutoSentOriginal,
            originalContent: chatSession?.data?.content 
          });
          
          const isNew = await chatService.isSessionNew(chatSession.uid);
          console.log('🆕 Session is new:', isNew);
          
          if (isNew && chatSession.data.content && user) {
            // Check if we already sent the original post content
            const existingMessages = await chatManager.getSessionMessages(chatSession.uid);
            console.log('📨 Existing messages count:', existingMessages.length);
            
            const hasOriginalContent = existingMessages.some(msg => 
              msg.data.content === chatSession.data.content || 
              msg.data.content.includes(chatSession.data.content.substring(0, 50))
            );
            
            if (!hasOriginalContent) {
              console.log('📝 Auto-sending original post content as first message');
              console.log('📝 Content to send:', chatSession.data.content);
              console.log('👤 User info:', { id: user.uid, name: user.data.username || user.data.fields?.displayName || 'User' });
              
              // Send the message through Pipecat voice system (let it handle database operations)
              const cleanedContent = chatService.parseOriginalPostContent(chatSession.data.content);
              if (cleanedContent && cleanedContent.length > 0) {
                console.log('🎤 Sending auto-sent message through Pipecat voice system:', cleanedContent);
                try {
                  // Ensure chat integration is set up before sending
                  if (user) {
                    console.log('🔧 Setting up chat integration for auto-send...');
                    voiceManager.setupChatIntegration(chatSession.uid, {
                      id: user.uid,
                      name: user.data.fields?.displayName || user.data.username || "User"
                    });
                  }
                  
                  // First, save the user message to database immediately for UI display
                  console.log('💾 Saving auto-sent user message to database...');
                  await chatManager.addMessage(
                    chatSession.uid,
                    cleanedContent,
                    'user',
                    {
                      id: user.uid,
                      name: user.data.fields?.displayName || user.data.username || "User"
                    }
                  );
                  console.log('✅ Auto-sent user message saved to database');
                  
                  // Wait a bit longer to ensure the voice system is fully ready
                  console.log('⏱️ Waiting for voice system to be ready...');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  console.log('✅ Voice system should be ready now');
                  
                  // Send through Pipecat with alreadySaved=true
                  await voiceManager.sendTextMessage(cleanedContent, true);
                  console.log('✅ Message sent through Pipecat voice system');
                  
                  // Add a small delay to ensure the message is processed
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  console.log('⏱️ Delay completed, message should be processed');
                  
                  // Wait a bit more for bot response to be processed and saved
                  console.log('⏱️ Waiting for bot response to be processed...');
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  console.log('✅ Bot response processing time completed');
                  
                  // Refresh messages to ensure UI updates (Pipecat should have added them)
                  const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
                  setMessages(updatedMessages);
                  console.log('📨 Updated messages after auto-send:', updatedMessages.length);
                  
                  // Check if bot response was added
                  const botMessages = updatedMessages.filter(msg => msg.data.senderType === 'assistant');
                  console.log('🤖 Bot messages found:', botMessages.length, botMessages.map(m => m.data.content));
                } catch (error) {
                  console.error('❌ Error sending message through voice system:', error);
                }
              }
              
              // Refresh messages to ensure UI updates (Pipecat should have added them)
              const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
              setMessages(updatedMessages);
              console.log('📨 Updated messages after auto-send:', updatedMessages.length);
              
              setHasAutoSentOriginal(true);
              console.log('✅ Auto-send completed');
            } else {
              console.log('📝 Original post content already sent, skipping auto-send');
              setHasAutoSentOriginal(true);
            }
          } else {
            console.log('❌ Auto-send conditions not met:', { 
              isNew, 
              hasContent: !!chatSession.data.content, 
              hasUser: !!user 
            });
          }
        } catch (error) {
          console.error('❌ Error auto-sending original post:', error);
          setHasAutoSentOriginal(true); // Mark as attempted even if failed
        }
      };
      
      autoSendOriginal();
    } else {
      console.log('⏸️ Auto-send conditions not met:', {
        isConnected,
        hasChatSession: !!chatSession,
        hasContent: chatSession?.data?.content,
        messagesLength: messages.length,
        hasAutoSent: hasAutoSentOriginal,
        hasUser: !!user
      });
    }
  }, [isConnected, chatSession, messages.length, user, hasAutoSentOriginal]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setupServiceCallbacks = () => {
    // Initialize voice state first
    voiceManager.initializeVoiceState();
    
    // Setup voice manager callbacks
    voiceManager.onConnectionState((connected) => {
      setIsConnected(connected);
      // Clear connecting state when connection state changes
      setIsConnecting(false);
      
      // If we just connected and have a new session, trigger auto-send immediately
      if (connected && chatSession && messages.length === 0 && !hasAutoSentOriginal) {
        console.log('🔌 Connection established, checking if we should auto-send...');
        setTimeout(() => {
          if (isConnected && chatSession && messages.length === 0 && !hasAutoSentOriginal) {
            console.log('🚀 Triggering auto-send from connection callback...');
            triggerAutoSend();
          }
        }, 500);
      }
    });
    voiceManager.onVoiceState((voiceEnabled, audioEnabled) => {
      console.log('🎤 UI updating voice state - voice:', voiceEnabled, 'audio:', audioEnabled);
      setIsVoiceInputEnabled(voiceEnabled);
      setIsAudioOutputEnabled(audioEnabled);
    });
    voiceManager.onError(setVoiceError);

    // Setup transcription manager callbacks - FIXED to show bot transcripts
    transcriptionManager.onTranscriptionUpdate((text, isFinal) => {
      console.log('📝 Transcription update received:', { text, isFinal });
      if (isFinal) {
        setTranscriptionText("");
      } else {
        setTranscriptionText(text);
      }
    });
    transcriptionManager.onTypingIndicator(setShowTypingIndicator);

    // Setup bot transcript callback to show bot messages in real-time
    voiceManager.onBotTranscript((text) => {
      console.log('🤖 Bot transcript received in UI:', text);
      console.log('🤖 Text type:', typeof text);
      console.log('🤖 Text length:', text?.length);
      console.log('🤖 Text trimmed:', text?.trim());
      
      if (text && text.trim()) {
        // Clean up the header ID markers and extra whitespace (like in the service)
        const cleanText = text
          .replace(/<\|start_header_id\|>assistant<\|end_header_id\|>/g, '')
          .replace(/<\|start_header_id\|>user<\|end_header_id\|>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log('🧹 Cleaned bot text for UI:', cleanText);
        console.log('🧹 Cleaned text length:', cleanText?.length);
        
        if (cleanText) {
          console.log('✅ Setting transcription text to:', cleanText);
          setTranscriptionText(cleanText);
        } else {
          console.log('⚠️ Cleaned text is empty, not setting transcription');
        }
      } else {
        console.log('⚠️ Bot transcript text is empty or invalid');
      }
    });

    // Setup bot speaking callback to show typing indicator
    voiceManager.onBotSpeaking((isSpeaking) => {
      console.log('🤖 Bot speaking state changed:', isSpeaking);
      setShowTypingIndicator(isSpeaking);
    });

    // Setup chat manager callbacks
    chatManager.onMessagesUpdate((updatedMessages) => {
      console.log('📡 Received messages update callback:', {
        previousCount: messages.length,
        newCount: updatedMessages.length,
        messages: updatedMessages.map(m => ({
          uid: m.uid,
          content: m.data.content.substring(0, 50) + '...',
          senderType: m.data.senderType
        }))
      });
      setMessages(updatedMessages);
    });
  };

  // Extract auto-send logic to a separate function
  const triggerAutoSend = async () => {
    try {
      console.log('🚀 Auto-send triggered from manual call...');
      console.log('📊 Current state:', { 
        isConnected, 
        chatSessionId: chatSession?.uid, 
        messagesLength: messages.length, 
        hasAutoSent: hasAutoSentOriginal,
        originalContent: chatSession?.data?.content 
      });
      
      if (!chatSession || !chatSession.data.content || !user) {
        console.log('❌ Missing required data for auto-send');
        return;
      }
      
      const isNew = await chatService.isSessionNew(chatSession.uid);
      console.log('🆕 Session is new:', isNew);
      
      if (isNew) {
        // Check if we already sent the original post content
        const existingMessages = await chatManager.getSessionMessages(chatSession.uid);
        console.log('📨 Existing messages count:', existingMessages.length);
        
        const hasOriginalContent = existingMessages.some(msg => 
          msg.data.content === chatSession.data.content || 
          msg.data.content.includes(chatSession.data.content.substring(0, 50))
        );
        
        if (!hasOriginalContent) {
          console.log('📝 Auto-sending original post content as first message');
          console.log('📝 Content to send:', chatSession.data.content);
          console.log('👤 User info:', { id: user.uid, name: user.data.username || user.data.fields?.displayName || 'User' });
          
          // Send the message through Pipecat voice system (let it handle database operations)
          const cleanedContent = chatService.parseOriginalPostContent(chatSession.data.content);
          if (cleanedContent && cleanedContent.length > 0) {
            console.log('🎤 Sending auto-sent message through Pipecat voice system:', cleanedContent);
            try {
              // Ensure chat integration is set up before sending
              if (user) {
                console.log('🔧 Setting up chat integration for auto-send...');
                voiceManager.setupChatIntegration(chatSession.uid, {
                  id: user.uid,
                  name: user.data.fields?.displayName || user.data.username || "User"
                });
              }
              
              // First, save the user message to database immediately for UI display
              console.log('💾 Saving auto-sent user message to database...');
              await chatManager.addMessage(
                chatSession.uid,
                cleanedContent,
                'user',
                {
                  id: user.uid,
                  name: user.data.fields?.displayName || user.data.username || "User"
                }
              );
              console.log('✅ Auto-sent user message saved to database');
              
              // Wait a bit longer to ensure the voice system is fully ready
              console.log('⏱️ Waiting for voice system to be ready...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              console.log('✅ Voice system should be ready now');
              
              // Send through Pipecat with alreadySaved=true
              await voiceManager.sendTextMessage(cleanedContent, true);
              console.log('✅ Message sent through Pipecat voice system');
              
              // Add a small delay to ensure the message is processed
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log('⏱️ Delay completed, message should be processed');
              
              // Wait a bit more for bot response to be processed and saved
              console.log('⏱️ Waiting for bot response to be processed...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              console.log('✅ Bot response processing time completed');
              
              // Refresh messages to ensure UI updates (Pipecat should have added them)
              const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
              setMessages(updatedMessages);
              console.log('📨 Updated messages after auto-send:', updatedMessages.length);
              
              // Check if bot response was added
              const botMessages = updatedMessages.filter(msg => msg.data.senderType === 'assistant');
              console.log('🤖 Bot messages found:', botMessages.length, botMessages.map(m => m.data.content));
            } catch (error) {
              console.error('❌ Error sending message through voice system:', error);
            }
          }
          
          // Refresh messages to ensure UI updates (Pipecat should have added them)
          const updatedMessages = await chatManager.getSessionMessages(chatSession.uid);
          setMessages(updatedMessages);
          console.log('📨 Updated messages after auto-send:', updatedMessages.length);
          
          setHasAutoSentOriginal(true);
          console.log('✅ Auto-send completed');
        } else {
          console.log('📝 Original post content already sent, skipping auto-send');
          setHasAutoSentOriginal(true);
        }
      } else {
        console.log('📝 Existing session, not auto-sending');
      }
    } catch (error) {
      console.error('❌ Error in triggerAutoSend:', error);
      setHasAutoSentOriginal(true); // Mark as attempted even if failed
    }
  };

  const initializeChatData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Initializing chat data for ID:', chatId);
      
      if (!user) {
        console.log('❌ No user available');
        return;
      }

      // Initialize chat service
      const initialized = await chatService.initialize();
      if (!initialized) {
        console.error('❌ Failed to initialize chat service');
        return;
      }

      // Set current session
      chatManager.setCurrentSession(chatId);

      // Fetch session data
      const session = await chatManager.getSession(chatId);
      console.log('📨 Session result:', session);
      
      if (session) {
        // Check if user has access to this chat
        // User can access sessions they created OR sessions created for them
        const hasAccess = session.data.authorId === user.uid || 
                         session.data.authorName === user.data.username ||
                         session.data.authorName === user.data.fields?.displayName;
        
        if (!hasAccess) {
          console.error('❌ Access denied to this chat session. Session details:', {
            sessionAuthorId: session.data.authorId,
            sessionAuthorName: session.data.authorName,
            currentUserId: user.uid,
            currentUsername: user.data.username,
            currentDisplayName: user.data.fields?.displayName
          });
          setChatSession(null);
          return;
        }
        
        console.log('✅ User has access to chat session');
        setChatSession(session);
        setHasAutoSentOriginal(false); // Reset auto-send state for new session
        
        // Fetch messages
        const sessionMessages = await chatManager.getSessionMessages(chatId);
        setMessages(sessionMessages);
        console.log('📨 Loaded messages:', sessionMessages.length);

        // Manual connect only - no auto-connect like reference implementation
      } else {
        console.error('❌ Chat session not found');
        setChatSession(null);
      }
    } catch (error) {
      console.error('Error initializing chat data:', error);
      setChatSession(null);
    } finally {
      setIsLoading(false);
    }
  };



  // Voice chat handlers
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setVoiceError(null);
      
                    // Setup voice integration with chat (like reference implementation)
      if (user) {
        voiceManager.setupChatIntegration(chatId, {
          id: user.uid,
          name: user.data.fields?.displayName || user.data.username || "User"
        });
      }
      
      await voiceManager.connect(chatId, undefined, user);
      console.log('✅ Voice chat connected successfully');
    } catch (error) {
      console.error('Voice connection failed:', error);
      setVoiceError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await voiceManager.disconnect();
    } catch (error) {
      console.error('Voice disconnect failed:', error);
    }
  };

  const handleToggleVoiceInput = async () => {
    try {
      console.log('🎤 Toggle voice input clicked - before:', isVoiceInputEnabled);
      await voiceManager.toggleVoiceInput();
      console.log('🎤 Toggle voice input completed');
    } catch (error) {
      console.error('Toggle voice input failed:', error);
    }
  };

  const handleToggleAudioOutput = () => {
    try {
      voiceManager.toggleAudioOutput();
    } catch (error) {
      console.error('Toggle audio output failed:', error);
    }
  };

  // Create Request Functions
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.name.trim() || !requestForm.description.trim() || !user || !chatSession) {
      return;
    }

    try {
      setIsCreatingRequest(true);
      
      const requestManager = chatService.getRequestManager();
      const newRequest = await requestManager.createRequest({
        chatId: chatSession.uid, // Link request to the current chat session
        name: requestForm.name.trim(),
        description: requestForm.description.trim(),
        userId: user.uid,
        userName: user.data.fields?.displayName || user.data.username || 'User',
        createdAt: Date.now(),
        label: requestForm.label,
        status: 'ongoing'
      });

      if (newRequest) {
        console.log('✅ Request created successfully:', newRequest);
        // Close modal and reset form
        setShowCreateRequestModal(false);
        setRequestForm({ name: '', description: '', label: 'normal' });
        // Show success message and redirect to requests page
        alert('Request created successfully! You can view it in the "My Requests" tab.');
        // Optionally redirect to requests page
        // router.push('/chat/requests');
      } else {
        console.error('❌ Failed to create request');
        alert('Failed to create request. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating request:', error);
      alert('Error creating request. Please try again.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // File handling functions
  const handleFileSelect = (event: any) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    console.log('📁 File selected:', file);
    if (file) {
      console.log('✅ Setting selected file:', file.name, file.type, file.size);
      console.log('🔍 File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      setSelectedFile(file);
      setIsAttachmentMenuOpen(false);
    } else {
      console.log('❌ No file selected');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
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
  };

  const sendMultimodalMessage = async (content: string, file: File) => {
    console.log('🖼️ sendMultimodalMessage called with:', { content, fileName: file.name });
    console.log('🔍 Connection state:', { isConnected, hasVoiceManager: !!voiceManager });
    
    if (!isConnected) {
      console.error('❌ Cannot send multimodal message - not connected to voice service');
      return;
    }

    try {
      console.log('🖼️ Preparing multimodal message with file:', file.name);
      
      console.log('🔍 Converting file to base64...');
      const base64Content = await convertFileToBase64(file);
      console.log('✅ Base64 conversion completed, length:', base64Content.length);
      
      const isImage = file.type.startsWith('image/');
      console.log('🔍 File type analysis:', { 
        originalType: file.type, 
        isImage, 
        base64Length: base64Content.length 
      });
      
      const messageData = {
        role: 'user',
        content: content,
        file: {
          type: isImage ? 'image_url' : 'file',
          url: isImage ? `data:${file.type};base64,${base64Content}` : null,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          content: isImage ? null : base64Content
        }
      };

      console.log('📤 Sending multimodal message via sendClientMessage:', messageData);
      
      // Send via custom WebRTC message (not through normal chat flow)
      try {
        await voiceManager.sendMultimodalMessage(content, file);
        console.log('✅ Multimodal message sent successfully');
      } catch (error: any) {
        console.error('❌ Failed to send multimodal message:', error);
        
        // Show user-friendly error message
        if (error.message && error.message.includes('Datachannel not ready')) {
          alert('Connection not fully established. Please wait a moment and try again.');
        } else {
          alert('Failed to send image. Please try again.');
        }
        throw error; // Re-throw to be caught by outer try/catch
      }
      
    } catch (error) {
      console.error('❌ Error sending multimodal message:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!user) return;
    
    // Allow sending with just file (no text required) or just text (no file required)
    if (!newMessage.trim() && !selectedFile) {
      console.log('❌ Nothing to send - no text and no file');
      return;
    }
    
    const message = newMessage.trim() || ''; // Allow empty message if file is attached
    const fileToSend = selectedFile;
    
    console.log('📊 Sending with:', { 
      hasText: !!message, 
      hasFile: !!fileToSend,
      fileName: fileToSend?.name 
    });
    
    setNewMessage(""); // Clear input immediately for next message
    setSelectedFile(null); // Clear selected file
    
    console.log('🚀 Sending message, setting isSending to true');
    setIsSending(true);
    
    try {
      // If there's a file attached, send as multimodal message ONLY
      if (fileToSend) {
        console.log('🖼️ Sending multimodal message with file:', fileToSend.name);
        console.log('🚫 SKIPPING normal chat flow - using sendClientMessage instead');
        await sendMultimodalMessage(message, fileToSend);
        return; // COMPLETELY skip normal message flow
      }
      
      console.log('📤 Adding regular text message to chat manager (no file attached)');
      // Send message through chat manager immediately for UI display
      const result = await chatManager.addMessage(
        chatId,
        message,
        'user',
        {
          id: user.uid,
          name: user.data.fields?.displayName || user.data.username || "User"
        }
      );

      console.log('✅ Chat manager result:', result);

      if (result) {
        // If voice is connected, send through voice system for AI processing
        if (isConnected) {
          console.log('🎤 Voice connected, sending message through Pipecat...');
          // Don't await this - let it run in background to avoid blocking UI
          voiceManager.sendTextMessage(message, true) // alreadySaved=true since we saved it above
            .then(() => {
              console.log('✅ Voice message sent successfully');
            })
            .catch((error) => {
              console.error('❌ Error sending message through voice:', error);
              // Fallback - log error, no fake responses
              console.error('Voice system failed, message saved but no AI response');
            });
        } else {
          // Text-only mode - no fake responses, just save the user message
          console.log('📝 Text-only mode: message saved, waiting for manual bot interaction');
        }
      } else {
        console.error('❌ Failed to add message to chat manager');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setIsSending(false);
      console.log('🏁 Setting isSending to false');
    }
  };

  // Message management functions
  const handleDeleteMessage = async (messageId: string, messageIndex: number) => {
    try {
      console.log('🗑️ Deleting message:', messageId, 'at index:', messageIndex);
      
      const messageToDelete = messages.find(msg => msg.uid === messageId);
      if (!messageToDelete || messageToDelete.data.senderType !== 'user') {
        console.log('❌ Cannot delete: not a user message or message not found');
        return;
      }

      // Delete the message and all subsequent messages (cascade delete)
      const messagesToDelete = messages.slice(messageIndex);
      console.log('🗑️ Messages to delete:', messagesToDelete.length);
      
      // Delete messages in reverse order to avoid index issues
      for (let i = messagesToDelete.length - 1; i >= 0; i--) {
        const msg = messagesToDelete[i];
        console.log('🗑️ Deleting message:', msg.uid, 'content:', msg.data.content.substring(0, 50));
        
        try {
          const deleteResult = await chatManager.deleteMessage(msg.uid);
          console.log('✅ Delete result for message', msg.uid, ':', deleteResult);
        } catch (deleteError) {
          console.error('❌ Failed to delete message', msg.uid, ':', deleteError);
          // Continue with other deletions even if one fails
        }
      }

      // Small delay to ensure database operations are committed
      console.log('⏱️ Waiting for database operations to commit...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Database commit delay completed');

      // Refresh messages from database to ensure consistency
      console.log('🔄 Refreshing messages from database...');
      const updatedMessages = await chatManager.getSessionMessages(chatId);
      console.log('📨 Updated messages count:', updatedMessages.length);
      
      // Verify that deleted messages are actually gone
      const deletedMessageIds = messagesToDelete.map(msg => msg.uid);
      const stillExist = updatedMessages.filter(msg => deletedMessageIds.includes(msg.uid));
      if (stillExist.length > 0) {
        console.warn('⚠️ Some deleted messages still exist in database:', stillExist.map(msg => msg.uid));
      } else {
        console.log('✅ All deleted messages confirmed removed from database');
      }
      
      // Update local state
      setMessages(updatedMessages);
      
      console.log('✅ Message deletion completed successfully');
    } catch (error) {
      console.error('❌ Error deleting message:', error);
    }
  };

  const handleEditMessage = async (messageId: string, currentContent: string) => {
    try {
      console.log('✏️ Editing message:', messageId, 'with content:', currentContent.substring(0, 50));
      
      const messageToEdit = messages.find(msg => msg.uid === messageId);
      if (!messageToEdit || messageToEdit.data.senderType !== 'user') {
        console.log('❌ Cannot edit: not a user message or message not found');
        return;
      }

      const newContent = prompt('Edit your message:', messageToEdit.data.content);
      if (!newContent || newContent.trim() === messageToEdit.data.content) {
        console.log('📝 No changes made, skipping edit');
        return;
      }

      console.log('✏️ Updating message with new content...');
      // Update the message
      const editResult = await chatManager.editMessage(messageToEdit.uid, newContent.trim());
      console.log('✅ Edit result:', editResult);

      // Delete all subsequent messages (they're now invalid)
      const subsequentMessages = messages.slice(messages.findIndex(msg => msg.uid === messageId) + 1);
      console.log('🗑️ Deleting subsequent messages:', subsequentMessages.length);
      
      // Delete messages in reverse order to avoid index issues
      for (let i = subsequentMessages.length - 1; i >= 0; i--) {
        const msg = subsequentMessages[i];
        console.log('🗑️ Deleting subsequent message:', msg.uid, 'content:', msg.data.content.substring(0, 50));
        
        try {
          const deleteResult = await chatManager.deleteMessage(msg.uid);
          console.log('✅ Delete result for subsequent message', msg.uid, ':', deleteResult);
        } catch (deleteError) {
          console.error('❌ Failed to delete subsequent message', msg.uid, ':', deleteError);
          // Continue with other deletions even if one fails
        }
      }

      // If voice is connected, send the edited message to regenerate AI response
      if (isConnected) {
        try {
          console.log('🎤 Voice connected, sending edited message for regeneration...');
          await voiceManager.sendTextMessage(newContent.trim());
        } catch (error) {
          console.error('❌ Error sending edited message through voice:', error);
        }
      }

      // Refresh messages from database to ensure consistency
      console.log('🔄 Refreshing messages from database after edit...');
      const updatedMessages = await chatManager.getSessionMessages(chatId);
      console.log('📨 Updated messages count after edit:', updatedMessages.length);
      
      // Verify that deleted subsequent messages are actually gone
      const deletedMessageIds = subsequentMessages.map(msg => msg.uid);
      const stillExist = updatedMessages.filter(msg => deletedMessageIds.includes(msg.uid));
      if (stillExist.length > 0) {
        console.warn('⚠️ Some deleted subsequent messages still exist in database:', stillExist.map(msg => msg.uid));
      } else {
        console.log('✅ All deleted subsequent messages confirmed removed from database');
      }
      
      // Update local state
      setMessages(updatedMessages);
      
      console.log('✅ Message edit completed successfully');
    } catch (error) {
      console.error('❌ Error editing message:', error);
    }
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

  // Show loading while checking security
  if (isCheckingSecurity) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white">Checking security requirements...</div>
        </div>
      </div>
    );
  }

  // Don't render chat until security passes
  if (!securityPassed) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <div className="text-white mb-2">Security requirements not met.</div>
          <div className="text-sm text-gray-400">
            Please complete the security checks in the SecurityWrapper above.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white">Loading chat session...</div>
      </div>
    );
  }

  if (!isLoading && !chatSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Chat Not Found</h2>
          <p className="text-gray-400 mb-4">The chat session you're looking for doesn't exist or you don't have access to it.</p>
          <div className="space-x-2">
            <Link href="/chat">
              <Button>Back to Chat</Button>
            </Link>
            <Link href="/twitter">
              <Button variant="outline">Go to Twitter</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // At this point, we know chatSession exists due to the checks above
  if (!chatSession) return null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] bg-white dark:bg-black">
      {/* Chat Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-neutral-900 p-3">
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900 dark:text-white">{chatSession.data.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Badge variant="secondary" className="text-xs">
                {chatSession.data.type}
              </Badge>
              <span>•</span>
              <span className="capitalize">{chatSession.data.status}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {formatDate(chatSession.data.createdAt)}
              </span>
              {isConnected && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-400">
                    <Phone className="h-3 w-3" />
                    Voice Connected
                  </span>
                </>
              )}
              {isAgentPresent && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Headphones className="h-3 w-3" />
                    Agent Present
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Create Request Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
              onClick={() => setShowCreateRequestModal(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Request
            </Button>

            {/* Connect/Disconnect button */}
            <Button
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={isConnecting || isAgentPresent}
              className={`${isConnected ? 'bg-red-600 hover:bg-red-700' : `bg-green-600 hover:bg-green-700 ${!isConnecting ? 'animate-pulse' : ''}`} transition-shadow focus:ring-4 ring-green-400/40`}
              size="sm"
              title={isAgentPresent ? "Voice chat disabled while agent is present" : undefined}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              ) : isAgentPresent ? (
                <>
                  <Headphones className="h-4 w-4 mr-2" />
                  Agent Chat
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>

            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-white">
                <DropdownMenuItem
                  className="text-red-400 focus:bg-gray-800 cursor-pointer"
                  onClick={async () => {
                    // Enhanced confirmation dialog with warning about related requests
                    const confirmed = confirm(
                      `Are you sure you want to delete this chat session?\n\n` +
                      `⚠️ This will also delete ALL related technical assistance requests for this session.\n\n` +
                      `This action cannot be undone.`
                    );

                    if (!confirmed) return;

                    try {
                      console.log('🗑️ User confirmed deletion of session from header:', chatId);
                      
                      const deleteResult = await chatManager.deleteSession(chatId);
                      
                      if (deleteResult) {
                        console.log(`✅ Session ${chatId} deleted successfully from database`);
                        
                        // Notify sidebar to refresh session list
                        try {
                          if (typeof window !== 'undefined') {
                            console.log('📡 Dispatching chat:sessions-updated event from chat page...');
                            window.dispatchEvent(new CustomEvent('chat:sessions-updated'));
                            console.log('✅ Event dispatched successfully');
                          }
                        } catch (eventError) {
                          console.error('❌ Error dispatching event:', eventError);
                        }
                        
                        // Show success message
                        alert('Chat session deleted successfully!');
                        
                        // Redirect to chat list
                        router.push('/chat');
                      } else {
                        console.error(`❌ Failed to delete session ${chatId} from database`);
                        alert('Failed to delete session. Please try again.');
                      }
                    } catch (error) {
                      console.error('❌ Error deleting session:', error);
                      alert('Error deleting session. Please try again.');
                    }
                  }}
                >
                  Delete session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


      </div>

      {/* Messages Area - WhatsApp-like bubbles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Pinned original context at top */}
        <div className="sticky top-0 z-10 pb-2">
          <div className="bg-gray-50 text-gray-900 rounded-lg p-4 border border-gray-200 shadow-sm dark:bg-neutral-900 dark:text-white dark:border-gray-700">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">{chatSession.data.authorName}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatDate(chatSession.data.createdAt)}
                </span>
              </div>
                <div className="text-gray-700 dark:text-gray-300 text-sm">
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Original post from {chatSession.data.source}:</strong>
                </div>
                <div className="bg-blue-50 text-gray-900 rounded p-2 border border-blue-100 dark:bg-neutral-800 dark:text-white dark:border-gray-700">
                  {parseMentions(chatSession.data.content)}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Messages */}
        {messages.map((message, messageIndex) => (
          <div key={message.uid} className={`flex gap-2 ${message.data.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.data.senderType === 'assistant' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={`max-w-[80%] md:max-w-[65%] ${message.data.senderType === 'user' ? 'order-1' : ''} relative group`}>
              <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                message.data.senderType === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : message.data.agentId
                  ? 'bg-green-600 text-white rounded-bl-sm'
                  : 'bg-red-600 text-white rounded-bl-sm'
              }`}>
                <div className="text-sm">{parseMentions(message.data.content)}</div>
                
                {/* Show if message is from agent */}
                {message.data.agentId && (
                  <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                    <Headphones className="h-3 w-3" />
                    Agent response
                  </div>
                )}
                
                {/* Edited indicator */}
                {message.data.isEdited && (
                  <div className="text-xs opacity-70 mt-1">(edited)</div>
                )}
                
                {/* Message management menu for user messages */}
                {message.data.senderType === 'user' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-black/10"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem 
                        onClick={() => handleEditMessage(message.uid, message.data.content)}
                        className="text-blue-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteMessage(message.uid, messageIndex)}
                        className="text-red-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Timestamp and sender name */}
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>{formatDate(message.data.createdAt)}</span>
                <span>•</span>
                <span>{message.data.senderName}</span>
              </div>
            </div>
            
            {message.data.senderType === 'user' && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.data.imageUrl} alt={user?.data.username} />
                <AvatarFallback className="bg-blue-600 text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
        
        {/* Live Transcription Display */}
        {transcriptionText && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-blue-900 dark:text-blue-100">AI Assistant</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Live Response</span>
                </div>
                <div className="text-blue-800 dark:text-blue-200 text-sm">
                  {transcriptionText}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Typing Indicator */}
        {showTypingIndicator && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">AI Assistant is thinking...</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Area (EXACT from reference) */}
      <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-neutral-900 p-4">
        {/* Voice Controls */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={handleToggleVoiceInput}
            variant={isVoiceInputEnabled ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 transition-all duration-200 ${
              isVoiceInputEnabled 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            title={isVoiceInputEnabled ? "Click to disable voice input" : "Click to enable voice input"}
          >
            {isVoiceInputEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {isVoiceInputEnabled ? "Voice On" : "Voice Off"}
            {!isVoiceInputEnabled && (
              <span className="text-xs opacity-70 ml-1">(Disabled)</span>
            )}
          </Button>
          
          <Button
            onClick={handleToggleAudioOutput}
            variant={isAudioOutputEnabled ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 transition-all duration-200 ${
              isAudioOutputEnabled 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            title={isAudioOutputEnabled ? "Click to disable audio output" : "Click to enable audio output"}
          >
            {isAudioOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {isAudioOutputEnabled ? "Audio On" : "Audio Off"}
            {!isAudioOutputEnabled && (
              <span className="text-xs opacity-70 ml-1">(Muted)</span>
            )}
          </Button>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className={`w-2 h-2 rounded-full ${isVoiceInputEnabled ? 'bg-red-500' : 'bg-gray-400'}`} />
            <span>Voice Input: {isVoiceInputEnabled ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Conditional UI: Connect Button, Text Input, or Agent Chat */}
        {!isConnected && !isAgentPresent ? (
          // Large Connect Button when not connected and no agent
          <div className="flex flex-col items-center justify-center py-12">
            {/* Agent Left Notification */}
            {!isAgentPresent && wasAgentPresent && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Headphones className="h-4 w-4" />
                  <span className="font-medium">Agent has left the conversation</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  You can now reconnect to voice chat with our AI assistant.
                </p>
              </div>
            )}
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi className="h-6 w-6 mr-2" />
                  Connect to Start Chatting
                </>
              )}
            </Button>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-center max-w-md">
              Click connect to start your conversation with our AI assistant
            </p>
          </div>
        ) : isAgentPresent ? (
          // Agent Chat Interface
          <div className="space-y-4">
            {/* Agent Status Banner */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <Headphones className="h-4 w-4" />
                  <span className="font-medium">Agent {agentName || 'Support'} has joined the conversation</span>
                </div>
                <Button
                  onClick={refreshMessages}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/30"
                >
                  <Loader2 className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                You can now chat directly with our support agent. The AI assistant will remain silent until the agent leaves.
              </p>
            </div>
            
            {/* Direct Text Input for Agent */}
            <div className="flex gap-3 items-end">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to the agent..."
                className="flex-1 min-h-[48px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDirectTextMessage();
                  }
                }}
              />
              
              <Button
                onClick={handleDirectTextMessage}
                disabled={!newMessage.trim()}
                className="px-4 h-12 bg-green-600 hover:bg-green-700 text-white"
                title="Send message to agent"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Text Input when connected to AI (no agent)
          <div className="space-y-4">
            {/* Debug buttons for testing */}
            {messages.length === 0 && (
              <div className="flex justify-center gap-2">
                <Button
                  onClick={triggerAutoSend}
                  variant="outline"
                  size="sm"
                  className="text-xs text-gray-500"
                >
                  🔧 Debug: Trigger Auto-Send
                </Button>
                <Button
                  onClick={() => voiceManager.forceSyncVoiceInputState()}
                  variant="outline"
                  size="sm"
                  className="text-xs text-gray-500"
                >
                  🎤 Debug: Force Sync Voice
                </Button>
                <Button
                  onClick={async () => {
                    const status = await voiceManager.checkMicrophoneStatus();
                    console.log('🎤 Microphone status:', status);
                    alert(`Microphone Status:\nEnabled: ${status.enabled}\nHas Access: ${status.hasAccess}${status.error ? `\nError: ${status.error}` : ''}`);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs text-gray-500"
                >
                  🎤 Debug: Check Mic Status
                </Button>
              </div>
            )}
            
                        {/* File preview - PROMINENTLY DISPLAYED */}
            {selectedFile && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      {selectedFile.type.startsWith('image/') ? (
                        <Image className="h-5 w-5 text-blue-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        📎 File attached: {selectedFile.name}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {selectedFile.type} • {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={removeSelectedFile}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Image preview for images */}
                {selectedFile.type.startsWith('image/') && (
                  <div className="mt-3">
                    <img 
                      src={URL.createObjectURL(selectedFile)} 
                      alt="Preview" 
                      className="max-h-32 max-w-full object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Input area */}
            <div className="flex gap-3 items-end">
              {/* Attachment button */}
              <DropdownMenu open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-12 w-12 rounded-full border-2 border-dashed transition-all ${
                      selectedFile 
                        ? "border-green-400 bg-green-50 text-green-600 dark:bg-green-950 dark:border-green-600" 
                        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500"
                    }`}
                    disabled={true}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = handleFileSelect;
                      input.click();
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Image className="h-4 w-4" />
                    <span>Upload Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = handleFileSelect;
                      input.click();
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload File</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Text input */}
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedFile ? "Add a message to your attachment..." : "Type your message..."}
                className="flex-1 min-h-[48px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              {/* Send button */}
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && !selectedFile}
                className={`px-4 h-12 transition-all ${
                  selectedFile 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
                title={selectedFile ? `Send with attachment: ${selectedFile.name}` : "Send message"}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedFile ? (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <Send className="h-4 w-4" />
                  </div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element for WebRTC (like reference implementation) */}
      <audio id="audio-el" autoPlay style={{ display: 'none' }}></audio>

      {/* Create Request Modal */}
      {showCreateRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Technical Request</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateRequestModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label htmlFor="request-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Request Title *
                </label>
                <Input
                  id="request-name"
                  type="text"
                  placeholder="Brief description of your issue"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="request-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detailed Description *
                </label>
                <Textarea
                  id="request-description"
                  placeholder="Please provide detailed information about your technical issue..."
                  value={requestForm.description}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="request-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority Level
                </label>
                <select
                  id="request-label"
                  value={requestForm.label}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, label: e.target.value as Request['data']['label'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-neutral-900 dark:border-gray-700 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateRequestModal(false)}
                  className="flex-1"
                  disabled={isCreatingRequest}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isCreatingRequest || !requestForm.name.trim() || !requestForm.description.trim()}
                >
                  {isCreatingRequest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Request'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> This request will be sent to our technical team for human intervention. 
                You'll be notified when a technician starts working on your issue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}