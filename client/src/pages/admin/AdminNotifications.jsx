import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const mockNotifications = [
  { id: 1, title: 'LogiCore Asia subscription expired', body: 'Organisation LogiCore Asia has not renewed their subscription.', time: '1 hr ago', read: false },
  { id: 2, title: 'New organisation registered', body: 'BuildTech Solutions has registered and is awaiting review.', time: '3 hr ago', read: false },
  { id: 3, title: 'System backup completed', body: 'Scheduled backup completed successfully.', time: '6 hr ago', read: true },
  { id: 4, title: 'Email service not configured', body: 'SMTP settings are missing. Notifications may not be delivered.', time: '1 day ago', read: true },
];

export default function AdminNotifications() {
  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
            <p className="text-gray-500 text-sm mt-0.5">System alerts and platform-level events.</p>
          </div>
          <button className="text-sm text-primary-600 hover:underline">Mark all as read</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {mockNotifications.map((n) => (
            <div key={n.id} className={`px-5 py-4 flex gap-4 ${n.read ? '' : 'bg-primary-50/40'}`}>
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-primary-500'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${n.read ? 'text-gray-600' : 'text-gray-800'}`}>{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{n.time}</span>
            </div>
          ))}
          {mockNotifications.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No notifications.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}