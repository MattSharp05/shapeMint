import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  fullWidth,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark hover:shadow-[0_0_20px_rgba(237,174,73,0.4)] focus:ring-brand-accent rounded-full font-semibold',
    secondary: 'bg-white/10 text-white hover:bg-white/15 focus:ring-white/30 rounded-full',
    outline: 'border border-white/15 text-[#9ca3af] hover:border-white/30 hover:text-white focus:ring-white/20 rounded-full',
    ghost: 'text-[#9ca3af] hover:bg-white/5 hover:text-white focus:ring-white/20 rounded-full',
    accent: 'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark hover:shadow-[0_0_20px_rgba(237,174,73,0.4)] focus:ring-brand-accent font-semibold rounded-full',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-10 py-4 text-sm tracking-wider uppercase',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      ) : Icon ? (
        <Icon className="h-4 w-4 mr-2" />
      ) : null}
      {children}
    </button>
  );
}
