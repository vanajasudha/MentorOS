// Enhanced QuizSection with strict interactive format, Summarize feature, and General Knowledge Fallback
import { useState, useCallback, useMemo } from 'react';
import { Target, FileText, Loader2, Trophy, Sparkles, RefreshCw, CheckCircle, Info, Globe, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const QuizSection = ({ sessionId }) => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('auto');
  const [quiz, setQuiz] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [source, setSource] = useState(null); // 'docs' or 'ai'

  const generateQuiz = useCallback(async () => {
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setQuiz(null);
    setSummary(null);
    setSource(null);
    setUserAnswers({});
    setShowResults(false);
    setCurrentQuestionIndex(0);
    try {
      const res = await api.post('/generate-quiz', {
        topic: topic.trim(),
        num_questions: numQuestions,
        session_id: sessionId,
        difficulty: difficulty === 'auto' ? null : difficulty
      });
      setQuiz(res.data.quiz);
      setActiveDifficulty(res.data.difficulty);
      setSource(res.data.source);
    } catch (error) {
      alert(error.response?.data?.detail || 'Error generating quiz.');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, numQuestions, sessionId, difficulty, isGenerating]);

  const generateSummary = useCallback(async () => {
    if (!topic.trim() || isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    setQuiz(null);
    setSummary(null);
    setSource(null);
    try {
      const res = await api.post('/generate-summary', { topic: topic.trim() });
      setSummary(res.data.summary);
      setSource(res.data.source);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to generate summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [topic, isGeneratingSummary]);

  const handleAnswerSelect = (questionIndex, answer) => {
    if (showResults) return;
    const letter = answer.charAt(0);
    setUserAnswers(prev => ({ ...prev, [questionIndex]: letter }));
  };

  const submitQuiz = useCallback(async () => {
    if (!quiz || Object.keys(userAnswers).length !== quiz.length) return;
    const correct = quiz.filter((q, index) => userAnswers[index] === q.correct_answer).length;
    setShowResults(true);
    try {
      await api.post('/quiz/submit', {
        session_id: sessionId,
        topic: topic,
        score: correct,
        total_questions: quiz.length,
        answers: Object.entries(userAnswers).map(([idx, ans]) => ({
          question: quiz[idx].question,
          selected: ans,
          correct: quiz[idx].correct_answer
        }))
      });
    } catch (err) {
      console.error('Failed to submit quiz', err);
    }
  }, [quiz, userAnswers, sessionId, topic]);

  const scoreStats = useMemo(() => {
    if (!quiz || !showResults) return null;
    const correct = quiz.filter((q, index) => userAnswers[index] === q.correct_answer).length;
    return { correct, total: quiz.length, percentage: Math.round((correct / quiz.length) * 100) };
  }, [quiz, userAnswers, showResults]);

  const currentQuestion = quiz?.[currentQuestionIndex];

  const SourceBadge = () => {
    if (!source) return null;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6 animate-fade-in ${source === 'docs' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
        {source === 'docs' ? (
          <><ShieldCheck size={12} className="shrink-0" /> Using your uploaded materials</>
        ) : (
          <><Globe size={12} className="shrink-0" /> Using AI general knowledge for this topic</>
        )}
      </div>
    );
  };

  // Simple parser for the structured summary
  const renderSummaryContent = () => {
    if (!summary) return null;
    const sections = summary.split(/(?=\d\.\s)/);
    return (
      <div className="mt-8 space-y-6 animate-fade-in">
        <SourceBadge />
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-mentor-purple" /> AI Summary</h3>
          <button onClick={generateSummary} className="flex items-center gap-2 text-xs font-bold text-mentor-textMuted hover:text-white transition-all">
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {sections.map((section, idx) => {
            const lines = section.trim().split('\n');
            const title = lines[0].replace(/^\d\.\s*/, '').replace(/[:*]/g, '').trim();
            const content = lines.slice(1).filter(l => l.trim().length > 0);
            
            if (!title) return null;

            return (
              <div key={idx} className="bg-[#121926] border border-mentor-borderLight rounded-2xl p-6 shadow-sm hover:border-mentor-purple/30 transition-all">
                <h4 className="text-mentor-purple font-black uppercase text-[10px] tracking-[0.2em] mb-3">{title}</h4>
                <div className="space-y-2">
                  {content.map((line, lidx) => (
                    <div key={lidx} className="flex items-start gap-3 text-[14px] text-mentor-text">
                      <div className="w-1.5 h-1.5 rounded-full bg-mentor-purple/40 mt-2 shrink-0"></div>
                      <p>{line.replace(/^[*-]\s*/, '').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-mentor-border rounded-3xl p-5 sm:p-8 animate-fade-in relative overflow-hidden shadow-panel">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <Target className="text-mentor-purple" /> Assessment
        </h2>
        <p className="text-mentor-textMuted text-xs sm:text-sm mt-1">Test your knowledge or generate structured revision notes from any topic.</p>
      </div>

      {!quiz && !summary && (
        <div className="space-y-6">
          <input 
            type="text" 
            placeholder="Topic (e.g. React Hooks)" 
            value={topic} 
            onChange={e => setTopic(e.target.value)}
            className="w-full bg-[#121926] border border-mentor-border rounded-2xl p-4 text-white outline-none focus:border-mentor-purple transition-all"
          />
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="flex-1 bg-[#121926] border border-mentor-border rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:border-mentor-purple transition-all">
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
            </select>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="flex-1 bg-[#121926] border border-mentor-border rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:border-mentor-purple transition-all">
              <option value="auto">Adaptive</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
            <button 
              onClick={generateQuiz} 
              disabled={isGenerating || isGeneratingSummary || !topic.trim()} 
              className="bg-mentor-purple hover:bg-mentor-purple/90 text-white font-bold py-3.5 sm:py-4 rounded-2xl flex justify-center items-center gap-3 transition-all transform active:scale-[0.98] shadow-glow-purple"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <><Sparkles className="w-5 h-5"/> Start Evaluation</>}
            </button>
            <button 
              onClick={generateSummary} 
              disabled={isGenerating || isGeneratingSummary || !topic.trim()}
              className="bg-[#1A2235] border border-[#3E4C6B] hover:border-mentor-purple text-white font-bold py-3.5 sm:py-4 rounded-2xl flex justify-center items-center gap-3 transition-all transform active:scale-[0.98]"
            >
              {isGeneratingSummary ? <Loader2 className="animate-spin" /> : <><FileText className="w-5 h-5 text-indigo-400"/> Summarize Document</>}
            </button>
          </div>
        </div>
      )}

      {quiz && !showResults && (
        <div className="animate-fade-in">
           <SourceBadge />
           <div className="mb-4 flex justify-between items-center">
             <span className="text-xs font-bold text-mentor-purple uppercase tracking-widest">Question {currentQuestionIndex + 1}/{quiz.length}</span>
             <div className="h-1 flex-1 mx-4 bg-[#121926] rounded-full overflow-hidden">
                <div className="h-full bg-mentor-purple transition-all" style={{width: `${((currentQuestionIndex+1)/quiz.length)*100}%`}}></div>
             </div>
           </div>
           <p className="text-lg text-white font-medium mb-8">{currentQuestion.question}</p>
           <div className="space-y-3">
             {currentQuestion.options.map(opt => (
               <button 
                 key={opt} 
                 onClick={() => handleAnswerSelect(currentQuestionIndex, opt)}
                 className={`w-full text-left p-4 rounded-2xl border transition-all ${userAnswers[currentQuestionIndex] === opt.charAt(0) ? 'bg-mentor-purple/20 border-mentor-purple text-white' : 'bg-[#121926] border-mentor-border text-mentor-textMuted hover:border-mentor-purple'}`}
               >
                 {opt}
               </button>
             ))}
           </div>
           <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
              <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex-1))} disabled={currentQuestionIndex===0} className="order-2 sm:order-1 px-6 py-2.5 sm:py-2 border border-mentor-border rounded-xl text-white disabled:opacity-30 transition-all hover:bg-white/5">Back</button>
              {currentQuestionIndex === quiz.length - 1 ? (
                <button onClick={submitQuiz} disabled={Object.keys(userAnswers).length < quiz.length} className="order-1 sm:order-2 bg-emerald-500 hover:bg-emerald-400 px-8 py-3 sm:py-2 rounded-xl text-white font-bold disabled:opacity-30 transition-all shadow-lg active:scale-95">Submit</button>
              ) : (
                <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex+1)} disabled={!userAnswers[currentQuestionIndex]} className="order-1 sm:order-2 bg-mentor-purple hover:bg-mentor-purple/90 px-8 py-3 sm:py-2 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95">Next</button>
              )}
           </div>
        </div>
      )}

      {showResults && (
        <div className="animate-fade-in text-center">
           <Trophy className="w-16 h-16 text-mentor-purple mx-auto mb-4" />
           <p className="text-5xl font-black text-white mb-2">{scoreStats.percentage}%</p>
           <p className="text-mentor-textMuted mb-8">You answered {scoreStats.correct} out of {scoreStats.total} correctly.</p>
           <div className="flex justify-center gap-4">
             <button onClick={() => {setQuiz(null); setShowResults(false); setSource(null);}} className="bg-mentor-purple px-8 py-3 rounded-xl text-white font-bold transform active:scale-[0.98] transition-all">Try Another</button>
             <button onClick={generateSummary} className="bg-[#1A2235] border border-[#3E4C6B] px-8 py-3 rounded-xl text-white font-bold flex items-center gap-2 transform active:scale-[0.98] transition-all"><FileText size={18} className="text-indigo-400" /> Get Summary</button>
           </div>
        </div>
      )}

      {summary && renderSummaryContent()}
      
      {summary && (
        <div className="mt-8 pt-8 border-t border-mentor-border flex justify-center">
          <button onClick={() => {setSummary(null); setQuiz(null); setSource(null);}} className="text-sm font-bold text-mentor-textMuted hover:text-white transition-all uppercase tracking-widest flex items-center gap-2">
            <RefreshCw size={14} /> Back to Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizSection;
