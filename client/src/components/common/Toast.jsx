import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-100',
    error: 'border-rose-500/30 bg-rose-950/40 text-rose-100',
    info: 'border-sky-500/30 bg-sky-950/40 text-sky-100',
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl animate-slideUp ${borders[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium pr-2">{message}</p>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
