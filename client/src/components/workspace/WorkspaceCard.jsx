import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Video, ArrowRight, MoreVertical, Edit2, Trash2 } from 'lucide-react';

export const WorkspaceCard = ({ workspace, isOwnerOrAdmin, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const memberCount = workspace.memberCount || workspace.members?.length || 1;
  const meetingCount = workspace.meetingCount ?? 0;

  return (
    <div
      onClick={() => navigate(`/workspaces/${workspace._id}`)}
      className="bg-slate-900 border border-slate-800 hover:border-brand-500/40 rounded-2xl p-6 shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between relative"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>

          {isOwnerOrAdmin && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                title="Workspace settings"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-36 bg-slate-850 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs">
                    {onEdit && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(workspace);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-750 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-brand-400" />
                        Edit Details
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(workspace);
                        }}
                        className="w-full px-3 py-2 text-left text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-1">
          {workspace.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
          {workspace.description || 'No description specified for this team workspace.'}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" title="Workspace members">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{memberCount}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Associated meetings">
            <Video className="w-3.5 h-3.5 text-slate-500" />
            <span>{meetingCount}</span>
          </div>
        </div>

        <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
