import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../lib/api.js';
import { useApiFetch } from '../hooks/useApiFetch.js';
import Card from '../components/ui/Card.jsx';

// ---------------------------------------------------------------------------
// Design tokens — muted palette, no loud saturation
// ---------------------------------------------------------------------------
const COLORS = {
  primary:   '#6366f1', // indigo — matches design system primary-500
  muted:     '#94a3b8', // slate-400
  success:   '#4ade80', // muted green
  warning:   '#fbbf24', // muted amber
  danger:    '#f87171', // muted red
  neutral:   '#cbd5e1', // slate-300
};

// Status → color mapping
const STATUS_COLOR = {
  SCHEDULED:  COLORS.primary,
  COMPLETED:  COLORS.success,
  CANCELLED:  COLORS.danger,
  NO_SHOW:    COLORS.warning,
};

// ---------------------------------------------------------------------------
// Shared chart props — minimal, no 3D, light gridlines only
// ---------------------------------------------------------------------------
const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',   // neutral-200
  vertical: false,
};

const AXIS_STYLE = {
  tick:     { fontSize: 11, fill: '#9ca3af' }, // neutral-400
  tickLine: false,
  axisLine: false,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
  },
  itemStyle: { color: '#374151' },
  cursor: { fill: '#f9fafb' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "2024-W38" → "Sep 16" (Monday of that ISO week, approximated) */
function fmtWeek(weekStart) {
  if (!weekStart) return '';
  return new Date(weekStart).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

/** Format "2024-03" → "Mar '24" */
function fmtMonth(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ChartSkeleton() {
  return (
    <div className="animate-pulse bg-neutral-100 rounded h-52 w-full" />
  );
}

// ---------------------------------------------------------------------------
// SectionCard — labelled card wrapper for each chart
// ---------------------------------------------------------------------------
function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <Card className={['p-5 space-y-4', className].join(' ')}>
      <div>
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StatPill — small number summary above each chart
// ---------------------------------------------------------------------------
function StatPill({ label, value }) {
  return (
    <div className="inline-flex flex-col items-center bg-neutral-50 border border-neutral-100 rounded px-3 py-1.5">
      <span className="text-lg font-semibold text-neutral-900">{value}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Donut label (centre text)
// ---------------------------------------------------------------------------
function DonutCentreLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize="20" fontWeight="600" fill="#111827">
        {total}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="#9ca3af">
        total
      </tspan>
    </text>
  );
}

// ---------------------------------------------------------------------------
// AppointmentsLineChart — appointments per week, last 8 weeks
// ---------------------------------------------------------------------------
function AppointmentsLineChart({ data, loading }) {
  const formatted = (data ?? []).map(d => ({
    ...d,
    label: fmtWeek(d.weekStart),
  }));

  const total = formatted.reduce((s, d) => s + d.count, 0);

  return (
    <SectionCard
      title="Appointments per Week"
      subtitle="Last 8 weeks — cancelled excluded"
    >
      {loading ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            <StatPill label="8-week total" value={total} />
            <StatPill label="avg / week" value={formatted.length ? Math.round(total / formatted.length) : 0} />
          </div>
          {formatted.length === 0 ? (
            <p className="text-sm text-neutral-400 py-10 text-center">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" {...AXIS_STYLE} />
                <YAxis allowDecimals={false} {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Appointments']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.primary, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// StatusDonutChart — appointment count by status
// ---------------------------------------------------------------------------
function StatusDonutChart({ data, loading }) {
  const formatted = (data ?? []).map(d => ({
    name:  d.status,
    value: d.count,
    color: STATUS_COLOR[d.status] ?? COLORS.muted,
  }));

  const total = formatted.reduce((s, d) => s + d.value, 0);

  return (
    <SectionCard
      title="Appointment Status Breakdown"
      subtitle="All time — all statuses"
    >
      {loading ? (
        <ChartSkeleton />
      ) : formatted.length === 0 ? (
        <p className="text-sm text-neutral-400 py-10 text-center">No data yet.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <div className="shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={formatted}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {formatted.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <DonutCentreLabel cx={100} cy={100} total={total} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  itemStyle={TOOLTIP_STYLE.itemStyle}
                  formatter={(v, n) => [v, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2 min-w-0">
            {formatted.map(d => (
              <div key={d.name} className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-sm text-neutral-700 font-medium">{d.name}</span>
                <span className="text-sm text-neutral-400 ml-auto pl-4">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// NewPatientsBarChart — patient registrations per month (ADMIN only)
// ---------------------------------------------------------------------------
function NewPatientsBarChart({ data, loading, visible }) {
  if (!visible) return null;

  const formatted = (data ?? []).map(d => ({
    ...d,
    label: fmtMonth(d.month),
  }));

  const total = formatted.reduce((s, d) => s + d.count, 0);

  return (
    <SectionCard
      title="New Patient Registrations"
      subtitle="Last 12 months"
      className="lg:col-span-2"
    >
      {loading ? (
        <ChartSkeleton />
      ) : (
        <>
          <StatPill label="last 12 months" value={total} />
          {formatted.length === 0 ? (
            <p className="text-sm text-neutral-400 py-10 text-center">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" {...AXIS_STYLE} />
                <YAxis allowDecimals={false} {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'New patients']} />
                <Bar
                  dataKey="count"
                  fill={COLORS.primary}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// AnalyticsPage
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { data, loading, error } = useApiFetch(
    (token) => api.analytics.getSummary(token),
    [],
  );

  const isAdmin = data?.role === 'ADMIN';

  // Friendly last-updated timestamp
  const updatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-heading-2">Analytics</h2>
          <p className="text-body-sm mt-0.5">Aggregated statistics from your appointment data.</p>
        </div>
        {updatedAt && (
          <p className="text-xs text-neutral-400">Updated at {updatedAt}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart — full width */}
        <div className="lg:col-span-2">
          <AppointmentsLineChart
            data={data?.appointmentsPerWeek}
            loading={loading}
          />
        </div>

        {/* Donut — half width on desktop */}
        <StatusDonutChart
          data={data?.statusBreakdown}
          loading={loading}
        />

        {/* Bar chart — ADMIN only */}
        <NewPatientsBarChart
          data={data?.newPatientsPerMonth}
          loading={loading}
          visible={isAdmin || loading}
        />

        {/* Filler when doctor (no patient-reg chart) */}
        {!isAdmin && !loading && (
          <div className="hidden lg:block" />
        )}
      </div>
    </div>
  );
}
