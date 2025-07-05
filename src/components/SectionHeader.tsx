import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  colorClass?: string;
}

const SectionHeader = ({ icon, title, colorClass = '' }: SectionHeaderProps) => (
  <div className="flex items-center mb-6">
    <div
      className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center mr-3 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300`}
      tabIndex={0}
      aria-label={`${title} icon`}
    >
      {icon}
    </div>
    <h2 className="text-2xl font-bold text-pink-900" tabIndex={0}>{title}</h2>
  </div>
);

export default SectionHeader;
