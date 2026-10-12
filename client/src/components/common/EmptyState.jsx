import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-bold text-slate-200">{title}</h4>
      <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
