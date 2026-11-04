import React, { useState } from 'react';
import { ActionItemCard } from '../actionItem/ActionItemCard';
import { Button } from '../common/Button';
import { CheckSquare, Plus } from 'lucide-react';

export const WorkspaceActionItems = ({
  actionItems = [],
  onOpenCreateActionItem,
  onEditActionItem,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredItems = actionItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Workspace Action Items</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tasks extracted from or associated with this workspace's meetings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['all', 'Pending', 'In Progress', 'Completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {onOpenCreateActionItem && (
            <Button onClick={onOpenCreateActionItem} variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No action items found</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {statusFilter === 'all'
              ? 'Action items generated during meetings in this workspace will appear here.'
              : `No tasks matching status "${statusFilter}".`}
          </p>
          {onOpenCreateActionItem && (
            <Button onClick={onOpenCreateActionItem} variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Create Task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <ActionItemCard
              key={item._id}
              actionItem={item}
              onStatusChange={onRefresh}
              onEdit={onEditActionItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
