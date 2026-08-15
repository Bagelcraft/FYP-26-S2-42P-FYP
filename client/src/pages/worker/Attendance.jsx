import DashboardLayout from '../../components/DashboardLayout';
import TimesheetPanel from '../../components/TimesheetPanel';
import { WORKER_NAV } from './nav';

// Shift-based organisations get the clock-in/out sheet; project-based ones get
// the task sheet instead, since their permanent staff have no roster to clock
// against. TimesheetPanel picks whichever the API says applies.
export default function Attendance() {
  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Employee">
      <TimesheetPanel basePath="/worker" />
    </DashboardLayout>
  );
}
