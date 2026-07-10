import DashboardLayout from '../../components/DashboardLayout';
import NotificationsList from '../../components/NotificationsList';
import { PM_NAV, PM_SECONDARY } from './nav';

export default function PMNotifications() {
  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <NotificationsList subtitle="Task, allocation and team alerts." />
    </DashboardLayout>
  );
}
