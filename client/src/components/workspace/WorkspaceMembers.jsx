import React from 'react';
import { UserPlus, Shield, UserMinus, Crown, Mail, Clock, X } from 'lucide-react';
import { Button } from '../common/Button';

export const WorkspaceMembers = ({
  workspace,
  membersDetail = [],
  invitations = [],
  currentUserId,
  isOwner,
  isWorkspaceAdmin,
  onOpenAddModal,
  onUpdateRole,
  onRemoveMember,
  onCancelInvitation,
}) => {
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Workspace Members</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Team members with access to meetings, tasks, and documents in this workspace
          </p>
        </div>

        {isWorkspaceAdmin && (
          <Button onClick={onOpenAddModal} variant="primary" size="sm">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add Member
          </Button>
        )}
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {membersDetail.map((item) => {
          const user = item.user || {};
          const isUserOwner = workspace.owner?._id === user._id || workspace.owner === user._id;
          const isSelf = user._id === currentUserId;

          return (
            <div
              key={user._id || item._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                    {isUserOwner && (
                      <span title="Workspace Owner" className="text-amber-400 flex-shrink-0">
                        <Crown className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {user.jobTitle || 'Team Member'} {user.department ? `• ${user.department}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  {isUserOwner ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Owner
                    </span>
                  ) : isOwner ? (
                    <select
                      value={item.role || 'Member'}
                      onChange={(e) => onUpdateRole(user._id, e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-brand-500"
                    >
                      <option value="Member">Member</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {item.role || 'Member'}
                    </span>
                  )}
                </div>

                {/* Remove / Leave Action */}
                {!isUserOwner && (isWorkspaceAdmin || isSelf) && (
                  <button
                    onClick={() => onRemoveMember(user._id, user.name, isSelf)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                    title={isSelf ? 'Leave workspace' : 'Remove from workspace'}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{isSelf ? 'Leave' : 'Remove'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Email Invitations ({pendingInvitations.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvitations.map((inv) => (
              <div
                key={inv._id}
                className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Invited ({inv.role})
                      </span>
                      {isWorkspaceAdmin && (
                        <button
                          onClick={() => onCancelInvitation(inv._id, inv.email)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Cancel invitation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate mt-1">{inv.email}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Invited {new Date(inv.invitedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
