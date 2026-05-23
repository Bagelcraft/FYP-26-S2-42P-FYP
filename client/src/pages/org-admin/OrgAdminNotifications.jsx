import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';

const mockNotifications = [
  { id: 1, title: 'New staff registered', body: 'Rachel Ng has been added as a Temporary Worker in Operations.', time: '30 min ago', read: false },
  { id: 2, title: 'Task overdue', body: 'Database Performance Review assigned to Rachel Ng is past its due date.', time: '2 hr ago', read: false },
  { id: 3, title: 'Leave request submitted', body: 'Weishi Tan has submitted an annual leave request for 26–28 May.', time: '5 hr ago', read: true },
  { id: 4, title: 'Department head updated', body: 'Operations department head changed to Alson Lim.', time: '1 day ago', read: true },
];

export default function OrgAdminNotifications() {
  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
            <p className="text-gray-500 text-sm mt-0.5">Alerts and updates for your organisation.</p>
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
        </div>
      </div>
    </DashboardLayout>
  );
}