import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

// One timesheet for every worker, permanent or temporary.
//
// What it measures follows the organisation, not the contract type — a temporary
// worker rostered next to a permanent one sees their work counted the same way.
// The server decides and returns `mode`, so this renders from the response:
//
//   SHIFT — clock in/out history and daily hours, *plus* the tasks completed that
//           month. Being rostered and delivering work are two different things and
//           the sheet reports both.
//   TASK  — completed tasks grouped by project, with no clock and no hours. A task
//           records scheduled dates, not time worked, so this sheet counts
//           delivered tasks rather than inventing an hours figure out of the size
//           of the scheduling window.
//
// Deriving it here from `mode` (rather than checking org_type in the client) also
// means the sheet is correct the moment an org admin switches scheduling model,
// without waiting for the user's session to be refreshed.

const STATUS_STYLE = {
  PRESENT:     'text-green-600',
  IN_PROGRESS: 'text-blue-600',
  COMPLETED:   'text-green-600',
};

const STATUS_LABEL = {
  PRESENT:     'Present',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Completed',
};

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const shortDate = (dt) => new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// A task's scheduled window. Collapsed to a single date when it starts and ends
// on the same day, so a one-day task does not read as "11 Aug – 11 Aug".
function formatRange(start, end) {
  if (!start || !end) return '—';
  const from = shortDate(start);
  const to = shortDate(end);
  return from === to ? from : `${from} – ${to}`;
}

function formatHours(decimal) {
  if (decimal == null) return '—';
  const totalMinutes = Math.round(Number(decimal) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return '0h';
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const TableHead = ({ columns }) => (
  <thead>
    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
      {columns.map((c) => (
        <th key={c} className="px-5 py-3 text-left font-medium">{c}</th>
      ))}
    </tr>
  </thead>
);

const EmptyRow = ({ span, children }) => (
  <tr><td colSpan={span} className="px-5 py-4 text-gray-400">{children}</td></tr>
);

export default function TimesheetPanel({ basePath }) {
  const [sheet, setSheet] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSheet = useCallback(() => {
    setLoading(true);
    api.get(`${basePath}/timesheet`, { params: { month } })
      .then((r) => { setSheet(r.data.data); setError(''); })
      .catch(() => setError('Failed to load your timesheet.'))
      .finally(() => setLoading(false));
  }, [basePath, month]);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

  const isShiftMode = sheet?.mode === 'SHIFT';
  const openSession = sheet?.openSession ?? null;
  const tasks = sheet?.tasks ?? [];

  const handleClock = async () => {
    setActionLoading(true);
    setError('');
    try {
      if (openSession) await api.put(`${basePath}/attendance/clock-out`);
      else await api.post(`${basePath}/attendance/clock-in`);
      fetchSheet();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update your attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  // A shift sheet leads with hours and closes with delivered work; a task sheet
  // has only the latter.
  const tiles = isShiftMode
    ? [
      { label: 'Days Present',    value: String(sheet.summary.daysPresent), color: 'text-green-600' },
      { label: 'Total Hours',     value: formatHours(sheet.summary.totalHours), color: 'text-primary-600' },
      { label: 'Avg Hours / Day', value: formatHours(sheet.summary.avgHours), color: 'text-gray-700' },
      { label: 'Tasks Completed', value: String(sheet.summary.tasksCompleted), color: 'text-indigo-600' },
    ]
    : [
      { label: 'Tasks Completed', value: String(sheet?.summary.tasksCompleted ?? 0), color: 'text-green-600' },
      { label: 'Projects Worked', value: String(sheet?.summary.projectsWorked ?? 0), color: 'text-purple-600' },
    ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Timesheet</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isShiftMode
              ? 'Your hours on the clock and the work you completed this month.'
              : 'Work you have completed this month, grouped by project.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {/* Only a rostered organisation has anything to clock. */}
          {sheet?.canClock && (
            <button
              onClick={handleClock}
              disabled={actionLoading}
              className={`${openSession ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors`}
            >
              {actionLoading ? 'Processing…' : openSession ? 'Clock Out' : 'Clock In'}
            </button>
          )}
        </div>
      </div>

      {openSession && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700">
          Clocked in at <span className="font-semibold">{formatTime(openSession.clock_in)}</span>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Summary */}
      <div className={`grid gap-4 ${isShiftMode ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className={`text-2xl font-bold mt-1 ${t.color}`}>{loading ? '—' : t.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">This month</p>
          </Card>
        ))}
      </div>

      {/* Per-project breakdown — the headline of a task-based sheet. */}
      {!isShiftMode && (sheet?.projects.length ?? 0) > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">By Project</p>
          <div className="space-y-2">
            {sheet.projects.map((p) => {
              // Share of the month's completed tasks, not of its hours.
              const share = sheet.summary.tasksCompleted > 0
                ? Math.round((p.tasks / sheet.summary.tasksCompleted) * 100)
                : 0;
              return (
                <div key={p.project_id ?? 'standalone'}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${p.project_id === null ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                      {p.name}
                    </span>
                    <span className="text-gray-500">
                      {p.tasks} task{p.tasks === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.project_id === null ? 'bg-gray-300' : 'bg-primary-500'}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Attendance — shift-based organisations only. */}
      {isShiftMode && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Attendance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Your clock-in/out history and daily hours.</p>
          </div>
          <table className="w-full text-sm">
            <TableHead columns={['Date', 'Clock In', 'Clock Out', 'Hours', 'Status']} />
            <tbody className="divide-y divide-gray-50">
              {loading && <EmptyRow span={5}>Loading…</EmptyRow>}
              {!loading && sheet.attendance.length === 0 && (
                <EmptyRow span={5}>No attendance records for this month.</EmptyRow>
              )}
              {!loading && sheet.attendance.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{formatDate(e.date)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatTime(e.clockIn)}</td>
                  <td className="px-5 py-3 text-gray-600">{e.clockOut ? formatTime(e.clockOut) : '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{formatHours(e.hours)}</td>
                  <td className={`px-5 py-3 font-medium ${STATUS_STYLE[e.status] ?? 'text-gray-600'}`}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Completed work — on every sheet. In a shift organisation this sits under
          the clock; in a project-based one it is the whole sheet. */}
      <Card className="overflow-hidden">
        {isShiftMode && (
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Tasks Completed</h3>
            <p className="text-xs text-gray-400 mt-0.5">Work you delivered this month.</p>
          </div>
        )}
        <table className="w-full text-sm">
          <TableHead
            columns={isShiftMode
              ? ['Completed', 'Task', 'Scheduled', 'Status']
              : ['Completed', 'Task', 'Project', 'Scheduled', 'Status']}
          />
          <tbody className="divide-y divide-gray-50">
            {loading && <EmptyRow span={isShiftMode ? 4 : 5}>Loading…</EmptyRow>}
            {!loading && tasks.length === 0 && (
              <EmptyRow span={isShiftMode ? 4 : 5}>No completed work this month.</EmptyRow>
            )}
            {!loading && tasks.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{formatDate(e.date)}</td>
                <td className="px-5 py-3 text-gray-600">{e.title}</td>
                {/* Projects only exist in project-based organisations, so the
                    column is dropped rather than filled with "Standalone". */}
                {!isShiftMode && (
                  <td className="px-5 py-3 text-gray-600">
                    {e.project ?? <span className="text-gray-400 italic">Standalone</span>}
                  </td>
                )}
                <td className="px-5 py-3 text-gray-600">{formatRange(e.start, e.end)}</td>
                <td className={`px-5 py-3 font-medium ${STATUS_STYLE[e.status] ?? 'text-gray-600'}`}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
