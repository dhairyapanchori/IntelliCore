import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { analyticsApi } from '../lib/analytics';
import { useAuthStore } from '../store/authStore';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, Plus, Search, MoreVertical, Send, 
  Folder, FileText, Database, Network, Clock, 
  ChevronRight, ThumbsUp, ThumbsDown, Copy, CheckCircle, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const isSidebarOpen = true;
  
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Suggested Prompts based on active context
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Summarize key findings from the latest reports",
    "What are the top documents modified this week?",
    "Show me compliance policies related to data security"
  ]);

  useEffect(() => {
    fetchSessions();
    fetchRightSidebarData();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // If the last message was from AI, update suggested prompts if provided
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'ai' && lastMsg.suggested_prompts) {
      setSuggestedPrompts(lastMsg.suggested_prompts);
    }
  }, [messages]);

  useEffect(() => {
    if (location.state?.initialPrompt) {
      setInput(location.state.initialPrompt);
      // Clean up state so we don't re-trigger on reload
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
      if (res.data.length > 0 && !activeSessionId) {
        setActiveSessionId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRightSidebarData = async () => {
    try {
      const dashData = await analyticsApi.getDashboardMetrics();
      setDashboardMetrics(dashData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await api.post('/chat/sessions', { title: "New Chat" });
      setSessions([res.data, ...sessions]);
      setActiveSessionId(res.data.id);
      setMessages([]);
      setSuggestedPrompts([
        "Summarize key findings from the latest reports",
        "What are the top documents modified this week?",
        "Show me compliance policies related to data security"
      ]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create chat");
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;
    
    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/chat/query', { 
        query: text, 
        session_id: activeSessionId 
      });
      
      if (!activeSessionId && res.data.session_id) {
        setActiveSessionId(res.data.session_id);
        fetchSessions(); 
      }
      
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: res.data.answer, 
        citations: res.data.citations,
        processing_time_ms: res.data.processing_time_ms,
        confidence_score: res.data.confidence_score,
        suggested_prompts: res.data.suggested_prompts
      };
      setMessages(prev => [...prev, aiMsg]);
      
      if (res.data.suggested_prompts && res.data.suggested_prompts.length > 0) {
        setSuggestedPrompts(res.data.suggested_prompts);
      }
      
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response");
      setMessages(prev => [...prev, { id: Date.now()+1, role: 'ai', content: "Sorry, an error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRename = async (id: number, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await api.patch(`/chat/sessions/${id}`, { title: newTitle });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
      setEditingSessionId(null);
    } catch {
      toast.error('Failed to rename chat');
    }
  };

  const renderSessionItem = (s: any) => (
    <div 
      key={s.id} 
      onClick={() => {
        if (editingSessionId !== s.id) setActiveSessionId(s.id);
      }}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between group transition-colors cursor-pointer ${activeSessionId === s.id ? 'bg-[#1E2333] text-indigo-400 font-medium' : 'text-slate-400 hover:bg-[#13161F] hover:text-slate-300'}`}
    >
      {editingSessionId === s.id ? (
        <input 
          autoFocus
          value={editingTitle}
          onChange={e => setEditingTitle(e.target.value)}
          onBlur={() => handleRename(s.id, editingTitle || s.title)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename(s.id, editingTitle || s.title);
            if (e.key === 'Escape') setEditingSessionId(null);
          }}
          className="bg-transparent border-b border-indigo-500 outline-none w-full text-indigo-400"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="truncate pr-4 flex-1">{s.title}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingSessionId(s.id);
                setEditingTitle(s.title);
              }}
              className="p-1 hover:text-white transition-colors"
              title="Rename Chat"
            >
              <Edit2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Group sessions by date
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.updated_at).toDateString() === today);
  const olderSessions = sessions.filter(s => new Date(s.updated_at).toDateString() !== today);

  const { metrics: topMetrics } = dashboardMetrics || {};

  return (
    <div className="flex h-full w-full bg-[#0A0C10] overflow-hidden">
      
      {/* LEFT SIDEBAR - Chat History */}
      <div className={`w-80 flex-shrink-0 bg-[#0F111A] border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden'}`}>
        <div className="p-4 flex gap-2">
          <button 
            onClick={createNewSession}
            className="flex-1 bg-transparent hover:bg-slate-800 border border-slate-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-colors"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
        
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-[#13161F] border border-slate-800 text-slate-300 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4 space-y-6">
          {todaySessions.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Today</h3>
              <div className="space-y-0.5">
                {todaySessions.map(s => renderSessionItem(s))}
              </div>
            </div>
          )}
          
          {olderSessions.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Previous 7 Days</h3>
              <div className="space-y-0.5">
                {olderSessions.map(s => renderSessionItem(s))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE - Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0C10] relative min-w-0">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 bg-[#0A0C10]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              AI Copilot
              <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Powered by IntelliCore AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <Clock size={16} /> Chat History
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-800 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                <MessageSquare size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">How can I help you today?</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                I am your enterprise knowledge assistant. Ask me questions about company policies, financial reports, engineering docs, or anything else in your knowledge base.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 max-w-4xl mx-auto w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded shrink-0 bg-indigo-600 flex items-center justify-center mt-1">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 ml-1">
                      <span>AI Copilot</span>
                      <span className="opacity-50">•</span>
                      <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#1E2333] border border-slate-700 text-white rounded-tr-sm' 
                      : 'bg-transparent text-slate-300'
                  }`}>
                    {msg.role === 'ai' ? (
                      <div className="prose prose-invert prose-slate prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                  
                  {/* AI Metadata Footer */}
                  {msg.role === 'ai' && (
                    <div className="flex flex-col gap-3 mt-1 ml-1 w-full">
                      
                      <div className="flex items-center gap-3 text-slate-500">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success("Copied to clipboard!");
                          }}
                          className="hover:text-white transition-colors" 
                          title="Copy"
                        ><Copy size={14} /></button>
                        <button className="hover:text-emerald-400 transition-colors" title="Helpful"><ThumbsUp size={14} /></button>
                        <button className="hover:text-red-400 transition-colors" title="Not helpful"><ThumbsDown size={14} /></button>
                      </div>
                      
                      {/* Citations & Confidence */}
                      {(msg.citations?.length > 0 || msg.processing_time_ms) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {msg.confidence_score !== undefined && (
                            <div className="flex items-center gap-1.5 bg-[#13161F] border border-slate-800 rounded px-2 py-1 text-[11px] font-medium text-emerald-400">
                              <CheckCircle size={10} /> {msg.confidence_score}% Confidence
                            </div>
                          )}
                          {msg.processing_time_ms !== undefined && (
                            <div className="flex items-center gap-1.5 bg-[#13161F] border border-slate-800 rounded px-2 py-1 text-[11px] font-medium text-slate-400">
                              <Clock size={10} /> {(msg.processing_time_ms / 1000).toFixed(2)}s
                            </div>
                          )}
                          
                          {msg.citations?.map((cit: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-[#13161F] border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors rounded px-2 py-1 text-[11px] font-medium text-slate-300 max-w-[200px]">
                              <FileText size={10} className="text-blue-400 shrink-0" />
                              <span className="truncate">{cit.document_title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded shrink-0 bg-slate-700 flex items-center justify-center mt-1">
                    <span className="text-white text-xs font-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4 max-w-4xl mx-auto w-full justify-start">
              <div className="w-8 h-8 rounded shrink-0 bg-indigo-600 flex items-center justify-center mt-1">
                <MessageSquare size={16} className="text-white" />
              </div>
              <div className="bg-transparent p-4 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 md:p-6 bg-[#0A0C10] shrink-0">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your enterprise knowledge..."
              className="w-full bg-[#13161F] border border-slate-700 group-hover:border-slate-600 focus:border-indigo-500 rounded-xl py-4 pl-12 pr-14 text-white placeholder-slate-500 resize-none outline-none transition-all shadow-lg min-h-[60px] max-h-[200px] scrollbar-none"
              rows={1}
              style={{ overflow: 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            >
              <Send size={16} />
            </button>
            
            <div className="absolute -bottom-6 left-2 right-2 flex justify-between">
              <p className="text-[10px] text-slate-500">AI responses may be inaccurate. Please verify important information.</p>
              <p className="text-[10px] text-slate-500 hidden sm:block">Press <kbd className="font-mono bg-slate-800 px-1 rounded">Enter</kbd> to send, <kbd className="font-mono bg-slate-800 px-1 rounded">Shift+Enter</kbd> for new line</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Context Panel */}
      <div className="w-80 flex-shrink-0 bg-[#0F111A] border-l border-slate-800 hidden xl:flex flex-col h-full overflow-y-auto scrollbar-thin">
        
        {/* Suggested Prompts */}
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-sm font-semibold text-white mb-4">Suggested Prompts</h3>
          <div className="space-y-3">
            {suggestedPrompts.map((prompt, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(prompt)}
                className="w-full text-left bg-[#13161F] hover:bg-[#1E2333] border border-slate-800 hover:border-slate-700 transition-colors p-3 rounded-xl flex gap-3 group"
              >
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${i===0 ? 'bg-indigo-500/10 text-indigo-400' : i===1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {i===0 ? <FileText size={14} /> : i===1 ? <Folder size={14} /> : <MessageSquare size={14} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-300 leading-snug">{prompt}</p>
                  <div className="text-[10px] text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    Ask Copilot <ChevronRight size={10} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-4">
            View more prompts <ChevronRight size={12} />
          </button>
        </div>

        {/* Knowledge Sources Stats */}
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-sm font-semibold text-white mb-4">Knowledge Sources</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText size={14} className="text-slate-500" /> Documents
              </div>
              <span className="font-semibold text-white">{topMetrics?.total_documents || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Database size={14} className="text-amber-500" /> Data Sources
              </div>
              <span className="font-semibold text-white">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Folder size={14} className="text-blue-500" /> Collections
              </div>
              <span className="font-semibold text-white">{topMetrics?.total_collections || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Network size={14} className="text-indigo-400" /> Knowledge Graph
              </div>
              <span className="font-semibold text-white">0 nodes</span>
            </div>
          </div>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-4">
            View all sources <ChevronRight size={12} />
          </button>
        </div>

        {/* Copilot Usage Analytics */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Copilot Usage</h3>
            <span className="text-[10px] bg-[#1E2333] border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 cursor-pointer">This Month ▾</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1">Queries</div>
              <div className="text-lg font-bold text-white">{topMetrics?.ai_queries || 0}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1">Avg. Response</div>
              <div className="text-lg font-bold text-white">0.0 sec</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1">Sources Accessed</div>
              <div className="text-lg font-bold text-white">0</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1">Accuracy Rate</div>
              <div className="text-lg font-bold text-white">0.0%</div>
            </div>
          </div>
          
          <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-6">
            View detailed analytics <ChevronRight size={12} />
          </button>
        </div>

      </div>

    </div>
  );
}
