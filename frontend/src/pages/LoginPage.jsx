import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Button, Card, Input } from '../components/ui/index.js';

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [fields, setFields]       = useState({ email: '', password: '' });
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]     = useState(false);

  // Where to redirect after a successful login
  const from = location.state?.from?.pathname ?? '/dashboard';

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((f) => ({ ...f, [name]: value }));
    // Clear the field-level error as the user types
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
    if (serverError)  setServerError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate(fields);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const data = await api.login({ email: fields.email, password: fields.password });
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setServerError('Invalid email or password.');
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
          <p className="text-body-sm">Sign in to your account</p>
        </div>

        <Card>
          <Card.Body className="py-6">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Server-level error */}
              {serverError && (
                <p
                  role="alert"
                  className="text-sm text-danger-700 bg-danger-50 border border-danger-500 rounded px-3 py-2"
                >
                  {serverError}
                </p>
              )}

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
                placeholder="••••••••"
                autoComplete="current-password"
                value={fields.password}
                onChange={handleChange}
                error={errors.password}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-1"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card.Body>

          <Card.Footer className="text-center">
            <p className="text-sm text-neutral-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-primary-600 font-medium hover:text-primary-700 underline-offset-2 hover:underline"
              >
                Create one
              </Link>
            </p>
          </Card.Footer>
        </Card>

      </div>
    </div>
  );
}
