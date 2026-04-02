import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
};

const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  pulse = false,
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5',
        'text-xs font-semibold font-inter uppercase tracking-wider',
        'rounded-full border',
        'transition-colors duration-200',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={[
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              variant === 'success' ? 'bg-success' : '',
              variant === 'warning' ? 'bg-accent-orange' : '',
              variant === 'danger' ? 'bg-danger' : '',
              variant === 'info' ? 'bg-accent-blue' : '',
            ].join(' ')}
          />
          <span
            className={[
              'relative inline-flex h-2 w-2 rounded-full',
              variant === 'success' ? 'bg-success' : '',
              variant === 'warning' ? 'bg-accent-orange' : '',
              variant === 'danger' ? 'bg-danger' : '',
              variant === 'info' ? 'bg-accent-blue' : '',
            ].join(' ')}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export { Badge, type BadgeProps, type BadgeVariant };
