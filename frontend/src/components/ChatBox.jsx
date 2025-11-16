// Premium ChatBox component with modern design, streaming support, and intuitive UX
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, User, Loader2, History, Sparkles, MessageSquare } from 'lucide-react';

const ChatBox = ({ sessionId, onLoadSessionInfo, onResetSession, onSessionChange, onOpenSessionHistory }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  // Load messages from session
  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      const response = await fetch(`http://localhost:8000/session/${sid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.chat_messages && data.chat_messages.length > 0) {
          const formattedMessages = data.chat_messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString()
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Load messages when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSessionMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadSessionMessages]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Example suggestions for users
  const exampleQuestions = useMemo(() => [
    "Based on your uploads, how do machine learning algorithms work?",
    "Summarize the key concepts from the Data Structures PDF",
    "Explain the difference between supervised and unsupervised learning",
    "What are the main topics covered in the uploaded materials?"
  ], []);

  // Stream response from backend (if supported) or use regular fetch
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    // Set a longer timeout for LLM queries (100 seconds for slower systems)
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 100000);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentInput,
          session_id: sessionId
        }),
        signal: abortControllerRef.current.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data || !data.response) {
        throw new Error('Backend returned empty or invalid response. Check backend logs.');
      }

      const aiMessage = {
        role: 'assistant',
        content: data.response || 'No response received',
        timestamp: data.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Notify parent of session change if needed
      if (onSessionChange && sessionId) {
        onSessionChange(sessionId);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutMessage = {
          role: 'assistant',
          content: '⏱️ Request timed out after 100 seconds. Your system might be slow. To fix this:\n\n1. **Use a smaller, faster model:**\n   - Run: `ollama pull llama3.2:1b` (fastest, 1.3GB)\n   - Or: `ollama pull phi3:mini` (fast, 2.3GB)\n   - Or: `ollama pull tinyllama` (very fast, 637MB)\n\n2. **Check backend terminal** for specific error messages\n\n3. **Restart the backend** after pulling a new model\n\nThe backend will automatically use the fastest available model.',
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, timeoutMessage]);
        return;
      }
      
      console.error('Error sending message:', error);
      
      let errorContent = 'Sorry, I encountered an error. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorContent += 'Cannot connect to the backend server. Please make sure:\n\n1. Backend is running on http://localhost:8000\n2. No firewall is blocking the connection\n3. Check the backend terminal for errors';
      } else if (error.message.includes('Ollama')) {
        errorContent += 'Ollama connection error. Please make sure:\n\n1. Ollama is installed from https://ollama.ai\n2. Ollama is running (check with: ollama list)\n3. A model is downloaded (run: ollama pull llama2)';
      } else {
        errorContent += `Error: ${error.message}\n\nPlease check the backend terminal for more details.`;
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, sessionId, onSessionChange]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleExampleClick = useCallback((example) => {
    setInputValue(example);
  }, []);

  // Memoize message rendering for performance
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => (
      <div
        key={index}
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}
      >
        <div
          className={`flex items-start space-x-3 max-w-[80%] ${
            message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
          }`}
        >
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user' 
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
              : 'bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300'
          }`}>
            {message.role === 'user' ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-slate-600" />
            )}
          </div>

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 shadow-soft ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                : message.isError
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-slate-50 text-slate-800 border border-slate-200'
            }`}
          >
            <div className="prose prose-sm max-w-none">
              <p className={`whitespace-pre-wrap break-words leading-relaxed ${
                message.role === 'user' ? 'text-white' : message.isError ? 'text-red-800' : 'text-slate-800'
              }`}>
                {message.content}
              </p>
            </div>
            <p
              className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-indigo-200' : message.isError ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    ));
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-medium">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 font-display">Chat</h2>
              <p className="text-xs text-slate-500">Ask questions about your course materials</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSessionHistory || onLoadSessionInfo}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <History className="w-4 h-4" />
              <span>Chats</span>
            </button>
            <button
              onClick={onResetSession}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-soft"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="max-w-4xl mx-auto">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center animate-fade-in">
              {/* Welcome Message */}
              <div className="flex justify-start mb-8">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-medium">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 shadow-soft">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-slate-800">AI Course Mentor</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      Hello! I'm your AI Course Mentor. How can I help you learn today?
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Questions */}
              <div className="mt-8">
                <p className="text-sm font-medium text-slate-500 mb-4">Try asking:</p>
                <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(question)}
                      className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-soft hover:shadow-medium text-sm text-slate-700 hover:text-slate-900"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            renderedMessages
          )}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start mb-6 animate-fade-in">
              <div className="flex items-start space-x-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-slate-600" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 shadow-soft">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-slate-500 ml-2">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-soft">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all shadow-soft text-slate-800 placeholder-slate-400"
                rows="1"
                disabled={isLoading}
                style={{ minHeight: '48px', maxHeight: '120px', overflowY: 'auto' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center shadow-medium disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 ml-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
