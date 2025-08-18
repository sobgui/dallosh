'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Bot, Trash2, Plus, Loader2, Edit2, MoreVertical } from 'lucide-react';
import { getSodularClient, databaseID } from '@/services/client';
import { useAuthStore } from '@/stores/auth';
import { Menu, MenuItem, MenuButton } from '@headlessui/react';

interface Message {
  uid: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: number;
}
interface ChatSession {
  uid: string;
  name: string;
  createdAt: number;
}

// Utility to fetch agents object for AI streaming
async function fetchAgentsObject(client: any): Promise<Record<string, any>> {
  // 1. Find the ai_agents table
  const tableRes = await client.tables.get({ filter: { 'data.name': 'ai_agents' } });
  const agentTable = tableRes?.data;
  if (!agentTable || !agentTable.uid) return {};
  const agentCollectionId = agentTable.uid;
  // 2. Query all agents
  const agentsRes = await client.ref.from(agentCollectionId).query();
  const list = agentsRes?.data?.list || [];
  // 3. Build agents object
  const agents: Record<string, any> = {};
  for (const agent of list) {
    if (agent.data?.category) {
      agents[agent.data.category] = agent.data;
    }
  }
  return agents;
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatTableId, setChatTableId] = useState<string | null>(null);
  const [messageTableId, setMessageTableId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [botTyping, setBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  // State for renaming
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Bootstrap collections and load sessions
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const client = await getSodularClient();
      if (!client) return;
      // Ensure chat collection
      let chatTable = await client.tables.get({ filter: { 'data.name': 'chat' } });
      if (!chatTable.data) {
        const created = await client.tables.create({ data: { name: 'chat', description: 'Chat sessions' } });
        chatTable = created;
      }
      if (!chatTable.data) return;
      setChatTableId(chatTable.data.uid);
      // Ensure messages collection
      let messageTable = await client.tables.get({ filter: { 'data.name': 'messages' } });
      if (!messageTable.data) {
        const created = await client.tables.create({ data: { name: 'messages', description: 'Chat messages' } });
        messageTable = created;
      }
      if (!messageTable.data) return;
      setMessageTableId(messageTable.data.uid);
      // Load sessions
      const sessionRes = await client.ref.from(chatTable.data.uid).query({ sort: { createdAt: -1 } });
      setSessions(
        (sessionRes.data?.list || []).map((s: any) => ({
          uid: s.uid,
          name: s.data.name,
          createdAt: s.createdAt,
        }))
      );
    })();
  }, [isOpen]);

  // Load messages for selected session
  useEffect(() => {
    if (!selectedSession || !messageTableId) return;
    (async () => {
      const client = await getSodularClient();
      if (!client) return;
      const res = await client.ref.from(messageTableId as string).query({
        filter: { 'data.chat_id': selectedSession.uid },
        sort: { createdAt: 1 },
      });
      setMessages(
        (res.data?.list || []).map((m: any) => ({
          uid: m.uid,
          sender: m.data.role === 'assistant' ? 'bot' : 'user',
          text: m.data.content,
          createdAt: m.createdAt,
        }))
      );
    })();
  }, [selectedSession, messageTableId]);

  // Create new session
  const handleNewSession = async () => {
    if (!chatTableId || !user) return;
    const client = await getSodularClient();
    if (!client) return;
    const name = `Chat ${sessions.length + 1}`;
    const res = await client.ref.from(chatTableId as string).create({
      data: { name, createdBy: user.uid },
    });
    if (res.data) {
      const newSession = { uid: res.data.uid, name, createdAt: res.data.createdAt };
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSession(newSession);
    }
  };

  // Delete session and its messages
  const handleDeleteSession = async (session: ChatSession) => {
    if (!chatTableId || !messageTableId) return;
    const client = await getSodularClient();
    if (!client) return;
    await client.ref.from(chatTableId as string).delete({ uid: session.uid });
    await client.ref.from(messageTableId as string).delete({ 'data.chat_id': session.uid });
    setSessions((prev) => prev.filter((s) => s.uid !== session.uid));
    if (selectedSession?.uid === session.uid) {
      setSelectedSession(null);
      setMessages([]);
    }
  };

  // Delete a single message
  const handleDeleteMessage = async (msg: Message) => {
    if (!messageTableId) return;
    const client = await getSodularClient();
    if (!client) return;
    await client.ref.from(messageTableId as string).delete({ uid: msg.uid });
    setMessages((prev) => prev.filter((m) => m.uid !== msg.uid));
  };

  const handleStartRename = (session: ChatSession) => {
    setRenamingSessionId(session.uid);
    setRenameValue(session.name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };
  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(e.target.value);
  };
  const handleRenameKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, session: ChatSession) => {
    if (e.key === 'Enter' && renameValue.trim()) {
      await handleRenameSession(session, renameValue.trim());
    } else if (e.key === 'Escape') {
      setRenamingSessionId(null);
      setRenameValue('');
    }
  };
  const handleRenameSession = async (session: ChatSession, newName: string) => {
    if (!chatTableId) return;
    const client = await getSodularClient();
    if (!client) return;
    await client.ref.from(chatTableId as string).patch({ uid: session.uid }, { data: { name: newName } });
    setSessions((prev) => prev.map((s) => (s.uid === session.uid ? { ...s, name: newName } : s)));
    setRenamingSessionId(null);
    setRenameValue('');
  };

  // Send message and stream AI response
  const handleSend = async (inputText: string) => {
    setAiError(null);
    if (!inputText.trim() || !selectedSession || !messageTableId || !chatTableId || !user) return;
    setIsLoading(true);
    setBotTyping(false);
    const client = await getSodularClient();
    if (!client || !client.ai) return;
    // Save user message
    const userMsgRes = await client.ref.from(messageTableId as string).create({
      data: {
        chat_id: selectedSession.uid,
        role: 'user',
        content: inputText,
        createdBy: user.uid,
      },
    });
    if (!userMsgRes.data) {
      setIsLoading(false);
      setBotTyping(false);
      setAiError('Failed to save user message.');
      return;
    }
    const userMsg: Message = {
      uid: userMsgRes.data.uid,
      sender: 'user',
      text: inputText,
      createdAt: userMsgRes.data.createdAt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Prepare input for AI
    const chatHistory = messages
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .map((m) => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text }));
    const aiInput = [...chatHistory, { role: 'user', content: inputText }];
    let botMsgUid: string | null = null;
    let botMsgText = '';
    setBotTyping(true);
    try {
      const agents = await fetchAgentsObject(client);
      await client.ai.generateStreamChat(
        { input: aiInput, context: { user: { database_id: databaseID } }, agents },
        {
          onData: async (data: any) => {
            botMsgText += data;
            if (!botMsgUid && isValidMessageTableId) {
              const botMsgRes = await client.ref.from(messageTableId as string).create({
                data: {
                  chat_id: selectedSession.uid,
                  role: 'assistant',
                  content: '',
                  createdBy: 'bot',
                },
              });
              if (!botMsgRes.data || typeof botMsgRes.data.uid !== 'string') return;
              botMsgUid = botMsgRes.data.uid;
              setMessages((prev) => [
                ...prev,
                // Only add if botMsgUid is string
                ...(typeof botMsgUid === 'string' ? [{ uid: botMsgUid, sender: 'bot' as 'bot', text: '', createdAt: Date.now() }] : []),
              ]);
            }
            if (!botMsgUid) return;
            if (isValidMessageTableId && botMsgUid) {
              const client = await getSodularClient();
              if (!client) return;
              await client.ref.from(messageTableId as string).patch(
                { uid: botMsgUid },
                { data: { content: botMsgText } }
              );
            }
            // Update the message in local state
            setMessages((prev) =>
              prev.map((m) =>
                m.uid === botMsgUid ? { ...m, text: botMsgText } : m
              )
            );
          },
          onFinish: () => {
            setBotTyping(false);
            setIsLoading(false);
          },
          onError: (err: unknown) => {
            setBotTyping(false);
            setIsLoading(false);
            setAiError(
              (err as any)?.message ||
                'AI server is not responding. Please check your connection or try again.'
            );
            // eslint-disable-next-line no-console
            console.error('AI stream error:', err);
          },
        }
      );
    } catch (err: unknown) {
      setBotTyping(false);
      setIsLoading(false);
      setAiError(
        (err as any)?.message ||
          'AI server is not responding. Please check your connection or try again.'
      );
      // eslint-disable-next-line no-console
      console.error('AI stream error:', err);
    }
  };

  // UI
  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50 h-16 w-16 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
      >
        <MessageSquare size={32} />
      </Button>
    );
  }

  // Add safe guards for table IDs
  const isValidMessageTableId = typeof messageTableId === 'string' && messageTableId.length > 0;
  const isValidChatTableId = typeof chatTableId === 'string' && chatTableId.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-3xl h-[600px] rounded-xl shadow-2xl overflow-hidden bg-background border">
      {/* Sidebar */}
      <div className="w-64 bg-muted border-r flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg">Chats</span>
          <Button size="icon" variant="outline" onClick={handleNewSession}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {sessions.map((session) => (
              <div key={session.uid} className={`flex items-center gap-2 rounded px-2 py-2 cursor-pointer transition-colors ${selectedSession?.uid === session.uid ? 'bg-accent' : 'hover:bg-accent/50'}`}
                onClick={() => setSelectedSession(session)}>
                {renamingSessionId === session.uid ? (
                  <input
                    className="bg-muted rounded px-2 py-1 text-sm"
                    value={renameValue}
                    autoFocus
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={async () => {
                      if (renameValue.trim() && renameValue !== session.name) {
                        const client = await getSodularClient();
                        if (!client) return;
                        if (isValidChatTableId) {
                          await client.ref.from(chatTableId as string).patch({ uid: session.uid }, { data: { name: renameValue } });
                          setSessions(sessions => sessions.map(s => s.uid === session.uid ? { ...s, name: renameValue } : s));
                        }
                      }
                      setRenamingSessionId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setRenamingSessionId(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 cursor-pointer" onDoubleClick={() => { setRenamingSessionId(session.uid); setRenameValue(session.name); }}>{session.name}</span>
                )}
                <button onClick={() => { setRenamingSessionId(session.uid); setRenameValue(session.name); }} className="p-1 hover:bg-muted rounded"><Edit2 size={14} /></button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      {/* Main Chat */}
      <Card className="flex-1 flex flex-col rounded-none border-0">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-lg">
              {selectedSession ? selectedSession.name : 'Select a chat'}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close chat">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <ScrollArea className="flex-1 h-full w-full p-4 min-h-0" ref={scrollRef}>
            <div className="space-y-4">
              {selectedSession ? messages.map((msg, idx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.uid}
                    className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} items-center gap-2 mb-1`}
                  >
                    {/* Message bubble */}
                    <div className="flex items-center">
                      {isBot && <Bot className="h-6 w-6 shrink-0 text-primary mr-2" />}
                      <div
                        className={`relative max-w-[80%] rounded-lg px-3 py-2 shadow ${
                          isBot ? 'bg-muted' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{msg.text}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => handleDeleteMessage(msg)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {/* 3-dot menu, always next to bubble, never floating */}
                    <Menu as="div" className="relative inline-block text-left">
                      <MenuButton className="p-1 hover:bg-muted rounded transition focus:ring-2 focus:ring-primary">
                        <MoreVertical size={18} />
                      </MenuButton>
                      <Menu.Items className="bg-popover border rounded shadow-md mt-2">
                        <MenuItem>
                          {({ active }: { active: boolean }) => (
                            <button className={`w-full text-left px-3 py-2 ${active ? 'bg-muted' : ''}`} onClick={async () => {
                              // Delete message and all below
                              const toDelete = messages.slice(idx);
                              setMessages(messages.slice(0, idx));
                              const client = await getSodularClient();
                              if (!client) return;
                              for (const m of toDelete) {
                                if (isValidMessageTableId) {
                                  await client.ref.from(messageTableId as string).delete({ uid: m.uid });
                                }
                              }
                            }}>Delete</button>
                          )}
                        </MenuItem>
                        <MenuItem>
                          {({ active }: { active: boolean }) => (
                            <button className={`w-full text-left px-3 py-2 ${active ? 'bg-muted' : ''}`} onClick={async () => {
                              // Re-edit: for user, allow editing and resend; for bot, regenerate
                              const toDelete = messages.slice(idx);
                              setMessages(messages.slice(0, idx));
                              const client = await getSodularClient();
                              if (!client) return;
                              for (const m of toDelete) {
                                if (isValidMessageTableId) {
                                  await client.ref.from(messageTableId as string).delete({ uid: m.uid });
                                }
                              }
                              if (msg.sender === 'user') {
                                setInput(msg.text);
                              } else {
                                // Regenerate: resend last user message
                                const lastUserMsg = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
                                if (lastUserMsg && typeof lastUserMsg.text === 'string') await handleSend(lastUserMsg.text);
                              }
                            }}>{msg.sender === 'user' ? 'Re-edit' : 'Regenerate'}</button>
                          )}
                        </MenuItem>
                      </Menu.Items>
                    </Menu>
                  </div>
                );
              }) : <div className="text-muted-foreground text-center py-8">Select a chat</div>}
              {botTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <Bot className="h-6 w-6 shrink-0 text-primary" />
                  <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-75"></span>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-150"></span>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-300"></span>
                    </div>
                  </div>
                </div>
              )}
              {aiError && (
                <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg">
                  <span className="h-4 w-4 text-red-500">⚠️</span>
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="pt-4">
          <div className="flex w-full items-center gap-2">
            <Textarea
              placeholder={selectedSession ? "Type your message..." : "Select a chat to start messaging"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              rows={1}
              className="min-h-0 resize-none"
              disabled={isLoading || !(selectedSession && isValidMessageTableId && isValidChatTableId)}
            />
            <Button onClick={() => handleSend(input)} disabled={isLoading || !(selectedSession && isValidMessageTableId && isValidChatTableId)} size="icon" className="shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
