// Enhanced QuizSection with strict interactive format: one question at a time, no answers until submission
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Target, FileText, Loader2, CheckCircle, XCircle, Trophy, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';

const QuizSection = ({ sessionId }) => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const generateQuiz = useCallback(async () => {
    if (!topic.trim() || isGenerating) return;

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsGenerating(true);
    setQuiz(null);
    setUserAnswers({});
    setShowResults(false);
    setCurrentQuestionIndex(0);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Set timeout for quiz generation (100 seconds for slower systems)
    let timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 100000); // 100 seconds

    try {
      const response = await fetch('http://localhost:8000/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          num_questions: numQuestions,
          session_id: sessionId
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      console.log('Quiz generation response received:', response.status, response.statusText);

      if (!response.ok) {
        // Try to get error message from backend
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Quiz data received:', data);
      console.log('Quiz data type:', typeof data.quiz);
      console.log('Quiz data value (first 500 chars):', typeof data.quiz === 'string' ? data.quiz.substring(0, 500) : data.quiz);
      
      // Parse the quiz response - extract JSON from text if needed
      try {
        let quizData = data.quiz;
        
        // If quiz is missing or null
        if (!quizData) {
          throw new Error('Quiz data is missing from backend response');
        }
        
        // If it's a string, try to extract JSON array from it
        if (typeof quizData === 'string') {
          // Remove markdown code blocks if present
          quizData = quizData.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/gm, '').trim();
          
          // Try to find JSON array in the string (might have extra text)
          const jsonMatch = quizData.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              quizData = JSON.parse(jsonMatch[0]);
              console.log('Parsed quiz from JSON match:', quizData);
            } catch (e) {
              console.error('Failed to parse JSON match, trying full string:', e);
              // If that fails, try parsing the whole string
              quizData = JSON.parse(quizData);
            }
          } else {
            // Try parsing the whole string
            try {
              quizData = JSON.parse(quizData);
              console.log('Parsed quiz from full string:', quizData);
            } catch (e) {
              console.error('Failed to parse quiz string:', e);
              throw new Error(`Failed to parse quiz JSON: ${e.message}`);
            }
          }
        }
        
        // Ensure it's an array
        const parsedQuiz = Array.isArray(quizData) ? quizData : [quizData];
        console.log('Parsed quiz array length:', parsedQuiz.length);
        
        // Validate we have at least one question
        if (parsedQuiz.length === 0) {
          console.error('Empty quiz array after parsing. Original data:', data);
          throw new Error('No questions found in quiz response. The backend may have returned an empty array.');
        }
        
        // Clean and normalize each question
        const cleanedQuiz = parsedQuiz.map((q, index) => {
          // Extract just the letter from correct_answer if it includes full text
          let correctAnswer = q.correct_answer || 'A';
          if (typeof correctAnswer === 'string' && correctAnswer.length > 1) {
            // Extract first letter (e.g., "A)" -> "A")
            const match = correctAnswer.match(/^([A-D])/);
            if (match) correctAnswer = match[1];
          }
          
          // Ensure options are properly formatted
          let options = q.options || [];
          if (!Array.isArray(options)) {
            options = [];
          }
          
          // Normalize options to have A), B), C), D) format
          options = options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D
            if (typeof opt === 'string') {
              // Remove existing letter prefix if present
              opt = opt.replace(/^[A-D]\)\s*/, '');
              return `${letter}) ${opt}`;
            }
            return `${letter}) ${opt}`;
          });
          
          // Clean and validate question text
          let questionText = q.question || `Question ${index + 1}`;
          // Remove any extra whitespace or newlines
          questionText = questionText.trim().replace(/\s+/g, ' ');
          
          // Clean explanation text
          let explanationText = q.explanation || 'No explanation provided';
          explanationText = explanationText.trim().replace(/\s+/g, ' ');
          
          return {
            question: questionText,
            options: options,
            correct_answer: correctAnswer.toUpperCase(),
            explanation: explanationText
          };
        });
        
        setQuiz(cleanedQuiz);
      } catch (e) {
        console.error('Quiz parsing error:', e);
        console.error('Raw quiz data:', data.quiz);
        console.error('Error details:', e.message);
        
        // Show more helpful error message
        const errorMsg = `Error parsing quiz: ${e.message}\n\n` +
          `The AI might have returned an unexpected format. ` +
          `Please try:\n` +
          `1. Regenerating the quiz\n` +
          `2. Using a simpler topic\n` +
          `3. Checking the browser console for details`;
        
        alert(errorMsg);
        setQuiz(null);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error('Error generating quiz:', error);
      let errorMessage = 'Error generating quiz. ';
      
      // Handle timeout/abort errors
      if (error.name === 'AbortError') {
        errorMessage = '⏱️ Quiz generation timed out after 100 seconds.\n\n' +
          'Your system might be slow. To fix this:\n\n' +
          '1. **Use a smaller, faster model:**\n' +
          '   - Run: `ollama pull llama3.2:1b` (fastest, 1.3GB)\n' +
          '   - Or: `ollama pull phi3:mini` (fast, 2.3GB)\n' +
          '   - Or: `ollama pull tinyllama` (very fast, 637MB)\n\n' +
          '2. **Check backend terminal** for specific error messages\n\n' +
          '3. **Restart the backend** after pulling a new model\n\n' +
          '4. **Try with fewer questions** (e.g., 3 instead of 5)';
        alert(errorMessage);
        return;
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Cannot connect to backend. Make sure the backend is running on http://localhost:8000';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check the browser console for details.';
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [topic, numQuestions, sessionId, isGenerating]);

  const generateSummary = useCallback(async () => {
    if (!topic.trim() || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    setSummary(null);

    try {
      const response = await fetch('http://localhost:8000/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Error generating summary. Make sure documents are uploaded and backend is running.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [topic, sessionId, isGeneratingSummary]);

  const handleAnswerSelect = useCallback((questionIndex, answer) => {
    if (showResults) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  }, [showResults]);

  const handleNextQuestion = useCallback(() => {
    if (quiz && currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [quiz, currentQuestionIndex]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const submitQuiz = useCallback(() => {
    if (!quiz || Object.keys(userAnswers).length !== quiz.length) return;
    
    setShowResults(true);
    
    // Calculate score
    const correct = quiz.filter((q, index) => userAnswers[index] === q.correct_answer).length;
    const score = (correct / quiz.length) * 100;

    // Update progress in backend
    fetch('http://localhost:8000/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        topic: topic,
        score: score,
        activity: 'quiz_completed'
      })
    }).catch(err => console.error('Error updating progress:', err));
  }, [quiz, userAnswers, sessionId, topic]);

  const resetQuiz = useCallback(() => {
    setQuiz(null);
    setUserAnswers({});
    setShowResults(false);
    setCurrentQuestionIndex(0);
  }, []);

  // Calculate score for display
  const score = useMemo(() => {
    if (!quiz || !showResults) return null;
    const correct = quiz.filter((q, index) => userAnswers[index] === q.correct_answer).length;
    return { correct, total: quiz.length, percentage: Math.round((correct / quiz.length) * 100) };
  }, [quiz, userAnswers, showResults]);

  // Get current question
  const currentQuestion = quiz && quiz.length > 0 ? quiz[currentQuestionIndex] : null;
  const isLastQuestion = quiz && currentQuestionIndex === quiz.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const allQuestionsAnswered = quiz && Object.keys(userAnswers).length === quiz.length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-2">
          <Target className="w-8 h-8 text-purple-600" />
          <span>Study Tools</span>
        </h2>
        <p className="text-gray-600">Generate quizzes and summaries for any topic</p>
      </div>

      {/* Topic Input Section - Only show when no quiz is active */}
      {!quiz && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📖 Topic or Concept
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Machine Learning Algorithms, Data Structures, etc."
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 Number of Questions
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={generateQuiz}
              disabled={isGenerating || !topic.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
            
            <button
              onClick={generateSummary}
              disabled={isGeneratingSummary || !topic.trim()}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
            >
              {isGeneratingSummary ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Get Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl animate-fade-in">
          <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Summary: {summary.topic}</span>
          </h3>
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{summary.summary}</div>
          {summary.sources_used && (
            <p className="text-sm text-gray-500 mt-3">
              Based on {summary.sources_used} source document(s)
            </p>
          )}
        </div>
      )}

      {/* Quiz Display - Interactive One Question at a Time */}
      {quiz && Array.isArray(quiz) && quiz.length > 0 && !showResults && (
        <div className="space-y-4 animate-fade-in">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Quiz: {topic}</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Question {currentQuestionIndex + 1} of {quiz.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.length) * 100}%` }}
            />
          </div>

          {/* Current Question */}
          {currentQuestion && (
            <div className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-300 transition-all">
              <p className="font-semibold text-gray-800 mb-6 text-lg">
                {currentQuestionIndex + 1}. {currentQuestion.question}
              </p>

              <div className="space-y-3 mb-6">
                {currentQuestion.options && currentQuestion.options.length > 0 ? (
                  currentQuestion.options.map((option, oIndex) => {
                    const optionLetter = option.charAt(0);
                    const isSelected = userAnswers[currentQuestionIndex] === optionLetter;

                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleAnswerSelect(currentQuestionIndex, optionLetter)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-purple-100 border-purple-500 text-purple-800'
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic">Options not available for this question</p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={isFirstQuestion}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {!isLastQuestion ? (
                  <button
                    onClick={handleNextQuestion}
                    disabled={!userAnswers[currentQuestionIndex]}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    disabled={!allQuestionsAnswered}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Submit Quiz</span>
                  </button>
                )}
              </div>

              {/* Answer Status */}
              {userAnswers[currentQuestionIndex] && (
                <p className="text-sm text-green-600 mt-4 text-center">
                  ✓ Answer selected
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Display - After Submission */}
      {quiz && showResults && (
        <div className="space-y-6 animate-fade-in">
          {/* Score Summary */}
          <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3" />
            <p className="text-3xl font-bold mb-2">
              {score.correct} / {score.total}
            </p>
            <p className="text-xl mb-4">
              {score.percentage}% Correct
            </p>
            <button
              onClick={resetQuiz}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Try Another Quiz</span>
            </button>
          </div>

          {/* Detailed Results - All Questions */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quiz Results</h3>
            <div className="space-y-4">
              {quiz.map((question, qIndex) => {
                const userAnswer = userAnswers[qIndex];
                const isCorrect = userAnswer === question.correct_answer;
                const correctAnswerLetter = question.correct_answer;
                const userAnswerText = userAnswer ? question.options?.find(opt => opt.charAt(0) === userAnswer) : null;
                const correctAnswerText = question.options?.find(opt => opt.charAt(0) === correctAnswerLetter);

                return (
                  <div
                    key={`result-${qIndex}`}
                    className={`p-6 rounded-xl border-2 ${
                      isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                    }`}
                  >
                    {/* Question Number and Text */}
                    <div className="mb-4">
                      <p className="font-bold text-gray-800 text-lg mb-2">
                        Question {qIndex + 1}
                      </p>
                      <p className="text-gray-700 text-base">
                        {question.question}
                      </p>
                    </div>

                    {/* User's Selected Answer */}
                    <div className="mb-4 p-4 bg-white rounded-lg border-2 border-gray-300">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Your Selected Answer:</p>
                      <div className="flex items-center space-x-3">
                        {isCorrect ? (
                          <span className="text-2xl" role="img" aria-label="Correct">✅</span>
                        ) : (
                          <span className="text-2xl" role="img" aria-label="Incorrect">❌</span>
                        )}
                        <span className={`font-medium text-base ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {userAnswerText || 'No answer selected'}
                        </span>
                      </div>
                    </div>

                    {/* Correct Answer and Explanation - Only show for wrong answers */}
                    {!isCorrect && correctAnswerText && (
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                          <p className="text-sm font-semibold text-blue-800 mb-2">Correct Answer:</p>
                          <p className="text-blue-900 font-medium text-base">
                            {correctAnswerText}
                          </p>
                        </div>
                        {question.explanation && (
                          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                            <p className="text-sm font-semibold text-blue-800 mb-2">Explanation:</p>
                            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Success message for correct answers */}
                    {isCorrect && (
                      <div className="p-4 bg-green-100 rounded-lg border-2 border-green-400">
                        <p className="text-sm font-semibold text-green-800 flex items-center space-x-2">
                          <span className="text-xl">✅</span>
                          <span>Correct! Well done!</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
        <h3 className="font-semibold text-purple-800 mb-2 flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>Study Tips:</span>
        </h3>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Answer all questions before submitting</li>
          <li>• Use Previous/Next buttons to review your answers</li>
          <li>• Explanations are shown only for incorrect answers</li>
          <li>• Generate summaries to review key concepts quickly</li>
        </ul>
      </div>
    </div>
  );
};

export default QuizSection;
