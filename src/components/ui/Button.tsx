import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          {
            // Primary Yellow/Gold button
            'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/10': variant === 'primary',
            // Secondary dark slate button
            'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700': variant === 'secondary',
            // Outline button
            'border border-slate-700 text-slate-300 hover:bg-slate-900/50': variant === 'outline',
            // Ghost button
            'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40': variant === 'ghost',
            // Danger button
            'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/10': variant === 'danger',
            // Success button
            'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/10': variant === 'success',
          },
          {
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
