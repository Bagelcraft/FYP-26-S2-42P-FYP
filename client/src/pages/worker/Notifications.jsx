import DashboardLayout from '../../components/DashboardLayout';
import NotificationsList from '../../components/NotificationsList';
import { WORKER_NAV } from './nav';

export default function WorkerNotifications() {
  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Employee">
      <NotificationsList subtitle="Your task and schedule alerts." />
    </DashboardLayout>
  );
}
