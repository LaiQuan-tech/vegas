import React from 'react';
import { ADDRESSES } from '@/lib/contracts';

interface FooterProps {
  className?: string;
}

const links = [
  { label: 'Docs', href: '/docs' },
  {
    label: 'Contract',
    href: `https://basescan.org/address/${ADDRESSES.factory}`,
    external: true,
  },
  { label: 'Telegram', href: 'https://t.me/cyberroulette', external: true },
];

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer
      className={[
        'w-full border-t border-white/[0.04] bg-bg',
        className,
      ].join(' ')}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-jetbrains text-white/20">
            CyberRoulette on Base
          </span>

          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-jetbrains text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export { Footer, type FooterProps };
