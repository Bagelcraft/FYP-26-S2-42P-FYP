import DashboardLayout from '../../components/DashboardLayout';
import NotificationsList from '../../components/NotificationsList';
import { TEMP_NAV } from './nav';

export default function TempNotifications() {
  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <NotificationsList subtitle="Your task and shift alerts." />
    </DashboardLayout>
  );
}
