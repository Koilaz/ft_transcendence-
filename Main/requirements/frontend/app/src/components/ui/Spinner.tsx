type SpinnerProps = {
  className?: string;
};

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-azur-500 border-t-transparent h-12 w-12 border-4 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
