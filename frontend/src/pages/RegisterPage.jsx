import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Button, Card, Input } from '../components/ui/index.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PASSWORD_RE_UPPER   = /[A-Z]/;
const PASSWORD_RE_DIGIT   = /[0-9]/;
const PASSWORD_RE_SPECIAL = /[^A-Za-z0-9]/;

function validateShared({ email, password }) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!PASSWORD_RE_UPPER.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!PASSWORD_RE_DIGIT.test(password)) {
    errors.password = 'Password must contain at least one digit.';
  } else if (!PASSWORD_RE_SPECIAL.test(password)) {
    errors.password = 'Password must contain at least one special character.';
  }
  return errors;
}

function validateDoctor(fields) {
  const errors = {};
  if (!fields.licenseNumber?.trim()) {
    errors.licenseNumber = 'License number is required for doctors.';
  }
  if (fields.yearsOfExperience !== '' && fields.yearsOfExperience !== undefined) {
    const n = Number(fields.yearsOfExperience);
    if (isNaN(n) || n < 0 || !Number.isInteger(n)) {
      errors.yearsOfExperience = 'Must be a non-negative whole number.';
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function RoleTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2 text-sm font-medium rounded transition-colors duration-150 focus-ring',
        active
          ? 'bg-primary-500 text-white'
          : 'text-neutral-600 hover:bg-neutral-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SelectInput({ label, id, name, value, onChange, error, disabled, options, placeholder }) {
  const base =
    'w-full rounded border px-3 py-2 text-sm text-neutral-800 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ' +
    'disabled:cursor-not-allowed disabled:bg-neutral-100 transition-colors duration-150';
  const border = error ? 'border-danger-500' : 'border-neutral-300 hover:border-neutral-400';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        className={[base, border].join(' ')}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-danger-700" role="alert">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field sets
// ---------------------------------------------------------------------------

const GENDER_OPTIONS = [
  { value: 'MALE',           label: 'Male' },
  { value: 'FEMALE',         label: 'Female' },
  { value: 'OTHER',          label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const BLOOD_GROUP_OPTIONS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({
  value: v, label: v,
}));

function DoctorFields({ fields, errors, onChange, disabled }) {
  return (
    <>
      <Input
        id="licenseNumber"
        name="licenseNumber"
        label="License Number *"
        placeholder="e.g. LIC-12345"
        value={fields.licenseNumber}
        onChange={onChange}
        error={errors.licenseNumber}
        disabled={disabled}
      />
      <Input
        id="specialization"
        name="specialization"
        label="Specialization"
        placeholder="e.g. Cardiology"
        value={fields.specialization}
        onChange={onChange}
        disabled={disabled}
      />
      <Input
        id="yearsOfExperience"
        name="yearsOfExperience"
        type="number"
        min="0"
        label="Years of Experience"
        placeholder="0"
        value={fields.yearsOfExperience}
        onChange={onChange}
        error={errors.yearsOfExperience}
        disabled={disabled}
      />
    </>
  );
}

function PatientFields({ fields, errors, onChange, disabled }) {
  return (
    <>
      <Input
        id="dateOfBirth"
        name="dateOfBirth"
        type="date"
        label="Date of Birth"
        value={fields.dateOfBirth}
        onChange={onChange}
        disabled={disabled}
      />
      <SelectInput
        id="gender"
        name="gender"
        label="Gender"
        value={fields.gender}
        onChange={onChange}
        disabled={disabled}
        options={GENDER_OPTIONS}
        placeholder="Select gender"
      />
      <SelectInput
        id="bloodGroup"
        name="bloodGroup"
        label="Blood Group"
        value={fields.bloodGroup}
        onChange={onChange}
        disabled={disabled}
        options={BLOOD_GROUP_OPTIONS}
        placeholder="Select blood group"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// RegisterPage
// ---------------------------------------------------------------------------

const INITIAL_FIELDS = {
  // Shared
  email: '', password: '',
  // Doctor
  licenseNumber: '', specialization: '', yearsOfExperience: '',
  // Patient
  dateOfBirth: '', gender: '', bloodGroup: '',
};

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [role,   setRole]   = useState('DOCTOR');
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }));
    if (serverError)  setServerError('');
  }

  function handleRoleChange(newRole) {
    setRole(newRole);
    setErrors({});
    setServerError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const sharedErrors = validateShared(fields);
    const roleErrors   = role === 'DOCTOR' ? validateDoctor(fields) : {};
    const allErrors    = { ...sharedErrors, ...roleErrors };

    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      return;
    }

    // Build the payload — only include role-specific fields for the active role
    const payload = { email: fields.email, password: fields.password, role };
    if (role === 'DOCTOR') {
      payload.licenseNumber = fields.licenseNumber.trim();
      if (fields.specialization.trim()) payload.specialization = fields.specialization.trim();
      if (fields.yearsOfExperience !== '') payload.yearsOfExperience = Number(fields.yearsOfExperience);
    } else {
      if (fields.dateOfBirth) payload.dateOfBirth = fields.dateOfBirth;
      if (fields.gender)      payload.gender      = fields.gender;
      if (fields.bloodGroup)  payload.bloodGroup  = fields.bloodGroup;
    }

    setLoading(true);
    setServerError('');
    try {
      const data = await api.register(payload);
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Map server-returned field issues back to inline errors when possible
      if (err.issues?.length) {
        const mapped = {};
        err.issues.forEach(({ field, message }) => {
          if (field) mapped[field] = message;
        });
        if (Object.keys(mapped).length) {
          setErrors(mapped);
          return;
        }
      }
      if (err.status === 409) {
        setErrors({ email: 'An account with this email already exists.' });
      } else {
        setServerError(err.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-primary-700 mb-1">DocDash</p>
          <p className="text-body-sm">Create your account</p>
        </div>

        <Card>
          <Card.Body className="py-6">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Role toggle */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">I am a…</p>
                <div className="flex gap-1 bg-neutral-100 p-1 rounded">
                  <RoleTab active={role === 'DOCTOR'}  onClick={() => handleRoleChange('DOCTOR')}>
                    Doctor
                  </RoleTab>
                  <RoleTab active={role === 'PATIENT'} onClick={() => handleRoleChange('PATIENT')}>
                    Patient
                  </RoleTab>
                </div>
              </div>

              {/* Server-level error */}
              {serverError && (
                <p
                  role="alert"
                  className="text-sm text-danger-700 bg-danger-50 border border-danger-500 rounded px-3 py-2"
                >
                  {serverError}
                </p>
              )}

              {/* Shared fields */}
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={fields.email}
                onChange={handleChange}
                error={errors.email}
                disabled={loading}
              />
              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                placeholder="Min 8 chars, uppercase, digit, special"
                autoComplete="new-password"
                value={fields.password}
                onChange={handleChange}
                error={errors.password}
                helper="Min 8 characters · uppercase · digit · special character"
                disabled={loading}
              />

              {/* Role-specific fields */}
              {role === 'DOCTOR' ? (
                <DoctorFields
                  fields={fields}
                  errors={errors}
                  onChange={handleChange}
                  disabled={loading}
                />
              ) : (
                <PatientFields
                  fields={fields}
                  errors={errors}
                  onChange={handleChange}
                  disabled={loading}
                />
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-1"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </Card.Body>

          <Card.Footer className="text-center">
            <p className="text-sm text-neutral-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-600 font-medium hover:text-primary-700 underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </Card.Footer>
        </Card>

      </div>
    </div>
  );
}
