import DashboardLayout from '../../components/DashboardLayout';
import NotificationsList from '../../components/NotificationsList';
import { ORG_ADMIN_NAV } from './nav';

export default function OrgAdminNotifications() {
  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <NotificationsList subtitle="Alerts and updates for your organisation." />
    </DashboardLayout>
  );
}
