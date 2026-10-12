import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { Search, LogOut, Sparkles, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onOpenSearch }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Search Bar / Quick Action */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3.5 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-400 text-xs transition-colors"
        >
          <Search className="w-4 h-4 text-slate-500" />
          <span>Search meetings, team members, action items...</span>
          <kbd className="ml-auto hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Start Meeting Button */}
        <button
          onClick={() => navigate('/meetings')}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/20 transition-all"
        >
          <Video className="w-3.5 h-3.5" />
          <span>New Meeting</span>
        </button>

        {/* Notifications Bell */}
        <NotificationBell />

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
            alt={user?.name}
            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
          />
          <div className="hidden md:block text-left">
            <h4 className="text-xs font-bold text-slate-200 leading-tight">{user?.name}</h4>
            <span className="text-[10px] text-brand-400 font-medium">{user?.role}</span>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
