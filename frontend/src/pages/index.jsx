import Card from '../components/ui/Card.jsx';

/**
 * Placeholder page component factory.
 * Each page stub shows its name and a short description.
 * Replace with real content as features are built out.
 */
function PlaceholderPage({ title, description }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-heading-2">{title}</h2>
        {description && <p className="text-body-sm mt-1">{description}</p>}
      </div>

      <Card>
        <Card.Body className="text-center py-12">
          <p className="text-meta mb-2">Coming soon</p>
          <p className="text-body-sm text-neutral-400">
            This section will be built in a future step.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}

export function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Overview of your appointments, recent activity, and key metrics."
    />
  );
}

export function AppointmentsPage() {
  return (
    <PlaceholderPage
      title="Appointments"
      description="Schedule, view, and manage patient appointments."
    />
  );
}

export function RecordsPage() {
  return (
    <PlaceholderPage
      title="Medical Records"
      description="Create and access patient medical records."
    />
  );
}

export function ProfilePage() {
  return (
    <PlaceholderPage
      title="Profile"
      description="View and update your account and professional profile."
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <p className="text-3xl font-bold text-neutral-300">404</p>
      <p className="text-body text-neutral-500">Page not found.</p>
    </div>
  );
}
