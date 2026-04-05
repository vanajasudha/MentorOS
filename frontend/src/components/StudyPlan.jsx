import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, CheckCircle, Circle, Plus, Clock, ArrowRight, Loader2, Sparkles, RefreshCcw, AlertCircle } from 'lucide-react';
import api from '../services/api';

const StudyPlan = () => {
  const [plan, setPlan] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/study-plan/current');
      setPlan(res.data.plan || null);
      
      const pendingRes = await api.get('/study-plan/pending');
      setPendingTasks(pendingRes.data.pending || []);
    } catch (err) {
      console.error('Error fetching plan:', err);
      setError('Failed to load study plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      await api.post('/study-plan/generate', { num_days: 7 });
      await fetchPlan();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkDone = async (dayNum, taskId) => {
    try {
      const res = await api.patch('/study-plan/task', { day_num: dayNum, task_id: taskId });
      if (res.data.plan) {
         setPlan(res.data.plan);
         // Refresh pending separately or derive from plan
         const pendingRes = await api.get('/study-plan/pending');
         setPendingTasks(pendingRes.data.pending || []);
      }
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-mentor-purple" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="mb-6 sm:mb-10 relative z-10 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3"><Calendar className="text-mentor-purple" /> Study Roadmap</h2>
          <p className="text-mentor-textMuted text-xs sm:text-sm mt-1">Your personalized learning path, synced across all sessions.</p>
        </div>
        {plan && (
          <button 
            onClick={handleGenerate} 
            disabled={generating} 
            className="flex items-center gap-2 px-4 py-2 bg-[#1A2235] border border-mentor-border text-mentor-textMuted hover:text-white rounded-xl transition-all text-[10px] sm:text-xs font-bold shadow-sm"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            <span>Refresh Roadmap</span>
          </button>
        )}
      </div>

      {!plan ? (
        <div className="bg-[#1e293b]/50 border border-mentor-border text-center rounded-3xl p-20 backdrop-blur-xl">
          <Sparkles className="w-16 h-16 text-mentor-purple mx-auto mb-6 opacity-50" />
          <h3 className="text-2xl font-bold text-white mb-4">No Active Roadmap</h3>
          <p className="text-mentor-textMuted mb-8 max-w-md mx-auto">Generate a 7-day roadmap based on your learning history and goals.</p>
          <button onClick={handleGenerate} disabled={generating} className="bg-mentor-purple text-white px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-3 mx-auto">
            {generating ? <Loader2 className="animate-spin" /> : <Plus />}
            {generating ? 'Generating...' : 'Create Roadmap'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
           {/* Notices Section */}
            {pendingTasks.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 sm:p-6 rounded-2xl flex items-start gap-3 sm:gap-4 shadow-lg shadow-amber-500/5">
                <Clock className="text-amber-400 w-5 h-5 sm:w-6 sm:h-6 mt-1 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-amber-400 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] mb-1">Attention Required</h4>
                  <p className="text-xs sm:text-sm text-mentor-textMuted mb-3 font-medium">You have {pendingTasks.length} pending tasks from today or earlier.</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-white">
                    {pendingTasks.slice(0, 2).map(pt => (
                      <span key={pt.id} className="text-[9px] sm:text-[10px] bg-[#121926] border border-amber-500/20 px-2 py-1 rounded italic truncate max-w-[120px] sm:max-w-none">
                        Phase {pt.day_num}: {pt.text}
                      </span>
                    ))}
                    {pendingTasks.length > 2 && <span className="text-[9px] sm:text-[10px] text-mentor-textMuted self-center">+{pendingTasks.length - 2} more</span>}
                  </div>
                </div>
              </div>
            )}

           <div className="grid gap-6">
             {plan.days.map((day, idx) => {
                const dayTasks = day.tasks || [];
                const allDone = dayTasks.length > 0 && dayTasks.every(t => t.completed);
                return (
                  <div key={idx} className={`bg-[#1e293b]/50 border rounded-3xl p-6 sm:p-8 backdrop-blur-xl transition-all ${allDone ? 'border-emerald-500/30' : 'border-mentor-border'} hover:border-mentor-purple/50 shadow-panel`}>
                     <div className="flex justify-between items-start mb-6 sm:mb-8">
                       <div>
                         <span className="text-[9px] sm:text-[10px] font-black text-mentor-purple uppercase tracking-[0.2em] mb-1 block">Phase {day.day}</span>
                         <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                       </div>
                       {allDone ? (
                         <div className="bg-emerald-500/10 text-emerald-400 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">COMPLETE</div>
                       ) : (
                         <div className="bg-mentor-purple/10 text-mentor-purple px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black border border-mentor-purple/20">ACTIVE</div>
                       )}
                     </div>
                     
                     <div className="space-y-3">
                       {dayTasks.length > 0 ? (
                         dayTasks.map(task => (
                            <div key={task.id} className={`group flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${task.completed ? 'bg-[#121926]/50 border-emerald-500/10 opacity-60' : 'bg-[#1A2235] border-[#3E4C6B] hover:border-mentor-purple/40 shadow-sm'}`}>
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                 <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex flex-shrink-0 items-center justify-center transition-all ${task.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#121926] text-mentor-purple'}`}>
                                   {task.type === 'quiz' ? <Sparkles size={16} /> : task.type === 'learn' ? <ArrowRight size={16} /> : <Circle size={16} />}
                                 </div>
                                 <div className="min-w-0">
                                   <span className={`text-sm sm:text-[15px] block leading-tight truncate max-w-[150px] sm:max-w-none ${task.completed ? 'text-mentor-textMuted line-through' : 'text-white font-semibold'}`}>
                                     {task.title || task.text}
                                   </span>
                                   <span className="text-[9px] sm:text-[10px] text-mentor-textMuted uppercase tracking-widest mt-1 block">{task.type || 'task'}</span>
                                 </div>
                              </div>
                              <button 
                                 onClick={() => handleMarkDone(day.day, task.id)}
                                 className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-shrink-0 items-center justify-center transition-all ${task.completed ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'bg-[#1e293b] text-mentor-textMuted hover:bg-mentor-purple hover:text-white border border-[#3E4C6B] hover:border-transparent active:scale-95'}`}
                                 aria-label={task.completed ? "Mark as Incomplete" : "Mark as Done"}
                              >
                                {task.completed ? <CheckCircle size={20} sm:size={22} strokeWidth={2.5} /> : <Circle size={20} sm:size={22} />}
                              </button>
                            </div>
                         ))
                       ) : (
                         <div className="bg-[#121926]/50 border border-dashed border-mentor-border rounded-2xl p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-mentor-textMuted mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-bold text-mentor-textMuted mb-3 italic">Legacy roadmap entry</p>
                            <button onClick={handleGenerate} className="text-xs text-mentor-purple font-black uppercase hover:underline">Re-generate Roadmap</button>
                         </div>
                       )}
                     </div>
                  </div>
                );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
