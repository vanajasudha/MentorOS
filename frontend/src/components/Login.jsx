import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, Mail, Lock, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { email, password });
      authLogin(res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mentor-purple/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mentor-blue/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-mentor-border p-6 sm:p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-mentor-purple/20 p-4 rounded-2xl mb-4 border border-mentor-purple/30">
              <Sparkles className="w-8 h-8 text-mentor-purple" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-mentor-textMuted">Continue your learning journey with MentorOS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-3 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-mentor-textMuted ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mentor-textMuted group-focus-within:text-mentor-purple transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A2235]/50 border border-mentor-border focus:border-mentor-purple rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-mentor-textMuted outline-none transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-mentor-textMuted ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mentor-textMuted group-focus-within:text-mentor-purple transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1A2235]/50 border border-mentor-border focus:border-mentor-purple rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-mentor-textMuted outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mentor-purple hover:bg-mentor-purple/90 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl shadow-glow-purple flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-mentor-textMuted">
            Don't have an account?{' '}
            <Link to="/signup" className="text-mentor-purple hover:text-mentor-purple/80 font-semibold underline-offset-4 hover:underline transition-all">
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-6 text-mentor-textMuted text-xs uppercase tracking-widest font-medium">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure Access</span>
          </div>
          <span>•</span>
          <span>Terms of Service</span>
          <span>•</span>
          <span>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
