import React from 'react';

export const Input = ({
  label,
  error,
  type = 'text',
  placeholder = '',
  className = '',
  id,
  ...props
}) => {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 bg-slate-900/80 border ${
          error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700/70 focus:border-brand-500 focus:ring-brand-500'
        } rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};
