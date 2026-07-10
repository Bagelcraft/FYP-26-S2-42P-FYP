import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ADMIN_NAV } from './nav';
import api from '../../utils/api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

export default function AdminDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/organisations'),
      api.get('/admin/enquiries'),
      api.get('/admin/registrations'),
    ]).then(([o, e, r]) => {
      setOrgs(o.data.data ?? []);
      setEnquiries(e.data.data ?? e.data ?? []);
      setPending(r.data.data ?? []);
    }).catch((err) => setError(err.response?.data?.message || 'Failed to load overview.'));
  }, []);

  const activeOrgs = orgs.filter((o) => o.isActive).length;
  const openEnquiries = enquiries.filter((e) => e.status !== 'RESPONDED').length;

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">System Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Platform-wide health and organisation status.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ACTIVE ORGS', value: activeOrgs },
            { label: 'PENDING REGISTRATIONS', value: pending.length },
            { label: 'OPEN ENQUIRIES', value: openEnquiries },
            { label: 'TOTAL ORGS', value: orgs.length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Organisations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Organisations</h3>
              <Link to="/admin/organisations" className="text-primary-600 text-sm hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Organisation</th>
                    <th className="px-5 py-3 text-left font-medium">Staff</th>
                    <th className="px-5 py-3 text-left font-medium">Registered</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orgs.map((org) => (
                    <tr key={org.organisation_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{org.name}</td>
                      <td className="px-5 py-3 text-gray-500">{org._count?.users ?? 0}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(org.createdAt)}</td>
                      <td className="px-5 py-3"><Badge status={org.isActive ? 'ACTIVE' : 'SUSPENDED'} /></td>
                    </tr>
                  ))}
                  {orgs.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No organisations yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enquiries */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Enquiries</h3>
              <Link to="/admin/enquiries" className="text-primary-600 text-sm hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {enquiries.slice(0, 6).map((e) => (
                <div key={e.enquiry_id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.name || e.email || 'Enquiry'}</p>
                    <p className="text-xs text-gray-400 truncate">{e.subject} · {timeAgo(e.created_at)}</p>
                  </div>
                  <Badge status={e.status || 'OPEN'} />
                </div>
              ))}
              {enquiries.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No enquiries.</div>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
