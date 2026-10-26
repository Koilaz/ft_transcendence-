type StatBoxProps = {
  label: string;
  value: string;
  className?: string;
};

export function StatBox({ label, value, className = '' }: StatBoxProps) {
  return (
    <div className={`rounded-xl border border-stone-700 bg-stone-950 p-[clamp(0.75rem,2vw,1rem)] ${className}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-lg text-white">{value}</p>
    </div>
  );
}
