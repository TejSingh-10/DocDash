import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiFetch } from '../hooks/useApiFetch.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
function displayName(email = '') {
  const [local] = email.split('@');
  return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function initials(email = '') {
  return displayName(email).split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton({ className = '' }) {
  return <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />;
}

// ---------------------------------------------------------------------------
// CreateRecordPanel
// Inline form for creating a new record; requires selecting a patient first
// from the list of patients the doctor has an appointment relationship with.
// ---------------------------------------------------------------------------
function CreateRecordPanel({ token, onCreated, patients }) {
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!patientId) { setFieldErrors({ patientId: 'Select a patient.' }); return; }
    if (!diagnosis.trim()) { setFieldErrors({ diagnosis: 'Diagnosis is required.' }); return; }

    setSubmitting(true);
    try {
      await api.records.create(token, {
        patientId,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setPatientId(''); setDiagnosis(''); setPrescription(''); setNotes('');
      onCreated();
    } catch (err) {
      if (err.issues?.length) {
        const fe = {};
        err.issues.forEach(i => { fe[i.field] = i.message; });
        setFieldErrors(fe);
      } else {
        setError(
          err.message?.includes('appointment')
            ? 'You can only create records for patients you have an appointment with.'
            : err.message ?? 'Failed to create record.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, id, el) => (
    <div>
      <label htmlFor={id} className="text-meta mb-1 block">{label}</label>
      {el}
      {fieldErrors[id] && (
        <p className="text-xs text-danger-600 mt-1">{fieldErrors[id]}</p>
      )}
    </div>
  );

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-neutral-900 mb-4">New Medical Record</p>
      <form onSubmit={handleSubmit} className="space-y-4">

        {field('Patient', 'patientId',
          <select
            id="patientId"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          >
            <option value="">Select a patient…</option>
            {patients.map(p => (
              <option key={p._id} value={p._id}>
                {displayName(p.email)} ({p.email})
              </option>
            ))}
          </select>
        )}

        {field('Diagnosis *', 'diagnosis',
          <input
            id="diagnosis"
            type="text"
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            placeholder="Primary diagnosis"
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          />
        )}

        {field('Prescription', 'prescription',
          <textarea
            id="prescription"
            value={prescription}
            onChange={e => setPrescription(e.target.value)}
            placeholder="Medications, dosage, frequency…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 resize-none"
          />
        )}

        {field('Notes', 'notes',
          <textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Clinical observations, follow-up instructions…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 resize-none"
          />
        )}

        {error && (
          <div role="alert" className="text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" size="sm" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Save Record'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EditRecordModal — update prescription + notes (diagnosis is immutable)
// ---------------------------------------------------------------------------
function EditRecordModal({ record, token, onDone, onClose }) {
  const [prescription, setPrescription] = useState(record.prescription ?? '');
  const [notes, setNotes] = useState(record.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.records.update(token, record._id, {
        prescription: prescription.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.message ?? 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="surface w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">Edit Record</p>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Diagnosis is immutable — show read-only */}
        <div>
          <p className="text-meta mb-1">Diagnosis (immutable)</p>
          <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
            {record.diagnosis}
          </p>
        </div>

        <div>
          <label className="text-meta mb-1 block">Prescription</label>
          <textarea
            value={prescription}
            onChange={e => setPrescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div>
          <label className="text-meta mb-1 block">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordCard (doctor view)
// Shows patient info, diagnosis, optional prescription/notes.
// Edit + Archive controls visible — making the access boundary explicit in the UI.
// ---------------------------------------------------------------------------
function DoctorRecordCard({ record, token, onRefetch }) {
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');

  const handleArchive = async () => {
    if (!window.confirm('Archive this record? It will no longer appear in your list.')) return;
    setArchiving(true);
    try {
      await api.records.archive(token, record._id);
      onRefetch();
    } catch (err) {
      setError(err.message ?? 'Failed to archive.');
      setArchiving(false);
    }
  };

  return (
    <>
      <Card className="p-4 hover:shadow transition-shadow">
        <div className="flex items-start gap-3">
          {/* Patient avatar */}
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-neutral-500">
              {initials(record.patient?.email ?? '')}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {displayName(record.patient?.email ?? '')}
                </p>
                <p className="text-xs text-neutral-400">{fmtDate(record.createdAt)}</p>
              </div>
              {/* Edit + Archive — only visible to the authoring doctor */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-xs font-medium text-neutral-400 hover:text-danger-600 px-2 py-1 rounded hover:bg-danger-50 transition-colors"
                >
                  {archiving ? '…' : 'Archive'}
                </button>
              </div>
            </div>

            <p className="text-sm text-neutral-800">
              <span className="font-medium text-neutral-600">Diagnosis:</span>{' '}
              {record.diagnosis}
            </p>

            {record.prescription && (
              <p className="text-xs text-neutral-600">
                <span className="font-medium">Rx:</span> {record.prescription}
              </p>
            )}

            {record.notes && (
              <p className="text-xs text-neutral-500 line-clamp-2">{record.notes}</p>
            )}

            {error && <p className="text-xs text-danger-600 mt-1">{error}</p>}
          </div>
        </div>
      </Card>

      {editing && (
        <EditRecordModal
          record={record}
          token={token}
          onDone={() => { setEditing(false); onRefetch(); }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// DoctorRecords — full page
// ---------------------------------------------------------------------------
export default function DoctorRecords() {
  const { token } = useAuth();
  const [patientFilter, setPatientFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [recordsRev, setRecordsRev] = useState(0);

  const refetchRecords = useCallback(() => setRecordsRev(r => r + 1), []);

  // Records authored by this doctor
  const { data: recordsData, loading: recordsLoading, error: recordsError } = useApiFetch(
    (t) => api.records.getMine(t, patientFilter),
    [patientFilter, recordsRev],
  );

  // Distinct patients for the filter dropdown
  const { data: patientsData } = useApiFetch(
    (t) => api.records.getMinePatients(t),
    [recordsRev],
  );

  const records  = recordsData?.records  ?? [];
  const patients = patientsData?.patients ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-heading-2">Medical Records</h2>
          {/* Access boundary notice — explicit in the UI */}
          <p className="text-body-sm mt-0.5">
            Showing records you authored. You cannot view records written by other doctors.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(v => !v)}
        >
          {showCreate ? 'Cancel' : '+ New Record'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateRecordPanel
          token={token}
          patients={patients}
          onCreated={() => { setShowCreate(false); refetchRecords(); }}
        />
      )}

      {/* Patient filter */}
      {patients.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-meta shrink-0">Filter by patient:</label>
          <select
            value={patientFilter}
            onChange={e => setPatientFilter(e.target.value)}
            className="h-8 px-2 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All patients</option>
            {patients.map(p => (
              <option key={p._id} value={p._id}>
                {displayName(p.email)}
              </option>
            ))}
          </select>
          {patientFilter && (
            <button
              onClick={() => setPatientFilter('')}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {recordsError && (
        <div role="alert" className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {recordsError}
        </div>
      )}

      {/* Records list */}
      {recordsLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="text-sm text-neutral-400">
            {patientFilter ? 'No records for this patient.' : 'You haven\'t authored any records yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <DoctorRecordCard key={r._id} record={r} token={token} onRefetch={refetchRecords} />
          ))}
        </div>
      )}
    </div>
  );
}
