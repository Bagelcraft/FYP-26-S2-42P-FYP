import DashboardLayout from '../../components/DashboardLayout';
import ScheduleList from '../../components/ScheduleList';
import ShiftChangePanel from '../../components/ShiftChangePanel';
import { TEMP_NAV } from './nav';

export default function TempSchedule() {
  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <div className="space-y-6">
        <ScheduleList endpoint="/temp-worker/schedule" />
        <ShiftChangePanel base="/temp-worker" />
      </div>
    </DashboardLayout>
  );
}
