import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Toast types
// ---------------------------------------------------------------------------
// 'success' | 'error' | 'info' | 'warning'
//
// Each toast: { id, type, message, duration }
// ---------------------------------------------------------------------------

const ToastContext = createContext(null);

let _nextId = 1;

// ---------------------------------------------------------------------------
// ToastProvider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    // Auto-dismiss
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience helpers
  const success = useCallback((msg, opts) => toast({ type: 'success', message: msg, ...opts }), [toast]);
  const error   = useCallback((msg, opts) => toast({ type: 'error',   message: msg, ...opts }), [toast]);
  const info    = useCallback((msg, opts) => toast({ type: 'info',    message: msg, ...opts }), [toast]);
  const warning = useCallback((msg, opts) => toast({ type: 'warning', message: msg, ...opts }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useToast
// ---------------------------------------------------------------------------

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Toast item styles
// ---------------------------------------------------------------------------

const TOAST_STYLES = {
  success: {
    bar:   'bg-success-500',
    icon:  'text-success-700',
    bg:    'bg-white border-success-200',
    label: 'text-success-700',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bar:   'bg-danger-500',
    icon:  'text-danger-600',
    bg:    'bg-white border-danger-200',
    label: 'text-danger-700',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    bar:   'bg-warning-500',
    icon:  'text-warning-600',
    bg:    'bg-white border-warning-200',
    label: 'text-warning-700',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    bar:   'bg-primary-500',
    icon:  'text-primary-600',
    bg:    'bg-white border-primary-100',
    label: 'text-neutral-700',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

// ---------------------------------------------------------------------------
// ToastItem
// ---------------------------------------------------------------------------

function ToastItem({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-start gap-3 w-full max-w-sm rounded-lg border shadow-md',
        'overflow-hidden animate-slide-in pl-0 pr-3 py-3',
        style.bg,
      ].join(' ')}
    >
      {/* Left colour bar */}
      <div className={['w-1 self-stretch rounded-l-lg shrink-0', style.bar].join(' ')} />

      {/* Icon */}
      <span className={['shrink-0 mt-0.5', style.icon].join(' ')}>{style.svg}</span>

      {/* Message */}
      <p className={['flex-1 text-sm font-medium leading-snug', style.label].join(' ')}>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToastContainer — fixed bottom-right stack
// ---------------------------------------------------------------------------

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
