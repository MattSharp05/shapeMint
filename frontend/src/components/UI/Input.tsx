import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <input
        className={`
          block w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
          text-white placeholder-white/30
          focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50
          disabled:bg-white/5 disabled:text-white/30
          ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-white/40">{helperText}</p>
      )}
    </div>
  );
}
