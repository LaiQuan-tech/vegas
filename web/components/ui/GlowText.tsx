import React, { type CSSProperties } from 'react';

type GlowColor = 'blue' | 'purple' | 'orange' | 'red' | 'green' | 'white';
type GlowSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface GlowTextProps {
  children: React.ReactNode;
  color?: GlowColor;
  size?: GlowSize;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  className?: string;
}

const colorValues: Record<GlowColor, { hex: string; tailwind: string }> = {
  blue: { hex: '0,212,255', tailwind: 'text-accent-blue' },
  purple: { hex: '184,41,221', tailwind: 'text-accent-purple' },
  orange: { hex: '255,107,43', tailwind: 'text-accent-orange' },
  red: { hex: '255,0,64', tailwind: 'text-danger' },
  green: { hex: '0,255,136', tailwind: 'text-success' },
  white: { hex: '255,255,255', tailwind: 'text-white' },
};

const sizeStyles: Record<GlowSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
  '2xl': 'text-5xl',
};

const GlowText: React.FC<GlowTextProps> = ({
  children,
  color = 'blue',
  size = 'md',
  as: Tag = 'span',
  className = '',
}) => {
  const { hex, tailwind } = colorValues[color];

  const glowStyle: CSSProperties = {
    textShadow: [
      `0 0 7px rgba(${hex}, 0.6)`,
      `0 0 20px rgba(${hex}, 0.35)`,
      `0 0 40px rgba(${hex}, 0.15)`,
    ].join(', '),
  };

  return (
    <Tag
      className={[tailwind, sizeStyles[size], 'font-bold', className].join(' ')}
      style={glowStyle}
    >
      {children}
    </Tag>
  );
};

export { GlowText, type GlowTextProps, type GlowColor, type GlowSize };
