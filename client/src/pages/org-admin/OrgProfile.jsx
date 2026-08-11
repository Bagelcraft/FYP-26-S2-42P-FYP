import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const ORG_TYPES = [
  {
    value: 'PROJECT',
    icon: '🗂️',
    label: 'Project-based',
    blurb: 'Work is grouped into projects with a start and end date, and allocated to a named pool of resources.',
  },
  {
    value: 'NON_PROJECT',
    icon: '🕐',
    label: 'Shift-based',
    blurb: 'Work is scheduled against recurring shift templates and staff are rostered onto them by date.',
  },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function OrgProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [switchingType, setSwitchingType] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_BASE}/org-admin/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const org = d.data ?? d;
        setProfile(org);
        setName(org.name ?? '');
        setFiscalMonth(org.fiscal_year_start_month ?? 1);
      })
      .catch(() => showToast('Failed to load profile.', true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/org-admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), fiscal_year_start_month: Number(fiscalMonth) }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProfile((prev) => ({ ...prev, name: updated.data?.name ?? name.trim(), fiscal_year_start_month: updated.data?.fiscal_year_start_month ?? Number(fiscalMonth) }));
      showToast('Organisation profile updated successfully.');
    } catch {
      showToast('Failed to save changes.', true);
    } finally {
      setSaving(false);
    }
  };

  // Changing the scheduling model reshapes every portal, so it is deliberately a
  // separate, confirmed action rather than part of the general "save details" form.
  // The server refuses (409) if existing projects or a roster would be orphaned.
  const changeOrgType = async (next) => {
    const target = ORG_TYPES.find((t) => t.value === next);
    if (!window.confirm(
      `Switch your organisation to ${target.label} scheduling?

`
      + 'This changes which features every member of your organisation sees.',
    )) return;

    setSwitchingType(true);
    try {
      const res = await fetch(`${API_BASE}/org-admin/org-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ org_type: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Failed to change the scheduling model.');
      setProfile((prev) => ({ ...prev, org_type: next }));
      showToast(`Now using ${target.label} scheduling. Sign out and back in to refresh your menu.`);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSwitchingType(false);
    }
  };

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-SG', { dateStyle: 'medium' }) : '—';

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Organisation Profile</h2>
          <p className="text-gray-500 text-sm mt-0.5">View and update your organisation's details.</p>
        </div>

        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            Loading profile...
          </div>
        ) : (
          <>
            {/* Read-only info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {[
                { label: 'Organisation ID', value: `#${profile?.organisation_id}` },
                { label: 'Status', value: profile?.isActive ? 'Active' : 'Inactive', badge: true, active: profile?.isActive },
                { label: 'Registered On', value: formatDate(profile?.createdAt) },
                { label: 'Financial Year Starts', value: MONTHS[(profile?.fiscal_year_start_month ?? 1) - 1] },
                {
                  label: 'Subscription',
                  value: profile?.activeSubscription
                    ? `${profile.activeSubscription.status} · expires ${formatDate(profile.activeSubscription.end_date)}`
                    : 'No active subscription',
                },
              ].map(({ label, value, badge, active }) => (
                <div key={label} className="px-6 py-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  {badge ? (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {value}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-800">{value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Scheduling model */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800">Scheduling Model</h3>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">
                How your organisation plans work. This decides which features appear for
                everyone — managers, staff and yourself.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {ORG_TYPES.map((t) => {
                  const selected = profile?.org_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={selected || switchingType}
                      onClick={() => changeOrgType(t.value)}
                      className={`text-left rounded-xl border p-4 transition-colors ${
                        selected
                          ? 'border-primary-500 bg-primary-50 cursor-default'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-800">
                          <span aria-hidden="true" className="mr-1.5">{t.icon}</span>{t.label}
                        </span>
                        {selected && (
                          <span className="text-[10px] font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{t.blurb}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Switching is blocked while data only the current model can hold still exists —
                delete your projects, or clear the roster, first.
              </p>
            </div>

            {/* Editable fields */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-5">Edit Details</h3>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Organisation Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={150}
                    placeholder="e.g. TechCorp Pte Ltd"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Financial year starts in
                  </label>
                  <select
                    value={fiscalMonth}
                    onChange={(e) => setFiscalMonth(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">Used to prorate leave for staff who join partway through the year.</p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving || !name.trim() || (name.trim() === profile?.name && Number(fiscalMonth) === (profile?.fiscal_year_start_month ?? 1))}
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setName(profile?.name ?? ''); setFiscalMonth(profile?.fiscal_year_start_month ?? 1); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
