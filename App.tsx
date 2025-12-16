import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Message, Role, ChatSession } from './types';
import { createChatSession, generateImageEdit } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import { Sparkles, Menu, Plus, MessageSquare, Search, Trash2, X, Sun, Moon, Eraser, Copy, Check } from 'lucide-react';

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isChatCopied, setIsChatCopied] = useState(false);
  
  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize: Load sessions and theme
  useEffect(() => {
    // Load Sessions
    const savedSessions = localStorage.getItem('textra_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }

    // Load Theme
    const savedTheme = localStorage.getItem('textra_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Effect: Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('textra_theme', theme);
  }, [theme]);

  // Persistence: Save to local storage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('textra_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Derived state
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.isStreaming]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Create a new session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      timestamp: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    chatSessionRef.current = createChatSession();
    setSidebarOpen(false);
    setSearchQuery('');
  };

  // Switch session
  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Reset API context for simplicity when switching (or implement history re-hydration)
    chatSessionRef.current = createChatSession();
    setSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    localStorage.setItem('textra_sessions', JSON.stringify(newSessions));
    
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleClearChat = () => {
    if (!currentSessionId || messages.length === 0) return;

    if (window.confirm("Are you sure you want to clear the current chat messages? This cannot be undone.")) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return { ...session, messages: [] };
        }
        return session;
      }));
      
      // Reset the AI chat context
      chatSessionRef.current = createChatSession();
    }
  };

  const handleCopyChat = async () => {
    if (!messages.length) return;

    const formattedChat = messages.map(m => {
      const role = m.role === Role.USER ? 'User' : 'Textra AI';
      return `**${role}:**\n${m.content}\n`;
    }).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(formattedChat);
      setIsChatCopied(true);
      setTimeout(() => setIsChatCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy chat:', err);
    }
  };

  const handleSendMessage = useCallback(async (text: string, imageFile?: File) => {
    if (!currentSessionId) return;

    let userImageBase64: string | undefined = undefined;

    if (imageFile) {
      try {
        userImageBase64 = await fileToBase64(imageFile);
      } catch (e) {
        console.error("Error converting file", e);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: text,
      image: userImageBase64,
      timestamp: Date.now(),
    };

    // Optimistic Update: Add User Message
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // Update title if it's the first message
        const newTitle = session.messages.length === 0 ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : session.title;
        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, userMessage]
        };
      }
      return session;
    }));

    setIsLoading(true);

    try {
      const botMessageId = (Date.now() + 1).toString();
      const botPlaceholder: Message = {
        id: botMessageId,
        role: Role.MODEL,
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
      };
      
      // Add Bot Placeholder
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: [...session.messages, botPlaceholder] } 
          : session
      ));

      // Re-initialize chat ref if null (edge case)
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession();
      }

      // Logic Branch: Image Edit vs Chat
      if (imageFile && userImageBase64) {
        // Image Edit / Generation
        const mimeType = imageFile.type;
        const base64Data = userImageBase64.split(',')[1];
        
        const response = await generateImageEdit(text, base64Data, mimeType);
        
        let generatedText = '';
        let generatedImage = undefined;

        if (response.candidates && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.text) generatedText += part.text;
            if (part.inlineData) {
              generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }

        // Update Bot Message (Final)
        setSessions(prev => prev.map(session => 
          session.id === currentSessionId 
            ? { 
                ...session, 
                messages: session.messages.map(m => m.id === botMessageId ? { ...m, content: generatedText, image: generatedImage, isStreaming: false } : m) 
              } 
            : session
        ));

      } else {
        // Text-only Chat (Streaming)
        const resultStream = await chatSessionRef.current.sendMessageStream({ message: text });
        
        let fullContent = '';

        for await (const chunk of resultStream) {
          const c = chunk as GenerateContentResponse;
          const chunkText = c.text;
          
          if (chunkText) {
            fullContent += chunkText;
            // Streaming Update
            setSessions(prev => prev.map(session => 
              session.id === currentSessionId 
                ? { 
                    ...session, 
                    messages: session.messages.map(m => m.id === botMessageId ? { ...m, content: fullContent } : m) 
                  } 
                : session
            ));
          }
        }

        // Finalize Streaming State
        setSessions(prev => prev.map(session => 
          session.id === currentSessionId 
            ? { 
                ...session, 
                messages: session.messages.map(m => m.id === botMessageId ? { ...m, content: fullContent, isStreaming: false } : m) 
              } 
            : session
        ));
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Extract specific error message
      let errorMessageText = "I'm sorry, I encountered an error.";
      
      if (error.message) {
        if (error.message.includes('API key')) {
          errorMessageText = "Error: API Key is missing or invalid. Please check your Vercel environment variables.";
        } else if (error.message.includes('403')) {
          errorMessageText = "Error 403: Permission denied. Please check your API key quota or permissions.";
        } else if (error.message.includes('429')) {
          errorMessageText = "Error 429: Usage limit exceeded. Please try again later.";
        } else {
          errorMessageText = `Error: ${error.message}`;
        }
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: errorMessageText,
        timestamp: Date.now(),
        error: true,
      };
      
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages: session.messages.map(m => m.isStreaming ? errorMessage : m) 
            } 
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-[260px] bg-white dark:bg-gray-900 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-gray-200 dark:border-white/5`}>
        
        {/* New Chat Button */}
        <div className="p-3 mb-1">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-white bg-white dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-500/10 border border-gray-200 dark:border-white/20 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 dark:group-focus-within:text-white transition-colors" />
                <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-md pl-9 pr-3 py-2 border border-gray-200 dark:border-transparent focus:border-primary-500 dark:focus:border-white/10 focus:bg-white dark:focus:bg-gray-700 focus:outline-none placeholder-gray-500 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
            </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
           {searchQuery && (
               <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">
                   {filteredSessions.length} result{filteredSessions.length !== 1 && 's'}
               </div>
           )}

           {/* Group: All Chats */}
           {!searchQuery && <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">History</div>}
           
           {filteredSessions.length === 0 ? (
             <div className="text-sm text-gray-500 px-3 italic py-4 text-center">
                 {searchQuery ? "No matching chats found." : "No history yet."}
             </div>
           ) : (
             <div className="space-y-1">
                 {filteredSessions.map(session => (
                    <div key={session.id} className="relative group">
                        <button 
                            onClick={() => switchSession(session.id)}
                            className={`flex items-center gap-3 w-full px-3 py-3 text-sm rounded-md transition-colors relative overflow-hidden text-left ${
                                currentSessionId === session.id 
                                ? 'bg-gray-200 dark:bg-[#343541] text-gray-900 dark:text-white font-medium' 
                                : 'text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#2A2B32]'
                            }`}
                        >
                            <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                            <span className="truncate flex-1 relative z-10 pr-6">
                            {session.title || "New conversation"}
                            </span>
                            {/* Fade effect for text overflow */}
                            <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l to-transparent group-hover:from-gray-100 dark:group-hover:from-[#2A2B32] ${currentSessionId === session.id ? 'from-gray-200 dark:from-[#343541]' : 'from-white dark:from-gray-900'}`} />
                        </button>
                        
                        {/* Delete Action (visible on hover) */}
                        <button 
                            onClick={(e) => deleteSession(e, session.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/5 dark:hover:bg-black/20 rounded"
                            title="Delete chat"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                 ))}
             </div>
           )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-1">
            <button 
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-500/10 rounded-md transition-colors"
            >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
             <button className="flex items-center gap-3 w-full px-3 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-500/10 rounded-md transition-colors">
                <Sparkles className="w-4 h-4" />
                Upgrade to Plus
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-500/10 rounded-md transition-colors">
                <div className="w-5 h-5 bg-purple-600 rounded-sm flex items-center justify-center text-[10px] font-bold text-white">T</div>
                User Account
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full w-full bg-white dark:bg-gray-700">
        
        {/* Chat Header (Responsive) */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-gray-700 dark:text-gray-200 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
                <button 
                  onClick={() => setSidebarOpen(true)} 
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md md:hidden flex-shrink-0"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm truncate max-w-[180px] md:max-w-md">
                        {currentSession?.title || "Textra AI"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                        Gemini 2.5 Flash
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                {messages.length > 0 && (
                    <>
                      <button
                          onClick={handleCopyChat}
                          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2 group"
                          title="Copy entire chat"
                      >
                          {isChatCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          <span className="text-xs hidden md:block">Copy</span>
                      </button>
                      <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1"></div>
                      <button
                          onClick={handleClearChat}
                          className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2 group"
                          title="Clear chat messages"
                      >
                          <Eraser className="w-4 h-4" />
                          <span className="text-xs hidden md:block group-hover:text-red-600 dark:group-hover:text-red-400">Clear</span>
                      </button>
                    </>
                )}
                <button 
                  onClick={createNewSession} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md md:hidden ml-1"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-32 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
               <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-full mb-6">
                 <Sparkles className="w-8 h-8 text-primary-500" />
               </div>
               <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-8">How can I help you today?</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
                  {[
                    "Explain quantum computing in simple terms",
                    "Write a Python script to scrape a website",
                    "What are the best practices for React hooks?",
                    "Help me plan a 3-day trip to Tokyo"
                  ].map((prompt, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-white/20"
                    >
                      <div className="font-medium mb-1 truncate">{prompt}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Prompt example</div>
                    </button>
                  ))}
               </div>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} className="h-8" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <InputArea onSend={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
};

export default App;