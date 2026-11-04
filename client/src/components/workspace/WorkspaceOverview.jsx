import React from 'react';
import { Users, Video, CheckSquare, Calendar, ShieldCheck, UserCheck, Clock } from 'lucide-react';
import { Button } from '../common/Button';

export const WorkspaceOverview = ({ workspace, stats, onNavigateTab }) => {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('members')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Members</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.totalMembers ?? 0}</div>
        </div>

        <div
          onClick={() => onNavigateTab('meetings')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Meetings</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.totalMeetings ?? 0}</div>
        </div>

        <div
          onClick={() => onNavigateTab('meetings')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Upcoming</span>
            <Calendar className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.upcomingMeetings ?? 0}</div>
        </div>

        <div
          onClick={() => onNavigateTab('action-items')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.pendingActionItems ?? 0}</div>
        </div>
      </div>

      {/* Description & Ownership Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Workspace Objective & Scope
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            {workspace.description || 'No description provided. Click Edit Details to add context.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Workspace Owner
          </h3>
          <div className="flex items-center gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <img
              src={workspace.owner?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${workspace.owner?.name || 'Owner'}`}
              alt={workspace.owner?.name || 'Owner'}
              className="w-10 h-10 rounded-full border border-brand-500/30"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{workspace.owner?.name || 'Workspace Owner'}</h4>
              <p className="text-[11px] text-slate-400 truncate">{workspace.owner?.email || 'N/A'}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <ShieldCheck className="w-3 h-3" /> Owner
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-slate-300">{new Date(workspace.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Active</span>
              <span className="text-slate-300">{new Date(workspace.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
