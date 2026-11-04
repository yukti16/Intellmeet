import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  CheckSquare,
  Edit3,
  ChevronDown,
} from 'lucide-react';
import { actionItemService } from '../../services/actionItemService';

export const ActionItemCard = ({ actionItem, onStatusChange, onEdit, onDelete }) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const priorityColors = {
    High: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const statusIcons = {
    Pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    'In Progress': <AlertCircle className="w-3.5 h-3.5 text-sky-400 animate-pulse" />,
    Completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  };

  const handleStatusSelect = async (e) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (!newStatus || newStatus === actionItem.status || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await actionItemService.updateActionItem(actionItem._id, {
        status: newStatus,
      });
      toast.success(`Task moved to ${newStatus}`);
      if (onStatusChange) onStatusChange(res.actionItem);
    } catch (err) {
      const msg = err.message || 'Failed to update task status';
      toast.error(msg);
      console.error('[ActionItemCard Status Error]', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit && onEdit(actionItem)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onEdit) {
          e.preventDefault();
          onEdit(actionItem);
        }
      }}
      className="group bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-brand-500/5 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      aria-label={`Action item: ${actionItem.title}. Status: ${actionItem.status}. Priority: ${actionItem.priority}`}
    >
      <div>
        {/* Top Badges & Controls */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                priorityColors[actionItem.priority] || priorityColors.Medium
              }`}
            >
              {actionItem.priority}
            </span>

            {actionItem.meeting ? (
              <span
                className="px-2 py-0.5 text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded flex items-center gap-1 truncate max-w-[130px]"
                title={
                  typeof actionItem.meeting === 'object'
                    ? actionItem.meeting.title || actionItem.meeting.meetingCode || 'Linked Meeting'
                    : 'Linked Meeting'
                }
              >
                <Video className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {typeof actionItem.meeting === 'object'
                    ? actionItem.meeting.title || actionItem.meeting.meetingCode || 'Linked Meeting'
                    : 'Linked Meeting'}
                </span>
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60 rounded flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-slate-500" />
                <span>Standalone</span>
              </span>
            )}
          </div>

          {/* Quick Status Dropdown & Edit Button */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="relative inline-flex items-center">
              <span className="absolute left-2 pointer-events-none">
                {statusIcons[actionItem.status]}
              </span>
              <select
                value={actionItem.status}
                onChange={handleStatusSelect}
                disabled={isUpdatingStatus}
                className="appearance-none pl-6 pr-5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-colors focus:outline-none focus:border-brand-500 cursor-pointer disabled:opacity-50"
                title="Change status"
                aria-label="Change status"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(actionItem);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700/90 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
              title="Edit task details"
              aria-label={`Edit task ${actionItem.title}`}
            >
              <Edit3 className="w-3 h-3 text-brand-400" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Task Title & Description */}
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-brand-300 transition-colors mb-1 line-clamp-2">
          {actionItem.title}
        </h4>
        {actionItem.description ? (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
            {actionItem.description}
          </p>
        ) : (
          <div className="h-2" />
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate max-w-[120px]">
            {actionItem.assignedTo?.name || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Due: {new Date(actionItem.dueDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
