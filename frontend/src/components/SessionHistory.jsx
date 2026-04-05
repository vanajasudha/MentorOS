// Session History Sidebar - ChatGPT-style with real titles from backend
import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Loader2, X, Clock } from 'lucide-react';
import api from '../services/api';

const SessionHistory = ({ isOpen, onClose, onLoadSession, currentSessionId, onNewSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/sessions');
      setSessions(res.data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen, loadSessions]);

  useEffect(() => {
    if (isOpen && currentSessionId) loadSessions();
  }, [currentSessionId, isOpen, loadSessions]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      setDeleting(sessionId);
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (sessionId === currentSessionId) {
        if (onNewSession) onNewSession();
        else if (onLoadSession) onLoadSession(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat');
    } finally {
      setDeleting(null);
    }
  }, [currentSessionId, onLoadSession, onNewSession]);

  const grouped = useCallback((sessions) => {
    const today = new Date().toDateString();
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    sessions.forEach(s => {
      const d = new Date(s.updated_at || s.created_at).toDateString();
      if (d === today) groups.Today.push(s);
      else groups.Earlier.push(s);
    });
    return groups;
  }, []);

  if (!isOpen) return null;
  const groups = grouped(sessions);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-[#121826]/95 backdrop-blur-2xl border-l border-mentor-border z-50 flex flex-col animate-slide-in-right">
        <div className="p-6 border-b border-mentor-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">History</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5 text-mentor-textMuted" /></button>
          </div>
          <button onClick={() => { onNewSession(); onClose(); }} className="w-full flex items-center justify-center gap-2 bg-mentor-purple text-white py-3 rounded-xl font-bold hover:bg-mentor-purple/90 transition-all">
            <Plus className="w-5 h-5" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-mentor-purple" /></div> : 
           sessions.length === 0 ? <p className="text-center text-mentor-textMuted py-12">No history found.</p> :
           ['Today', 'Earlier'].map(label => groups[label].length > 0 && (
             <div key={label} className="py-2">
               <p className="px-6 py-2 text-[10px] font-bold text-mentor-purple uppercase tracking-widest">{label}</p>
               {groups[label].map(s => (
                 <div key={s.id} onClick={() => { onLoadSession(s.id); onClose(); }} className={`group relative px-6 py-3 cursor-pointer hover:bg-white/5 border-l-2 transition-all ${s.id === currentSessionId ? 'bg-mentor-purple/10 border-mentor-purple' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                         <p className={`text-sm truncate font-medium ${s.id === currentSessionId ? 'text-white' : 'text-mentor-text'}`}>{s.title || 'New Chat'}</p>
                         <p className="text-[10px] text-mentor-textMuted flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                      <button onClick={(e) => handleDeleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 </div>
               ))}
             </div>
           ))}
        </div>
      </div>
    </>
  );
};

export default SessionHistory;
