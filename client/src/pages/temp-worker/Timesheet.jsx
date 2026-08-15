import DashboardLayout from '../../components/DashboardLayout';
import TimesheetPanel from '../../components/TimesheetPanel';
import { TEMP_NAV } from './nav';

// A temporary worker is engaged per task under either scheduling model and never
// clocks in, so this is always the task-based sheet — in a shift-based company
// just as much as in a project-based one.
export default function Timesheet() {
  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <TimesheetPanel basePath="/temp-worker" />
    </DashboardLayout>
  );
}
