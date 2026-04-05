import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { 
  MessageSquare, GraduationCap, BarChart3, WifiOff, X, 
  History, Sparkles, Menu, ChevronLeft, Calendar, 
  ShieldAlert, Power, Activity, LogOut, User
} from 'lucide-react';

import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';

import ChatBox from './components/ChatBox';
import QuizSection from './components/QuizSection';
import ProgressTracker from './components/ProgressTracker';
import SessionHistory from './components/SessionHistory';
import StudyPlan from './components/StudyPlan';
import api from './services/api';

function MainLayout() {
  const { user, logout } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionHistoryOpen, setSessionHistoryOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSessionHistory = useCallback(() => {
    setSessionHistoryOpen(prev => !prev);
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const response = await api.get('/health', { timeout: 3000 });
      if (response.status === 200) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 15000);
    return () => clearInterval(interval);
  }, [checkBackendStatus]);

  // Load last session on mount
  useEffect(() => {
    const fetchLastSession = async () => {
      try {
        const res = await api.get('/chat/sessions');
        if (res.data.length > 0) {
          setSessionId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      }
    };
    fetchLastSession();
  }, []);

  const loadSessionInfo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await api.get(`/chat/sessions/${sessionId}`);
      setSessionInfo(response.data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [sessionId]);

  const handleLoadSession = useCallback((newSessionId) => {
    setSessionId(newSessionId);
    setSessionInfo(null);
    setMobileMenuOpen(false);
  }, []);

  const resetSession = useCallback(async () => {
     try {
       const res = await api.post('/chat/sessions', { title: 'New Chat' });
       setSessionId(res.data.session_id);
       setSessionInfo(null);
     } catch (err) {
       console.error('Failed to create session', err);
     }
  }, []);

  const navItems = useMemo(() => [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'quiz', label: 'Quiz', icon: GraduationCap },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'plan', label: 'Study Plan', icon: Calendar },
    { id: 'student', label: 'Be My Student', icon: User },
  ], []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen-safe w-full flex bg-mentor-bg text-mentor-text overflow-hidden relative font-sans">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:flex h-full bg-[#121826]/95 lg:bg-[#121826]/80 
        backdrop-blur-xl shadow-panel flex flex-col border-r border-mentor-border transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b border-mentor-border relative">
          <div className="flex items-center space-x-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-mentor-purple rounded-xl blur-md opacity-50"></div>
              <div className="relative bg-[#1A2235] border border-mentor-purple/30 p-2.5 rounded-xl shadow-glow-purple">
                <Sparkles className="w-5 h-5 text-mentor-purple" />
              </div>
            </div>
            { (sidebarOpen || mobileMenuOpen) && (
              <div className="animate-fade-in flex-1 overflow-hidden">
                <h1 className="text-lg font-bold font-display text-white truncate tracking-tight">MentorOS</h1>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-1/2 -right-3.5 transform -translate-y-1/2 w-7 h-7 bg-[#1A2235] border border-mentor-border hover:border-mentor-purple rounded-full hidden lg:flex items-center justify-center text-mentor-textMuted transition-all shadow-lg z-40"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4 ml-[-2px]" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* User Info (Compact) */}
        {(sidebarOpen || mobileMenuOpen) && (
          <div className="px-6 py-4 flex items-center space-x-3 border-b border-mentor-border">
            <div className="w-10 h-10 rounded-full bg-mentor-purple/20 border border-mentor-purple/30 flex items-center justify-center text-mentor-purple font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-mentor-textMuted truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-5 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center ${(sidebarOpen || mobileMenuOpen) ? 'justify-start space-x-4 px-4' : 'justify-center px-0'} py-3.5 rounded-xl transition-all duration-300 group relative ${isActive
                  ? 'bg-[#1E293B] border-l-2 border-mentor-purple scale-[1.02]'
                  : 'text-mentor-textMuted hover:text-white hover:bg-[#1A2235]/50 border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-mentor-purple' : 'group-hover:text-mentor-text'}`} />
                {(sidebarOpen || mobileMenuOpen) && <span className="font-medium tracking-wide">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Section Separator */}
        <div className="px-5 py-2">
          <div className="h-px bg-mentor-border"></div>
        </div>

        {/* Logout Button */}
        <div className="p-4 lg:p-5">
           <button 
             onClick={handleLogout}
             className={`w-full flex items-center ${(sidebarOpen || mobileMenuOpen) ? 'justify-start space-x-4 px-4' : 'justify-center px-0'} py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all`}
           >
             <LogOut className="w-5 h-5" />
             {(sidebarOpen || mobileMenuOpen) && <span className="font-medium">Logout</span>}
           </button>
        </div>

        {/* Backend Status */}
        <div className="p-4 lg:p-5 pt-0">
          <div className={`flex items-center ${(sidebarOpen || mobileMenuOpen) ? 'justify-start space-x-3 px-4' : 'justify-center px-1'} py-3 rounded-xl transition-all border bg-mentor-success/10 text-mentor-success border-mentor-success/20`}>
            <div className="w-2 h-2 rounded-full bg-mentor-success shadow-sm"></div>
            {(sidebarOpen || mobileMenuOpen) && <span className="text-[10px] font-bold uppercase tracking-wider">{backendStatus === 'connected' ? 'MENTOR ACTIVE' : 'AI READY'}</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-transparent relative z-20">
        <header className="h-16 lg:h-20 px-4 lg:px-8 border-b border-mentor-border bg-[#121826]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-mentor-textMuted bg-[#1A2235] border border-mentor-border rounded-xl"><Menu className="w-5 h-5" /></button>
            <div className="flex flex-col ml-0 sm:ml-2">
              <h2 className="text-sm sm:text-lg font-bold text-white uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">{activeTab ? navItems.find(i => i.id === activeTab)?.label : 'Dashboard'}</h2>
              <span className="text-[8px] sm:text-[10px] text-mentor-textMuted uppercase tracking-widest font-black truncate">Secure Active</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
             <button onClick={toggleSessionHistory} className="bg-[#1A2235] border border-mentor-borderLight text-mentor-textMuted hover:text-white p-2 sm:p-2.5 rounded-xl transition-all shadow-sm"><History className="w-4 h-4" /></button>
             {sessionId && <button onClick={() => setSessionId(null)} className="lg:hidden bg-red-500/10 border border-red-500/20 text-red-400 p-2 sm:p-2.5 rounded-xl shadow-sm"><X className="w-4 h-4" /></button>}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden relative">
          {!activeTab ? (
             <div className="h-full flex items-center justify-center p-8">
               <div className="text-center">
                 <Power className="w-20 h-20 text-mentor-purple mx-auto mb-6 animate-pulse" />
                 <h1 className="text-4xl font-black text-white mb-4 italic">Initialize Module</h1>
                 <button onClick={() => setActiveTab('chat')} className="bg-mentor-purple text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform">Get Started</button>
               </div>
             </div>
          ) : (
            <>
              {activeTab === 'chat' && <ChatBox sessionId={sessionId} onSessionChange={handleLoadSession} onOpenSessionHistory={toggleSessionHistory} onResetSession={resetSession} />}
              {activeTab === 'quiz' && <div className="h-full overflow-y-auto p-4 lg:p-8 custom-scrollbar"><QuizSection sessionId={sessionId} /></div>}
              {activeTab === 'progress' && <div className="h-full overflow-y-auto p-4 lg:p-8 custom-scrollbar"><ProgressTracker /></div>}
              {activeTab === 'plan' && <div className="h-full overflow-y-auto p-4 lg:p-8 custom-scrollbar"><StudyPlan /></div>}
              {activeTab === 'student' && <ChatBox sessionId={sessionId} onSessionChange={handleLoadSession} onOpenSessionHistory={toggleSessionHistory} onResetSession={resetSession} initialMode="shadow" />}
            </>
          )}
        </main>
      </div>

      <SessionHistory isOpen={sessionHistoryOpen} onClose={() => setSessionHistoryOpen(false)} onLoadSession={handleLoadSession} currentSessionId={sessionId} onNewSession={resetSession} />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
