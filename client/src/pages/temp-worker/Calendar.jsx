import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CalendarMonth from '../../components/CalendarMonth';
import ScheduleList from '../../components/ScheduleList';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { TEMP_NAV } from './nav';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TempCalendar() {
  const { user } = useAuth();
  // Same shape as the permanent worker's calendar, with one deliberate omission:
  // no shift-change panel. A shift change is a swap negotiated against a roster
  // the employee is committed to, and a temporary worker is engaged per task
  // rather than held to a roster — so there is nothing for them to swap.
  //
  // The month grid answers "what am I on?" under either scheduling model. In a
  // shift-based organisation the agenda of rostered shifts belongs underneath it;
  // a project-based organisation runs no roster, so the grid is tasks and
  // unavailability alone.
  const isProjectOrg = user?.org_type === 'PROJECT';
  const [view, setView] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const from = ymd(new Date(view.year, view.month, 1));
    const to = ymd(new Date(view.year, view.month + 1, 0));
    api.get(`/temp-worker/calendar?from=${from}&to=${to}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load calendar.'));
  }, [view]);

  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const today = () => { const n = new Date(); setView({ year: n.getFullYear(), month: n.getMonth() }); };

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{isProjectOrg ? 'Calendar' : 'Schedule & Calendar'}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isProjectOrg
              ? 'Your task deadlines and unavailability at a glance.'
              : 'Your shifts, task deadlines and unavailability at a glance.'}
          </p>
        </div>
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        <CalendarMonth year={view.year} month={view.month} data={data} onPrev={prev} onNext={next} onToday={today} scope="worker" showShifts={!isProjectOrg} />
        {!isProjectOrg && <ScheduleList endpoint="/temp-worker/schedule" />}
      </div>
    </DashboardLayout>
  );
}
