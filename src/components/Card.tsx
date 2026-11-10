import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export default function Card({ children, className = '', ariaLabel }: CardProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  );
}
