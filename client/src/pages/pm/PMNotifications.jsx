import DashboardLayout from '../../components/DashboardLayout';
import { PM_NAV } from './nav';

const mockNotifications = [
  { id: 1, title: 'Task acknowledged', body: 'Weishi Tan acknowledged "Build Login API".', time: '10 min ago', read: false },
  { id: 2, title: 'Task overdue', body: '"Database Performance Review" due 22 May is still in progress.', time: '1 hr ago', read: false },
  { id: 3, title: 'Auto-allocation complete', body: '1 task was successfully auto-allocated to available staff.', time: '3 hr ago', read: true },
  { id: 4, title: 'New task created', body: 'You created "Write API Documentation" — pending allocation.', time: '1 day ago', read: true },
];

export default function PMNotifications() {
  return (
    <DashboardLayout navItems={PM_NAV} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
            <p className="text-gray-500 text-sm mt-0.5">Task updates and allocation alerts.</p>
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