/**
 * StatusBadge — compact, muted badge for appointment status.
 *
 * Variants map directly to the Appointment.status enum values:
 *   SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
 *
 * Design intent: readable at a glance, not visually loud. Backgrounds are
 * from the semantic 50-level (very light tint), text from the 700-level.
 */

const CONFIG = {
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-primary-100 text-primary-700',
  },
  COMPLETED: {
    className: 'bg-success-50 text-success-700',
    label: 'Completed',
  },
  CANCELLED: {
    className: 'bg-neutral-100 text-neutral-500',
    label: 'Cancelled',
  },
  NO_SHOW: {
    className: 'bg-warning-50 text-warning-700',
    label: 'No-show',
  },
};

const FALLBACK = {
  label: 'Unknown',
  className: 'bg-neutral-100 text-neutral-500',
};

/**
 * @param {{ status: string, className?: string }} props
 */
export default function StatusBadge({ status, className = '' }) {
  const { label, className: badgeClass } = CONFIG[status] ?? FALLBACK;
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        badgeClass,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
