'use client';

import React, { type HTMLAttributes } from 'react';

type GlowColor = 'blue' | 'purple' | 'orange' | 'red' | 'green' | 'none';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: GlowColor;
}

const glowMap: Record<GlowColor, string> = {
  blue: 'shadow-[0_0_30px_rgba(0,212,255,0.08)] border-accent-blue/20 hover:border-accent-blue/35 hover:shadow-[0_0_40px_rgba(0,212,255,0.12)]',
  purple: 'shadow-[0_0_30px_rgba(184,41,221,0.08)] border-accent-purple/20 hover:border-accent-purple/35 hover:shadow-[0_0_40px_rgba(184,41,221,0.12)]',
  orange: 'shadow-[0_0_30px_rgba(255,107,43,0.08)] border-accent-orange/20 hover:border-accent-orange/35 hover:shadow-[0_0_40px_rgba(255,107,43,0.12)]',
  red: 'shadow-[0_0_30px_rgba(255,0,64,0.08)] border-danger/20 hover:border-danger/35 hover:shadow-[0_0_40px_rgba(255,0,64,0.12)]',
  green: 'shadow-[0_0_30px_rgba(0,255,136,0.08)] border-success/20 hover:border-success/35 hover:shadow-[0_0_40px_rgba(0,255,136,0.12)]',
  none: 'border-white/[0.06] hover:border-white/[0.1]',
};

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  ...props
}) => {
  return (
    <div
      className={[
        'bg-surface rounded-xl border p-5',
        'transition-all duration-300 ease-out',
        glowMap[glowColor],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card, type CardProps, type GlowColor };
