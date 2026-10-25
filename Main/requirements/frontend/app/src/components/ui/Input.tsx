import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = '', ...props }, ref) => {
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
          className={`w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
