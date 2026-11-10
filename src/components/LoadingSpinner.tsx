interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

export default function LoadingSpinner({
  size = 'md',
  text = 'Loading…',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400 ${className}`}
    >
      <span
        className={`${SIZE_CLASSES[size]} animate-spin rounded-full border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400`}
        aria-hidden="true"
      />
      {text ? <span>{text}</span> : null}
    </div>
  );
}
