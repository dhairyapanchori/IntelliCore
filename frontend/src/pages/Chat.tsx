import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
      if (res.data.length > 0) {
        setActiveSessionId(prev => prev ? prev : res.data[0].id);
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

  const fetchMessages = async (id: number) => {
    try {
      const res = await api.get(`/chat/sessions/${id}/messages`);
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const createNewSession = async () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const deleteSession = async (id: number) => {
    try {
      await api.delete(`/chat/sessions/${id}`);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      fetchSessions();
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await api.post('/chat/query', {
        query: userMessage.content,
        session_id: activeSessionId
      });

      const data = response.data;
      
      // If a new session was created on the backend
      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
        fetchSessions(); // refresh sidebar
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: data.answer,
        citations: data.citations,
      }]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Search failed:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: "Sorry, I encountered an error while searching your documents."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-border/50 bg-slate-50 dark:bg-[#0F172A]/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg font-medium shadow-sm transition-all"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Recent</div>
          {sessions.map(s => (
            <div
              key={s.id}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeSessionId === s.id 
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate text-sm">{s.title}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-slate-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-slate-500 italic">No chat history</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0F172A]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
              <Bot size={48} className="text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">How can I help you today?</h3>
                <p className="text-slate-500 text-sm mt-1">Ask questions about your enterprise data.</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  }`}>
                    {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  
                  <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}>
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                          {message.content}
                        </p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 flex-row"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-3 text-slate-500">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-sm font-medium">Searching enterprise knowledge base...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="shrink-0 p-6 bg-white dark:bg-[#0F172A]">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message IntelliChat..."
                disabled={isLoading}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-6 pr-14 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm disabled:opacity-50 transition-shadow hover:shadow-md text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors flex items-center justify-center shadow-sm"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="text-center mt-3 text-xs text-slate-500 font-medium">
              IntelliChat can make mistakes. Consider verifying important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
