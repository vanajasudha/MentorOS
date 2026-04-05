// Premium ChatBox — conversational AI tutor with integrated file/URL upload
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, User, Loader2, History, Sparkles, MessageSquare, Paperclip, Link2, X, Image as ImageIcon, FileText, BookOpen, Brain, HelpCircle, ChevronDown, Plus, Globe, GraduationCap } from 'lucide-react';
import api from '../services/api';

const MessageContent = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-[15px]">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white mb-2">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const text = line.slice(2);
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-mentor-purple mt-1.5">•</span>
              <p>{text}</p>
            </div>
          );
        }
        return <p key={i} className={line === '' ? 'h-3' : 'mb-1 leading-relaxed'}>{line}</p>;
      })}
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-[#121926]/80 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-mentor-purple/20 hover:border-mentor-purple/60 hover:text-white transition-all shadow-sm"
  >
    <Icon className="w-3.5 h-3.5" />
    <span className="tracking-wide uppercase text-[10px]">{label}</span>
  </button>
);

const ChatBox = ({ sessionId, initialMode, onLoadSessionInfo, onResetSession, onSessionChange, onOpenSessionHistory }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sources, setSources] = useState([]);
  const [uploadMode, setUploadMode] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState('');
  
  // Student Mode State
  const [studentTopic, setStudentTopic] = useState('');
  const [studentLevel, setStudentLevel] = useState('beginner');
  const [isStudentModeActive, setIsStudentModeActive] = useState(initialMode === 'shadow');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) { setMessages([]); return; }
    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/sessions/${sid}`);
      if (res.data?.history) {
        setMessages(res.data.history.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString()
        })));
        
        // Detect if this session is a student mode session from title
        if (res.data.title?.startsWith('Teaching:')) {
          setIsStudentModeActive(true);
          const parts = res.data.title.replace('Teaching: ', '').split(' (');
          setStudentTopic(parts[0]);
          setStudentLevel(parts[1]?.replace(')', '').toLowerCase() || 'beginner');
        } else {
          setIsStudentModeActive(false);
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await api.get('/materials');
      setSources(res.data || []);
    } catch { }
  }, []);

  useEffect(() => {
    if (sessionId) { loadSessionMessages(sessionId); fetchSources(); }
    else {
      setMessages([]);
      setIsStudentModeActive(initialMode === 'shadow');
    }
  }, [sessionId, loadSessionMessages, fetchSources, initialMode]);

  const handleStartShadowMode = useCallback(async (e) => {
    e?.preventDefault();
    if (!studentTopic.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await api.post('/shadow/start', { 
        topic: studentTopic.trim(),
        level: studentLevel 
      });
      
      // Navigate to the new session
      if (onSessionChange) onSessionChange(res.data.session_id);
      
      setMessages([{
        role: 'assistant',
        content: res.data.question,
        timestamp: new Date().toISOString()
      }]);
      setIsStudentModeActive(true);
    } catch (e) {
      alert(`Could not start student mode: ${e.response?.data?.detail || e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [studentTopic, studentLevel, onSessionChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = useCallback(async (overrideText) => {
    const text = overrideText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (isStudentModeActive) {
        const res = await api.post('/shadow/evaluate', {
          session_id: sessionId,
          topic: studentTopic,
          level: studentLevel,
          answer: text
        });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.evaluation,
          timestamp: new Date().toISOString()
        }]);
      } else {
        const res = await api.post('/query', { query: text, session_id: sessionId });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.result,
          timestamp: new Date().toISOString()
        }]);
      }
      if (onSessionChange && sessionId) onSessionChange(sessionId);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.response?.data?.detail || error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, sessionId, isStudentModeActive, studentTopic, studentLevel, onSessionChange]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;
    setIsUploading(true);
    setUploadMode(null);
    const url = urlInput.trim();
    setUrlInput('');

    setMessages(prev => [...prev, {
      role: 'user', content: `[Ingesting URL: ${url}]`, timestamp: new Date().toISOString(), isUpload: true
    }]);

    try {
      const res = await api.post('/upload-url', { url, session_id: sessionId });
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.data.message, timestamp: new Date().toISOString(), isUploadResponse: true
      }]);
      fetchSources();
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: `URL ingestion failed: ${e.response?.data?.detail || e.message}`, timestamp: new Date().toISOString(), isError: true
      }]);
    } finally {
      setIsUploading(false);
    }
  }, [urlInput, sessionId, fetchSources]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    
    setIsUploading(true);
    setUploadMode(null);
    setUploadingLabel(file.name);

    setMessages(prev => [...prev, {
      role: 'user',
      content: `[Uploaded ${isImage ? 'image' : 'PDF'}: ${file.name}]`,
      timestamp: new Date().toISOString(),
      isUpload: true
    }]);

    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);

    const endpoint = isImage ? '/upload-image' : '/upload-pdf';

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.message,
        timestamp: new Date().toISOString(),
        isUploadResponse: true
      }]);
      fetchSources();
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Upload failed: ${e.response?.data?.detail || e.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsUploading(false);
      setUploadingLabel('');
    }
  }, [sessionId, fetchSources]);

  const quickActions = useMemo(() => [
    { icon: BookOpen, label: 'Explain', prompt: 'Explain the key concepts from my materials.' },
    { icon: Brain, label: 'Summarize', prompt: 'Summarize the main points from what I uploaded.' },
    { icon: HelpCircle, label: 'Quiz me', prompt: 'Give me a short quiz based on my materials.' }
  ], []);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-4 sm:px-8 py-3 lg:py-5 shrink-0 z-10 w-full border-b border-mentor-border/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isStudentModeActive ? (
              <div className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Mode: Interactive Student</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-mentor-cyan animate-pulse"></div>
                <span className="text-[10px] font-bold text-mentor-textMuted uppercase tracking-widest">Cognitive Link Active</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button onClick={onOpenSessionHistory} className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-2 text-xs font-bold text-mentor-textMuted hover:text-white bg-[#1A2235]/50 border border-mentor-borderLight rounded-xl transition-all shadow-sm">
              <History className="w-3.5 h-3.5" /> <span className="hidden md:inline">History</span>
            </button>
            <button onClick={onResetSession} className="flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 text-xs font-bold text-white bg-gradient-to-br from-indigo-600 to-mentor-purple border border-mentor-purple/30 rounded-xl transition-all shadow-md active:scale-95">
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Chat</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages / Initial State */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 relative custom-scrollbar leading-relaxed">
        <div className="max-w-4xl mx-auto pb-4">
          {loadingMessages ? (
            <div className="flex justify-center py-20 text-mentor-textMuted text-sm font-semibold">
              <Loader2 className="w-5 h-5 animate-spin mr-3 text-mentor-purple" /><span>Retrieving Neural History...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="animate-fade-in mt-12 text-center">
              {isStudentModeActive ? (
                 <div className="max-w-md mx-auto">
                    <GraduationCap className="w-16 h-16 text-indigo-400 mx-auto mb-6 opacity-80" />
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Be My Student</h3>
                    <p className="text-mentor-textMuted text-xs sm:text-sm mb-6 sm:mb-8">Choose a topic and I'll act as a student learning from you. Teach me well!</p>
                    <form onSubmit={handleStartShadowMode} className="space-y-4 text-left bg-[#1A2235]/50 p-5 sm:p-6 rounded-2xl border border-mentor-borderLight shadow-xl">
                       <div>
                          <label className="text-[10px] font-bold text-mentor-textMuted uppercase tracking-widest mb-2 block">What should I learn?</label>
                          <input 
                            type="text" 
                            placeholder="e.g. React Hooks, Quantum Physics, Cooking..." 
                            value={studentTopic}
                            onChange={e => setStudentTopic(e.target.value)}
                            className="w-full bg-[#0F172A] border border-mentor-borderLight rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-mentor-textMuted uppercase tracking-widest mb-2 block">Student Level</label>
                          <div className="flex gap-2">
                             {['beginner', 'intermediate'].map(l => (
                               <button 
                                 key={l}
                                 type="button"
                                 onClick={() => setStudentLevel(l)}
                                 className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${studentLevel === l ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-[#0F172A] border-mentor-borderLight text-mentor-textMuted hover:border-indigo-500/50'}`}
                               >
                                 {l}
                               </button>
                             ))}
                          </div>
                       </div>
                       <button 
                        type="submit"
                        disabled={!studentTopic.trim() || isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
                       >
                         {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Start Lesson</>}
                       </button>
                    </form>
                 </div>
              ) : (
                <>
                  <Bot className="w-16 h-16 text-mentor-purple mx-auto mb-6 opacity-50" />
                  <h3 className="text-2xl font-bold text-white mb-2">System Ready</h3>
                  <p className="text-mentor-textMuted max-w-md mx-auto mb-8 text-sm">Upload documents or ask a question to begin your learning session.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {["Explain my notes", "Summarize recent uploads", "Generate a quiz", "Create a roadmap"].map((q, i) => (
                      <button key={i} onClick={() => handleSendMessage(q)} className="text-left px-5 py-4 bg-[#1A2235]/50 border border-mentor-borderLight rounded-xl hover:border-mentor-purple hover:bg-mentor-purple/10 text-sm text-mentor-text transition-all group relative overflow-hidden">
                        <span className="relative z-10">{q}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-mentor-purple/0 to-mentor-purple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
                <div className={`flex items-start space-x-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${msg.role === 'user' ? 'bg-mentor-purple text-white' : 'bg-[#121926] border border-[#3E4C6B] text-indigo-400'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : isStudentModeActive ? <GraduationCap className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`rounded-2xl px-5 py-4 shadow-lg leading-relaxed ${msg.role === 'user' ? 'bg-[#2E2055] text-white' : 'bg-[#1A2235] border border-mentor-borderLight text-mentor-text'}`}>
                    {msg.role === 'assistant' ? <MessageContent content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                    {msg.isUploadResponse && (
                      <div className="mt-4 pt-3 border-t border-mentor-border/30 flex flex-wrap gap-1.5 sm:gap-2">
                        {quickActions.map(qa => <QuickAction key={qa.label} icon={qa.icon} label={qa.label} onClick={qa.isActionBtn ? qa.action : () => handleSendMessage(qa.prompt)} />)}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 opacity-40">
                       <p className="text-[9px] uppercase tracking-tighter">{msg.role === 'assistant' ? (isStudentModeActive ? 'Interactive Student' : 'AI Mentor') : 'Knowledge Seeker'}</p>
                       <p className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 sm:px-8 py-4 lg:py-6 shrink-0 relative z-20">
        <div className="max-w-4xl mx-auto">
          {!isStudentModeActive && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 justify-center sm:justify-start">
               {quickActions.map(qa => (
                 <QuickAction key={qa.label} icon={qa.icon} label={qa.label} onClick={qa.isActionBtn ? qa.action : () => handleSendMessage(qa.prompt)} />
               ))}
            </div>
          )}
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <div className="relative flex items-end space-x-2 sm:space-x-3 bg-[#121926]/90 border border-mentor-border group-focus-within:border-mentor-purple/50 rounded-2xl p-1.5 sm:p-2 transition-all backdrop-blur-xl shadow-panel">
              {!isStudentModeActive && (
                <div className="flex space-x-0.5 sm:space-x-1 mb-1 ml-0.5 sm:ml-1">
                  <button onClick={() => setUploadMode('file')} className="p-1.5 sm:p-2 text-mentor-textMuted hover:text-white hover:bg-white/5 rounded-xl transition-all" title="Upload PDF">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button onClick={() => setUploadMode('url')} className="p-1.5 sm:p-2 text-mentor-textMuted hover:text-white hover:bg-white/5 rounded-xl transition-all" title="Add Link">
                    <Link2 className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm sm:text-[15px] p-2.5 sm:p-3 resize-none max-h-32 min-h-[44px] sm:min-h-[48px] placeholder:text-mentor-textMuted custom-scrollbar"
                placeholder={isStudentModeActive ? `Teach me about ${studentTopic}...` : "Ask your mentor anything..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <button
                disabled={!inputValue.trim() || isLoading}
                onClick={() => handleSendMessage()}
                className={`p-2.5 sm:p-3 rounded-xl transition-all mb-1 mr-1 ${inputValue.trim() && !isLoading ? 'bg-mentor-purple text-white shadow-lg shadow-purple/20' : 'bg-[#1A2235] text-mentor-textMuted opacity-50'}`}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Upload Modals / Tooltips */}
          {uploadMode === 'url' && (
            <div className="absolute bottom-full left-4 sm:left-8 mb-4 w-[calc(100%-2rem)] sm:w-96 bg-[#1A2235] border border-mentor-border rounded-2xl p-4 shadow-2xl animate-fade-in z-30">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><Link2 size={14} className="text-mentor-cyan" /> Add Knowledge Link</span>
                <button onClick={() => setUploadMode(null)} className="text-mentor-textMuted hover:text-white"><X size={16} /></button>
              </div>
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-[#0F172A] border border-mentor-borderLight rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-mentor-cyan" 
                  placeholder="https://example.com/article" 
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                />
                <button onClick={handleUrlSubmit} className="bg-mentor-cyan text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-white transition-all">Add</button>
              </div>
            </div>
          )}

          {uploadMode === 'file' && (
             <div className="absolute bottom-full left-4 sm:left-8 mb-4 w-[calc(100%-2rem)] sm:w-96 bg-[#1A2235] border border-mentor-border rounded-2xl p-4 shadow-2xl animate-fade-in z-30">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><FileText size={14} className="text-mentor-purple" /> Upload Document</span>
                  <button onClick={() => setUploadMode(null)} className="text-mentor-textMuted hover:text-white"><X size={16} /></button>
                </div>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={e => handleFileUpload(e.target.files[0])}
                />
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full border-2 border-dashed border-mentor-borderLight hover:border-mentor-purple rounded-xl p-8 flex flex-col items-center gap-2 group transition-all"
                >
                   <ImageIcon className="w-8 h-8 text-mentor-textMuted group-hover:text-mentor-purple transition-colors" />
                   <span className="text-[10px] font-bold text-mentor-textMuted group-hover:text-white uppercase tracking-widest">Select PDF or Image</span>
                </button>
             </div>
          )}

          {isUploading && (
            <div className="mt-4 flex items-center space-x-3 text-xs text-mentor-textMuted animate-pulse">
               <Loader2 className="w-3.5 h-3.5 animate-spin text-mentor-cyan" />
               <span>Digitizing {uploadingLabel || 'content'}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
