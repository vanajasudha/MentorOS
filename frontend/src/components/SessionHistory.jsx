// Session History Sidebar - ChatGPT-style chat history panel
import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Loader2, X } from 'lucide-react';

const SessionHistory = ({ isOpen, onClose, onLoadSession, currentSessionId, onNewSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [hoveredSession, setHoveredSession] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/sessions');
      if (response.ok) {
        const data = await response.json();
        // Fetch chat titles for each session
        const sessionsWithTitles = await Promise.all(
          (data.sessions || []).map(async (session) => {
            try {
              const sessionResponse = await fetch(`http://localhost:8000/session/${session.session_id}`);
              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                const messages = sessionData.chat_messages || [];
                // Get first user message as title, or use default
                const firstUserMessage = messages.find(m => m.role === 'user');
                return {
                  ...session,
                  title: firstUserMessage?.content?.slice(0, 50) || 'New Chat',
                  message_count: messages.length
                };
              }
            } catch (e) {
              console.error('Error loading session details:', e);
            }
            return {
              ...session,
              title: 'New Chat',
              message_count: session.message_count || 0
            };
          })
        );
        setSessions(sessionsWithTitles);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  // Refresh when current session changes
  useEffect(() => {
    if (isOpen && currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId, isOpen, loadSessions]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      setDeleting(sessionId);
      const response = await fetch(`http://localhost:8000/session/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        if (sessionId === currentSessionId && onLoadSession) {
          // If current session was deleted, create a new one
          if (onNewSession) {
            onNewSession();
          } else {
            onLoadSession(null);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat');
    } finally {
      setDeleting(null);
    }
  }, [currentSessionId, onLoadSession, onNewSession]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              aria-label="Close chats"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={() => {
              if (onNewSession) {
                onNewSession();
              }
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium shadow-soft"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="ml-2 text-sm text-gray-600">Loading chats...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No previous chats</p>
              <p className="text-xs text-gray-400 mt-1">Start a conversation to create your first chat</p>
            </div>
          ) : (
            <div className="p-2">
              {sessions.map((session) => {
                const isCurrent = session.session_id === currentSessionId;
                const isHovered = hoveredSession === session.session_id;
                const isDeleting = deleting === session.session_id;
                
                return (
                  <div
                    key={session.session_id}
                    onMouseEnter={() => setHoveredSession(session.session_id)}
                    onMouseLeave={() => setHoveredSession(null)}
                    onClick={() => {
                      onLoadSession(session.session_id);
                      onClose();
                    }}
                    className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${
                      isCurrent
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${
                          isCurrent ? 'text-gray-900 font-medium' : 'text-gray-700'
                        }`}>
                          {session.title}
                        </p>
                      </div>
                      
                      {/* Delete button - show on hover */}
                      {isHovered && !isDeleting && (
                        <button
                          onClick={(e) => handleDeleteSession(session.session_id, e)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                          title="Delete chat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      {isDeleting && (
                        <div className="ml-2 p-1">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SessionHistory;
