import { forwardRef } from 'react';

/**
 * Button
 *
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 *
 * Accepts all standard <button> props (onClick, disabled, type, etc.)
 * via forwardRef so it can be used inside form libraries.
 */

const base =
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 focus-ring disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap';

const variants = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
  secondary:
    'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200',
  danger:
    'bg-danger-500 text-white hover:bg-danger-700 active:bg-danger-700',
};

const sizes = {
  sm: 'h-8  px-3 text-sm',
  md: 'h-9  px-4 text-sm',
  lg: 'h-10 px-5 text-base',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[base, variants[variant], sizes[size], className].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
