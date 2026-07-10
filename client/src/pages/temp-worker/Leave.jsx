import DashboardLayout from '../../components/DashboardLayout';
import LeavePanel from '../../components/LeavePanel';
import { TEMP_NAV } from './nav';

export default function TempLeave() {
  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <LeavePanel base="/temp-worker" />
    </DashboardLayout>
  );
}
