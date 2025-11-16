// Main App component with modern dark sidebar, premium design, and clean UI
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, Upload, GraduationCap, BarChart3, Wifi, WifiOff, RefreshCw, X, History, Sparkles, Menu, ChevronLeft } from 'lucide-react';
import ChatBox from './components/ChatBox';
import FileUpload from './components/FileUpload';
import QuizSection from './components/QuizSection';
import ProgressTracker from './components/ProgressTracker';
import SessionHistory from './components/SessionHistory';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionHistoryOpen, setSessionHistoryOpen] = useState(false);

  const toggleSessionHistory = useCallback(() => {
    setSessionHistoryOpen(prev => !prev);
  }, []);

  // Define functions before useEffect
  const generateSessionId = useCallback(() => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('http://localhost:8000/', { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setBackendStatus('disconnected');
      }
    }
  }, []);

  // Generate or retrieve session ID
  useEffect(() => {
    let storedSessionId = localStorage.getItem('ai_mentor_session_id');
    if (!storedSessionId) {
      storedSessionId = generateSessionId();
      localStorage.setItem('ai_mentor_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);
    
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 15000);
    return () => clearInterval(interval);
  }, [checkBackendStatus, generateSessionId]);

  const handleUploadSuccess = useCallback((data) => {
    console.log('Upload successful:', data);
  }, []);

  const loadSessionInfo = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [sessionId]);

  const resetSession = useCallback(() => {
    const newSessionId = generateSessionId();
    localStorage.setItem('ai_mentor_session_id', newSessionId);
    setSessionId(newSessionId);
    setSessionInfo(null);
  }, [generateSessionId]);

  const handleLoadSession = useCallback((newSessionId) => {
    if (newSessionId) {
      localStorage.setItem('ai_mentor_session_id', newSessionId);
      setSessionId(newSessionId);
      setSessionInfo(null);
    } else {
      resetSession();
    }
  }, [resetSession]);

  // Navigation items with proper icons
  const navItems = useMemo(() => [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'quiz', label: 'Quiz', icon: GraduationCap },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
  ], []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Left Sidebar - Dark Theme */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col border-r border-slate-700/50 transition-all duration-300 ease-in-out`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50 relative">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-75"></div>
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="text-xl font-bold font-display bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  AI Course Mentor
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">Learning Companion</p>
              </div>
            )}
          </div>
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-lg z-10"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-start space-x-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {sidebarOpen && (
                  <span className={`font-medium ${isActive ? 'font-semibold' : ''} animate-fade-in`}>{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Section Separator */}
        <div className="px-4 py-2">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
        </div>

        {/* Backend Status */}
        <div className="p-4 border-t border-slate-700/50">
          <div className={`flex items-center ${sidebarOpen ? 'justify-start space-x-2.5 px-4' : 'justify-center px-2'} py-2.5 rounded-lg transition-all ${
            backendStatus === 'connected' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : backendStatus === 'checking'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
          title={!sidebarOpen ? (backendStatus === 'connected' ? 'Connected' : backendStatus === 'checking' ? 'Checking...' : 'Offline') : ''}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              backendStatus === 'connected' 
                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' 
                : backendStatus === 'checking'
                ? 'bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse'
                : 'bg-red-400 shadow-lg shadow-red-400/50'
            }`}></div>
            {backendStatus === 'connected' ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {sidebarOpen && (
              <span className="text-xs font-medium animate-fade-in">
                {backendStatus === 'connected' 
                  ? 'Connected' 
                  : backendStatus === 'checking'
                  ? 'Checking...'
                  : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {/* Backend Disconnected Warning */}
        {backendStatus === 'disconnected' && (
          <div className="mx-6 mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-fade-in shadow-soft">
            <div className="flex items-start space-x-3">
              <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-semibold">⚠️ Backend Disconnected</p>
                <p className="text-red-700 text-sm mt-1">
                  Please make sure the backend server is running on http://localhost:8000
                </p>
                <p className="text-red-600 text-xs mt-2">
                  Run: <code className="bg-red-100 px-2 py-1 rounded">uvicorn backend.app:app --reload</code>
                </p>
              </div>
              <button
                onClick={checkBackendStatus}
                className="text-red-600 hover:text-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatBox 
              sessionId={sessionId} 
              onLoadSessionInfo={loadSessionInfo}
              onResetSession={resetSession}
              onSessionChange={handleLoadSession}
              onOpenSessionHistory={toggleSessionHistory}
            />
          )}
          
          {activeTab === 'upload' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            </div>
          )}
          
          {activeTab === 'quiz' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <QuizSection sessionId={sessionId} />
              </div>
            </div>
          )}
          
          {activeTab === 'progress' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <ProgressTracker sessionId={sessionId} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Session Info Modal */}
      {sessionInfo && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSessionInfo(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full m-4 shadow-large animate-fade-in border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 font-display">Session Information</h3>
              <button
                onClick={() => setSessionInfo(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Session ID:</p>
                <p className="text-gray-600 font-mono text-xs break-all mt-1">{sessionInfo.session_id}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Created:</p>
                <p className="text-gray-600 mt-1">{new Date(sessionInfo.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Total Activities:</p>
                <p className="text-gray-600 mt-1">{sessionInfo.total_activities || 0}</p>
              </div>
              
              {sessionInfo.progress && sessionInfo.progress.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-gray-700 mb-2">Recent Activities:</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {sessionInfo.progress.slice(-5).reverse().map((activity, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="font-semibold">{activity.activity}</p>
                        <p className="text-gray-500 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSessionInfo(null)}
              className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-medium font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Session History Sidebar */}
      <SessionHistory
        isOpen={sessionHistoryOpen}
        onClose={() => setSessionHistoryOpen(false)}
        onLoadSession={handleLoadSession}
        currentSessionId={sessionId}
        onNewSession={resetSession}
      />
    </div>
  );
}

export default App;
