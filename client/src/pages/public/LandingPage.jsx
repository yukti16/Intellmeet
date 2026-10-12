import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Video,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Users,
  Mic,
  MessageSquare,
  ArrowRight,
  Brain,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
            <Mic className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            INTELL<span className="text-brand-500">MEET</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#ai" className="hover:text-white transition-colors">AI Capabilities</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Signed in as <strong className="text-slate-200">{user?.name}</strong>
              </span>
              <Button onClick={() => navigate('/dashboard')} variant="primary" size="sm">
                Dashboard
              </Button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors px-2 py-1"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </button>
              <Button onClick={() => navigate('/register')} variant="primary" size="sm">
                Get Started Free
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6 shadow-inner animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span>Next-Generation Enterprise AI Meeting Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-none mb-6">
          Turn Every Meeting <br />
          <span className="bg-gradient-to-r from-brand-500 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
            Into Actionable Results.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          IntellMeet combines crystal-clear WebRTC video conferencing, real-time transcription, and OpenAI-driven automated summaries & action-item tracking in one unified workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {isAuthenticated ? (
            <Button
              onClick={() => navigate('/dashboard')}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Go to Your Dashboard <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate('/register')}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Start Meeting Free <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Demo Sign In
              </Button>
            </>
          )}
        </div>

        {/* Hero Interactive App Mockup Preview */}
        <div className="mt-16 w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="bg-slate-950 rounded-2xl border border-slate-800/80 p-6 flex flex-col md:flex-row gap-6 items-center text-left">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-lg font-bold text-white">Q4 Product Roadmap & Architecture Sync</h3>
              </div>
              <p className="text-xs text-slate-400">
                Live AI Engine is transcribing speech and generating executive decisions in real-time.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs flex items-start gap-3">
                  <Brain className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200">AI Summary:</span> Approved WebRTC TURN fallback architecture and assigned API documentation backlog.
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 h-44 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-xl">
                SC
              </div>
              <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-slate-950/80 px-2 py-0.5 rounded text-slate-200">
                Sarah Connor (Host)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white">Everything Remote Teams Need</h2>
            <p className="text-slate-400 text-sm mt-2">
              Combining the best of video calls, async documentation, and task execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">HD WebRTC Video & Audio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Peer-to-peer WebRTC video calls with sub-100ms latency, high-DPI screen sharing, and interactive mute/camera controls.
              </p>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">OpenAI Meeting Intelligence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic generation of executive summaries, main discussion points, decisions, and follow-up recommendations.
              </p>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Action Item Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extract tasks automatically from transcripts and assign them with due dates, priorities, and status updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 lg:px-12 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-brand-500" />
            <span className="font-bold text-slate-300">INTELLMEET © 2026</span>
          </div>
          <p>"Turn Every Meeting Into Action." All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
