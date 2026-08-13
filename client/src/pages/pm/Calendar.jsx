import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CalendarMonth from '../../components/CalendarMonth';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';
import { useAuth } from '../../context/AuthContext';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function PMCalendar() {
  const { user } = useAuth();
  // A project-based organisation has no roster, so promising shifts is misleading.
  const isProjectOrg = user?.org_type === 'PROJECT';
  const [view, setView] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const from = ymd(new Date(view.year, view.month, 1));
    const to = ymd(new Date(view.year, view.month + 1, 0));
    api.get(`/pm/calendar?from=${from}&to=${to}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load calendar.'));
  }, [view]);

  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const today = () => { const n = new Date(); setView({ year: n.getFullYear(), month: n.getMonth() }); };

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Calendar</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isProjectOrg
              ? 'Task start / deadline dates, approved leave and unavailability across your team.'
              : 'Shifts, approved leave, unavailability and task start / deadline dates across your team.'}
          </p>
        </div>
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        <CalendarMonth year={view.year} month={view.month} data={data} onPrev={prev} onNext={next} onToday={today} scope="manager" />
      </div>
    </DashboardLayout>
  );
}
