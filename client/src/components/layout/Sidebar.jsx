import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Calendar,
  Users,
  Briefcase,
  Sparkles,
  Bell,
  Settings,
  ShieldAlert,
  Mic,
  CheckSquare,
} from 'lucide-react';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Meetings', path: '/meetings', icon: Video },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Action Items', path: '/action-items', icon: CheckSquare },
    { label: 'Workspaces', path: '/workspaces', icon: Briefcase },
    { label: 'Team', path: '/team', icon: Users },
    { label: 'AI Insights', path: '/ai-insights', icon: Sparkles, badge: 'AI' },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const content = (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            INTELL<span className="text-brand-500">MEET</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">Enterprise AI Platform</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600/20 to-brand-500/10 text-brand-400 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Banner */}
      <div className="p-4 m-4 rounded-xl bg-slate-850 border border-slate-800/80 text-center">
        <p className="text-[11px] font-medium text-slate-400">"Turn Every Meeting Into Action."</p>
        <span className="text-[10px] text-slate-500 mt-1 block">v1.0.0 • AI Active</span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 z-40">{content}</div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 h-full bg-slate-900 shadow-2xl animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
