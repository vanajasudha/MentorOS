// Enhanced ProgressTracker with clickable quiz history modal
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, MessageSquare, Target, FileText, Trophy, RefreshCw, TrendingUp, X, CheckCircle, XCircle, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';

const QuizAttemptModal = ({ attemptId, onClose }) => {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) return;
    const fetchAttempt = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/quiz/attempts/${attemptId}`);
        setAttempt(res.data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Attempt not found');
      } finally {
        setLoading(false);
      }
    };
    fetchAttempt();
  }, [attemptId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#1e293b] border border-mentor-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-mentor-border">
          <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-4">Review: {attempt?.topic}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-mentor-purple" /></div> : 
           error ? <div className="text-center text-red-400 p-12">{error}</div> :
           attempt?.answers?.map((q, i) => (
            <div key={i} className={`p-3 sm:p-4 rounded-xl border ${q.selected === q.correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-white text-sm sm:text-base font-medium mb-2">{i+1}. {q.question}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                <span className={q.selected === q.correct ? 'text-emerald-400' : 'text-red-400'}>Selected: {q.selected}</span>
                {q.selected !== q.correct && <span className="text-emerald-400">| Correct: {q.correct}</span>}
              </div>
            </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const ProgressTracker = () => {
  const [progress, setProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total_attempts: 0, avg_accuracy: 0, topics: [] });
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/progress');
      setStats(res.data.stats);
      setProgress(res.data.recent);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  return (
    <div className="space-y-8 animate-fade-in">
      {selectedAttemptId && <QuizAttemptModal attemptId={selectedAttemptId} onClose={() => setSelectedAttemptId(null)} />}

      <div className="bg-[#1e293b]/50 border border-mentor-border rounded-3xl p-5 sm:p-8 relative overflow-hidden backdrop-blur-xl shadow-panel">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3"><BarChart3 className="text-mentor-purple" /> Performance</h2>
          <p className="text-mentor-textMuted text-xs sm:text-sm mt-1">Track your learning trajectory and neural alignment.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-mentor-border text-center shadow-lg">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">{stats.total_attempts}</div>
            <div className="text-[10px] text-mentor-textMuted uppercase font-bold tracking-widest">Quizzes Taken</div>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-mentor-border text-center shadow-lg">
            <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">{stats.avg_accuracy}%</div>
            <div className="text-[10px] text-mentor-textMuted uppercase font-bold tracking-widest">Avg Accuracy</div>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-mentor-border text-center shadow-lg">
            <MessageSquare className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">{progress.filter(p => p.activity === 'chat').length}</div>
            <div className="text-[10px] text-mentor-textMuted uppercase font-bold tracking-widest">Neural Link Syncs</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <button onClick={loadProgress} className="p-2 hover:bg-white/5 rounded-lg border border-mentor-border"><RefreshCw className={`w-4 h-4 text-mentor-textMuted ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>

          <div className="space-y-3">
             {progress.length === 0 ? <p className="text-center text-mentor-textMuted py-20 grayscale">No neural activity recorded.</p> :
              progress.slice(0, 15).map((item, idx) => {
                const isQuiz = item.activity === 'quiz_completed';
                return (
                  <div key={idx} 
                    onClick={() => isQuiz && item.attempt_id && setSelectedAttemptId(item.attempt_id)}
                    className={`flex items-center justify-between p-4 sm:p-5 bg-[#121926]/50 border border-mentor-border rounded-2xl hover:border-mentor-purple hover:bg-mentor-purple/5 transition-all group ${isQuiz ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className={`p-2.5 sm:p-3 rounded-xl bg-[#1e293b] border border-mentor-border shadow-inner ${isQuiz ? 'text-amber-400' : 'text-indigo-400 hidden sm:flex'}`}>
                         {isQuiz ? <Trophy className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                       </div>
                       <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-0.5">
                           <p className="text-xs font-black text-mentor-purple uppercase tracking-tighter opacity-70">
                             {isQuiz ? 'Completed Quiz' : item.activity.replace('_', ' ')}
                           </p>
                         </div>
                         <p className="text-base font-bold text-white capitalize leading-tight mb-1">
                           {isQuiz ? (item.topic || 'General Assessment') : (item.topic || item.query?.substring(0, 50) || 'Active link event')}
                         </p>
                         <div className="flex items-center gap-2 text-[11px] text-mentor-textMuted font-medium">
                           {isQuiz && <><span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{item.total || 0} Questions</span> <span>•</span></>}
                           <span>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                           {isQuiz && item.attempt_id && <><span className="mx-1">•</span> <span className="text-mentor-cyan group-hover:underline">Click to Review</span></>}
                         </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {item.score !== undefined && (
                         <div className="bg-[#1e293b] border border-mentor-border px-4 py-2 rounded-xl shadow-lg">
                           <span className="text-sm font-black text-emerald-400 tabular-nums">{item.score}%</span>
                           <span className="text-[10px] ml-1 text-mentor-textMuted uppercase font-bold tracking-widest hidden sm:inline">Score</span>
                         </div>
                       )}
                       {isQuiz && <ChevronRight className="w-5 h-5 text-mentor-textMuted group-hover:text-white transition-colors" />}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
