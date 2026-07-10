import DashboardLayout from '../../components/DashboardLayout';
import ScheduleList from '../../components/ScheduleList';
import ShiftChangePanel from '../../components/ShiftChangePanel';
import { WORKER_NAV } from './nav';

export default function WorkerSchedule() {
  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Employee">
      <div className="space-y-6">
        <ScheduleList endpoint="/worker/schedule" />
        <ShiftChangePanel base="/worker" />
      </div>
    </DashboardLayout>
  );
}
