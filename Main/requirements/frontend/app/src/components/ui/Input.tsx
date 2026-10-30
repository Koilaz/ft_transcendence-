import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, className = '', ...props }, ref) => {
    // Champ invalide : bordure rouge, et le focus reste rouge tant que ce
    // n'est pas corrige (le bleu ne reviendrait pas au milieu du champ).
    const borderClass = error
      ? 'border-red-500 focus:border-red-400'
      : 'border-stone-700 focus:border-blue-500';

    return (
      <div>
        {label && (
          <label
            className="mb-2 block text-sm font-medium text-stone-300"
            htmlFor={id}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border bg-stone-950 px-4 py-3 text-white outline-none transition ${borderClass} ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
