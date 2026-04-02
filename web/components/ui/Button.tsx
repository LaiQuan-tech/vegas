'use client';

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent-blue/10 text-accent-blue border border-accent-blue/40',
    'hover:bg-accent-blue/20 hover:border-accent-blue/70',
    'hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]',
    'active:shadow-[0_0_30px_rgba(0,212,255,0.5)]',
    'disabled:bg-accent-blue/5 disabled:text-accent-blue/30 disabled:border-accent-blue/15',
    'disabled:shadow-none disabled:cursor-not-allowed',
  ].join(' '),
  danger: [
    'bg-danger/10 text-danger border border-danger/40',
    'hover:bg-danger/20 hover:border-danger/70',
    'hover:shadow-[0_0_20px_rgba(255,0,64,0.3)]',
    'active:shadow-[0_0_30px_rgba(255,0,64,0.5)]',
    'disabled:bg-danger/5 disabled:text-danger/30 disabled:border-danger/15',
    'disabled:shadow-none disabled:cursor-not-allowed',
  ].join(' '),
  ghost: [
    'bg-transparent text-white/70 border border-white/10',
    'hover:bg-white/5 hover:text-white hover:border-white/20',
    'active:bg-white/10',
    'disabled:text-white/20 disabled:border-white/5',
    'disabled:shadow-none disabled:cursor-not-allowed',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-7 py-3.5 text-base rounded-lg gap-2.5',
};

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className ?? 'h-4 w-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 ease-out',
          'font-inter tracking-wide uppercase',
          'select-none outline-none',
          'focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          variantStyles[variant],
          sizeStyles[size],
          loading ? 'cursor-wait' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <Spinner className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
