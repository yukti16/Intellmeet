import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mic, ArrowRight, Lock, KeyRound } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoUser = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  // If already authenticated with a valid session, provide clear and transparent options
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 text-white shadow-xl shadow-brand-600/30 mb-4">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Active Session Detected</h2>
          <p className="mt-2 text-xs text-slate-400">You are already signed in to an active IntellMeet account</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-center">
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 mb-6 flex items-center gap-4 text-left">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                alt={user.name}
                className="w-12 h-12 rounded-full border border-slate-600 bg-slate-700 object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] bg-brand-500/20 text-brand-400 font-semibold px-2 py-0.5 rounded">
                  {user.role} • {user.department || 'General'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Continue to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                onClick={async () => {
                  await logout();
                  setEmail('');
                  setPassword('');
                }}
                variant="secondary"
                size="lg"
                className="w-full text-slate-300 hover:text-white"
              >
                Sign In with a Different Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 text-white shadow-xl shadow-brand-600/30 mb-4">
          <Mic className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome to IntellMeet</h2>
        <p className="mt-2 text-xs text-slate-400">Sign in to access your enterprise workspaces and AI meetings</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <Link to="/forgot-password" className="text-brand-400 hover:text-brand-300 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Demo Login Shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick Demo Fill Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoUser('admin@intellmeet.com', 'password123')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-[10px] font-semibold text-slate-300 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('manager@intellmeet.com', 'password123')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-[10px] font-semibold text-slate-300 transition-colors"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('member@intellmeet.com', 'password123')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-[10px] font-semibold text-slate-300 transition-colors"
              >
                Member
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
