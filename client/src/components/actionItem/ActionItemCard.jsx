import React from 'react';
import { Calendar, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { actionItemService } from '../../services/actionItemService';

export const ActionItemCard = ({ actionItem, onStatusChange, onDelete }) => {
  const priorityColors = {
    High: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const statusIcons = {
    Pending: <Clock className="w-4 h-4 text-amber-400" />,
    'In Progress': <AlertCircle className="w-4 h-4 text-sky-400 animate-pulse" />,
    Completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  const handleToggleStatus = async () => {
    const nextStatus =
      actionItem.status === 'Pending'
        ? 'In Progress'
        : actionItem.status === 'In Progress'
        ? 'Completed'
        : 'Pending';

    try {
      const res = await actionItemService.updateActionItem(actionItem._id, {
        status: nextStatus,
      });
      if (onStatusChange) onStatusChange(res.actionItem);
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
              priorityColors[actionItem.priority] || priorityColors.Medium
            }`}
          >
            {actionItem.priority} Priority
          </span>

          <button
            onClick={handleToggleStatus}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
          >
            {statusIcons[actionItem.status]}
            <span>{actionItem.status}</span>
          </button>
        </div>

        <h4 className="text-sm font-bold text-slate-100 mb-1">{actionItem.title}</h4>
        {actionItem.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
            {actionItem.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span>{actionItem.assignedTo?.name || 'Unassigned'}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Due: {new Date(actionItem.dueDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
