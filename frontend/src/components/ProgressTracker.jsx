// Enhanced ProgressTracker with better visuals, animations, and performance
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, MessageSquare, Target, FileText, Trophy, RefreshCw, TrendingUp } from 'lucide-react';

const ProgressTracker = ({ sessionId }) => {
  const [progress, setProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalQueries: 0,
    quizzesCompleted: 0,
    summariesGenerated: 0,
    averageScore: 0
  });

  const loadProgress = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress || []);
        calculateStats(data.progress || []);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const calculateStats = useCallback((progressData) => {
    const queries = progressData.filter(p => p.activity === 'query').length;
    const quizzes = progressData.filter(p => p.activity === 'quiz_completed');
    const summaries = progressData.filter(p => p.activity === 'summary_generated').length;
    
    const avgScore = quizzes.length > 0
      ? quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length
      : 0;

    setStats({
      totalQueries: queries,
      quizzesCompleted: quizzes.length,
      summariesGenerated: summaries,
      averageScore: avgScore.toFixed(1)
    });
  }, []);

  // Memoize activity items for performance
  const activityItems = useMemo(() => {
    return progress.slice().reverse().map((item, index) => {
      const getActivityIcon = () => {
        switch (item.activity) {
          case 'query': return <MessageSquare className="w-5 h-5 text-blue-600" />;
          case 'quiz_completed': return <Trophy className="w-5 h-5 text-purple-600" />;
          case 'quiz_generated': return <Target className="w-5 h-5 text-pink-600" />;
          case 'summary_generated': return <FileText className="w-5 h-5 text-green-600" />;
          default: return <BarChart3 className="w-5 h-5 text-gray-600" />;
        }
      };

      const getActivityLabel = () => {
        switch (item.activity) {
          case 'query': return 'Asked a Question';
          case 'quiz_completed': return 'Completed Quiz';
          case 'quiz_generated': return 'Generated Quiz';
          case 'summary_generated': return 'Generated Summary';
          default: return item.activity;
        }
      };

      return (
        <div
          key={index}
          className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all animate-fade-in border border-gray-200"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">
                {getActivityLabel()}
              </p>
              {item.score && (
                <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {item.score}%
                </span>
              )}
            </div>
            
            {item.topic && (
              <p className="text-sm text-gray-600 mt-1">Topic: {item.topic}</p>
            )}
            
            {item.query && (
              <p className="text-sm text-gray-600 mt-1 italic">
                "{item.query.substring(0, 100)}{item.query.length > 100 ? '...' : ''}"
              </p>
            )}
            
            <p className="text-xs text-gray-400 mt-2">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      );
    });
  }, [progress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <span>Learning Progress</span>
        </h2>
        <p className="text-gray-600">Track your study activities and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 text-center border-2 border-blue-200 hover:shadow-lg transition-all">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <div className="text-3xl font-bold text-blue-600">{stats.totalQueries}</div>
          <div className="text-sm text-gray-600 mt-1">Questions Asked</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 text-center border-2 border-purple-200 hover:shadow-lg transition-all">
          <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
          <div className="text-3xl font-bold text-purple-600">{stats.quizzesCompleted}</div>
          <div className="text-sm text-gray-600 mt-1">Quizzes Completed</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 text-center border-2 border-green-200 hover:shadow-lg transition-all">
          <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <div className="text-3xl font-bold text-green-600">{stats.summariesGenerated}</div>
          <div className="text-sm text-gray-600 mt-1">Summaries Generated</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 text-center border-2 border-yellow-200 hover:shadow-lg transition-all">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
          <div className="text-3xl font-bold text-yellow-600">{stats.averageScore}%</div>
          <div className="text-sm text-gray-600 mt-1">Average Score</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-lg flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent Activities</span>
          </h3>
          <button
            onClick={loadProgress}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        {progress.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold">No activities yet</p>
            <p className="text-sm mt-2">Start learning to see your progress here!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activityItems}
          </div>
        )}
      </div>

      {/* Motivational Message */}
      {progress.length > 0 && (
        <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
          <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Keep Going!</span>
          </p>
          <p className="text-sm text-gray-600">
            You've been actively learning. Keep up the great work!
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
