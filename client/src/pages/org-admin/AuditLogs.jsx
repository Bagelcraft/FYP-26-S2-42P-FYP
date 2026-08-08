import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';
import api from '../../utils/api';

const CATEGORY_COLORS = {
  AUTH:    'bg-blue-100 text-blue-700',
  TASK:    'bg-purple-100 text-purple-700',
  BILLING: 'bg-green-100 text-green-700',
  SYSTEM:  'bg-gray-100 text-gray-600',
  STAFF:   'bg-orange-100 text-orange-700',
};

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-SG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toDateStr(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

function exportPDF(logs, { category, search, dateFrom, dateTo }) {
  const title = 'Audit Log Report';
  const now   = new Date().toLocaleString('en-SG');

  const filterParts = [
    category && category !== 'ALL' ? `Category: ${category}` : null,
    search ? `Search: "${search}"` : null,
    dateFrom ? `From: ${dateFrom}` : null,
    dateTo   ? `To: ${dateTo}`     : null,
  ].filter(Boolean);
  const filterStr = filterParts.length ? filterParts.join(' | ') : 'All logs';

  const rows = logs.map((l) => `
    <tr>
      <td>${l.action}</td>
      <td>${l.user}</td>
      <td><span class="badge ${l.category}">${l.category}</span></td>
      <td>${fmtTime(l.time)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; margin: 32px; }
  h1   { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 10px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th    { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  td    { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .AUTH    { background: #dbeafe; color: #1d4ed8; }
  .TASK    { background: #ede9fe; color: #6d28d9; }
  .BILLING { background: #d1fae5; color: #065f46; }
  .SYSTEM  { background: #f3f4f6; color: #374151; }
  .STAFF   { background: #ffedd5; color: #9a3412; }
  @media print { body { margin: 16px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Generated: ${now} &nbsp;|&nbsp; Filter: ${filterStr} &nbsp;|&nbsp; Total: ${logs.length} entries</p>
<table>
  <thead>
    <tr><th>Action</th><th>User</th><th>Category</th><th>Timestamp</th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px">No entries in selected range.</td></tr>'}</tbody>
</table>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export default function AuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/org-admin/audit-logs')
      .then((r) => setLogs(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase());
    const matchCat  = category === 'ALL' || l.category === category;
    const logDate   = toDateStr(l.time);
    const matchFrom = !dateFrom || logDate >= dateFrom;
    const matchTo   = !dateTo   || logDate <= dateTo;
    return matchSearch && matchCat && matchFrom && matchTo;
  });

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Audit Logs</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Activity trail for your organisation — staff, tasks, attendance and leave.
            </p>
          </div>
          <button
            onClick={() => exportPDF(filtered, { category, search, dateFrom, dateTo })}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Export PDF Report
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search action or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Categories</option>
            <option value="AUTH">Auth</option>
            <option value="TASK">Task</option>
            <option value="BILLING">Billing</option>
            <option value="STAFF">Staff</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {(dateFrom || dateTo) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              Showing logs
              {dateFrom ? ` from ${dateFrom}` : ''}
              {dateTo   ? ` to ${dateTo}`     : ''}
            </span>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-primary-600 hover:underline"
            >
              Clear dates
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                  <th className="px-5 py-3 text-left font-medium">User</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{log.action}</td>
                    <td className="px-5 py-3 text-gray-600">{log.user}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[log.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{fmtTime(log.time)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                      {dateFrom || dateTo ? 'No logs found in the selected date range.' : 'No logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-right">{filtered.length} entries shown — PDF export will include only these entries</p>
        )}
      </div>
    </DashboardLayout>
  );
}
