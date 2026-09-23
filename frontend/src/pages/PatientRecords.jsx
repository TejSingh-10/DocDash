import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiFetch } from '../hooks/useApiFetch.js';
import Card from '../components/ui/Card.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
function fmtShort(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
/**
 * Group records by calendar date (YYYY-MM-DD), newest group first.
 * @param {object[]} records
 * @returns {Array<{ dateKey: string, label: string, items: object[] }>}
 */
function groupByDate(records) {
  const map = new Map();
  for (const r of records) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest date first
    .map(([dateKey, items]) => ({
      dateKey,
      label: fmtDate(new Date(dateKey)),
      items,
    }));
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton({ className = '' }) {
  return <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />;
}

// ---------------------------------------------------------------------------
// RecordDetailPanel — slide-in detail view for a single record
// Read-only: no edit controls are rendered for PATIENT role.
// This matches the backend rule (patients can read but never write).
// ---------------------------------------------------------------------------
function RecordDetailPanel({ record, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-meta mb-0.5">Medical Record</p>
            <p className="text-heading-3 leading-snug">{record.diagnosis}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{fmtShort(record.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0 focus-ring rounded"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="divider" />

        {/* Prescription */}
        {record.prescription ? (
          <div>
            <p className="text-meta mb-1">Prescription</p>
            <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-3 py-2 whitespace-pre-wrap">
              {record.prescription}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-meta mb-1">Prescription</p>
            <p className="text-sm text-neutral-400 italic">No prescription recorded.</p>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div>
            <p className="text-meta mb-1">Notes</p>
            <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-3 py-2 whitespace-pre-wrap">
              {record.notes}
            </p>
          </div>
        )}

        {/* Attachment */}
        {record.attachmentUrl && (
          <div>
            <p className="text-meta mb-1">Attachment</p>
            <a
              href={record.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium underline-offset-2 hover:underline"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              View attachment ↗
            </a>
          </div>
        )}

        {/* Read-only notice — makes the access boundary visible to the patient */}
        <div className="bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
          <p className="text-xs text-neutral-500">
            <span className="font-medium">Read-only.</span>{' '}
            Medical records are managed by your doctor and cannot be edited here.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors focus-ring"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordRow — single row in the grouped list
// ---------------------------------------------------------------------------
function RecordRow({ record, onSelect }) {
  return (
    <button
      onClick={() => onSelect(record)}
      className="w-full flex items-center gap-3 py-3.5 border-b border-neutral-100 last:border-0 text-left hover:bg-neutral-50 -mx-4 px-4 transition-colors rounded"
    >
      {/* Document icon */}
      <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm6 1V2.5L14.5 7H10V5z" clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{record.diagnosis}</p>
        {record.prescription && (
          <p className="text-xs text-neutral-400 truncate">Rx: {record.prescription}</p>
        )}
      </div>

      {/* Chevron — signals clickability */}
      <svg className="w-4 h-4 text-neutral-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DateGroup — a labelled group of records
// ---------------------------------------------------------------------------
function DateGroup({ group, onSelect }) {
  return (
    <div>
      <p className="text-meta mb-1 px-1">{group.label}</p>
      <Card>
        <Card.Body className="py-0 px-4">
          {group.items.map(r => (
            <RecordRow key={r._id} record={r} onSelect={onSelect} />
          ))}
        </Card.Body>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientRecords — full page
// ---------------------------------------------------------------------------
export default function PatientRecords() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);

  const { data, loading, error } = useApiFetch(
    (token) => user?.id ? api.records.getForPatient(token, user.id) : Promise.resolve({ records: [] }),
    [user?.id],
  );

  const records = data?.records ?? [];
  const groups  = groupByDate(records);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-heading-2">My Medical Records</h2>
        {/* Access boundary: explicit read-only context for the patient */}
        <p className="text-body-sm mt-0.5">
          Your complete medical history. Records are created by your doctors and are read-only here.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Card>
                <Card.Body className="py-0 px-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3.5 border-b border-neutral-100 last:border-0">
                      <Skeleton className="w-8 h-8 rounded shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-sm text-neutral-400">No medical records yet.</p>
          <p className="text-xs text-neutral-300 mt-1">
            Records appear here after your doctor creates them following an appointment.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <DateGroup key={g.dateKey} group={g} onSelect={setSelected} />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <RecordDetailPanel record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
