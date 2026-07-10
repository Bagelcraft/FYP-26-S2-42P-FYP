import DashboardLayout from '../../components/DashboardLayout';
import NotificationsList from '../../components/NotificationsList';
import { ADMIN_NAV } from './nav';

export default function AdminNotifications() {
  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <NotificationsList subtitle="System alerts and platform-level events." />
    </DashboardLayout>
  );
}
