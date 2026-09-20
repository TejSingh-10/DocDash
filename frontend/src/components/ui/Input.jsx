import { forwardRef } from 'react';

/**
 * Input
 *
 * A labelled form field. Wraps <input> with a consistent label, optional
 * helper text, and an error state.
 *
 * Props:
 *   label      {string}  — visible label text
 *   id         {string}  — links label ↔ input (required for a11y)
 *   error      {string}  — shows below the input in danger color when set
 *   helper     {string}  — shows below the input in neutral color when set
 *   className  {string}  — applied to the wrapper div
 *
 * All other props are forwarded to the underlying <input>.
 */

const Input = forwardRef(function Input(
  { label, id, error, helper, className = '', ...props },
  ref,
) {
  const inputBase =
    'w-full rounded border bg-white px-3 py-2 text-sm text-neutral-800 ' +
    'placeholder:text-neutral-400 transition-colors duration-150 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ' +
    'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400';

  const inputBorder = error
    ? 'border-danger-500 focus:ring-danger-500'
    : 'border-neutral-300 hover:border-neutral-400';

  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={[inputBase, inputBorder].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger-700" role="alert">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${id}-helper`} className="text-xs text-neutral-500">
          {helper}
        </p>
      )}
    </div>
  );
});

export default Input;
