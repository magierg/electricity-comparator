import type { ReactNode } from 'react';

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

const SectionCard = ({ children, className = '', ariaLabel }: SectionCardProps) => (
  <section
    className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200 p-8 hover:shadow-2xl transition-all duration-300 ${className}`}
    aria-label={ariaLabel}
  >
    {children}
  </section>
);

export default SectionCard;
