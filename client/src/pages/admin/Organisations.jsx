import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ADMIN_NAV } from './nav';
import api from '../../utils/api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

// Scheduling model, shown read-only. Each organisation sets its own model from
// its Organisation Profile page — they know how the business runs.
const ORG_TYPE_LABEL = { PROJECT: 'Project-based', NON_PROJECT: 'Shift-based' };

function OrgTypeChip({ type }) {
  const project = type === 'PROJECT';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${project ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
      <span aria-hidden="true">{project ? '🗂️' : '🕐'}</span>
      {ORG_TYPE_LABEL[type] ?? type ?? '—'}
    </span>
  );
}

export default function Organisations() {
  const [pending, setPending] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    setError('');
    try {
      const [regRes, orgRes] = await Promise.all([
        api.get('/admin/registrations'),
        api.get('/admin/organisations'),
      ]);
      setPending(regRes.data.data ?? []);
      setOrgs(orgRes.data.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load organisations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setActingId(id);
    setError('');
    try {
      await api.post(`/admin/registrations/${id}/approve`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to approve registration.');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this registration request? This cannot be undone.')) return;
    setActingId(id);
    setError('');
    try {
      await api.post(`/admin/registrations/${id}/reject`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to reject registration.');
    } finally {
      setActingId(null);
    }
  };

  const toggleStatus = async (org) => {
    const action = org.isActive ? 'suspend' : 'reactivate';
    const label  = org.isActive ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${label} "${org.name}"?`)) return;
    setActingId(org.organisation_id);
    setError('');
    try {
      await api.put(`/admin/organisations/${org.organisation_id}/${action}`);
      setOrgs((prev) =>
        prev.map((o) => o.organisation_id === org.organisation_id ? { ...o, isActive: !o.isActive } : o)
      );
    } catch (err) {
      setError(err.response?.data?.message ?? `Failed to ${action} organisation.`);
    } finally {
      setActingId(null);
    }
  };

  const filtered = orgs.filter((o) => {
    const status = o.isActive ? 'ACTIVE' : 'SUSPENDED';
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Organisations</h2>
            <p className="text-gray-500 text-sm mt-0.5">Review registration requests and manage registered organisations.</p>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Pending registration requests */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">Pending Registration Requests</h3>
              {pending.length > 0 && (
                <span className="text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5">
                  {pending.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Check each UEN against BizFile before approving. Requests can only be approved once the
              applicant has verified their email address.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Company</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">UEN</th>
                <th className="px-5 py-3 text-left font-medium">Applicant</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-left font-medium">Position</th>
                <th className="px-5 py-3 text-left font-medium">Submitted</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map((r) => (
                <tr key={r.marketing_user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.company_name}</td>
                  <td className="px-5 py-3"><OrgTypeChip type={r.org_type} /></td>
                  <td className="px-5 py-3">
                    {r.uen ? (
                      <a
                        href={`https://www.bizfile.gov.sg/ngbbizfileinternet/faces/oracle/webcenter/portalapp/pages/EntitySearch.jspx?searchText=${encodeURIComponent(r.uen)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Look this UEN up on BizFile"
                        className="font-mono text-xs text-primary-600 hover:underline"
                      >
                        {r.uen}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{r.email}</span>
                      <span
                        title={r.email_verified
                          ? 'Applicant confirmed this address via the emailed link'
                          : 'Applicant has not clicked the verification link yet'}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                          r.email_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {r.email_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{r.position ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => approve(r.marketing_user_id)}
                        disabled={actingId === r.marketing_user_id || !r.email_verified}
                        title={r.email_verified ? undefined : 'Cannot approve until the applicant verifies their email'}
                        className="text-xs font-medium text-green-600 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(r.marketing_user_id)}
                        disabled={actingId === r.marketing_user_id}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && pending.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">No pending requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search organisations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {/* Registered organisations */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Organisation</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">UEN</th>
                <th className="px-5 py-3 text-left font-medium">Staff</th>
                <th className="px-5 py-3 text-left font-medium">Registered</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((org) => (
                <tr key={org.organisation_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{org.name}</td>
                  <td className="px-5 py-3">
                    <OrgTypeChip type={org.org_type} />
                    {org.org_type === 'PROJECT' && org._count?.projects > 0 && (
                      <span className="block text-[10px] text-gray-400 mt-0.5">{org._count.projects} project(s)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{org.uen ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{org._count?.users ?? 0}</td>
                  <td className="px-5 py-3 text-gray-500">{fmtDate(org.createdAt)}</td>
                  <td className="px-5 py-3"><Badge status={org.isActive ? 'ACTIVE' : 'SUSPENDED'} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleStatus(org)}
                        disabled={actingId === org.organisation_id}
                        className={`text-xs font-medium hover:underline disabled:opacity-50 ${org.isActive ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {actingId === org.organisation_id ? '…' : org.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">No organisations found.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
