import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';

const mockDepts = [
  { id: 1, name: 'Engineering', head: 'Basil Hia', staff: 8, description: 'Software development and infrastructure.' },
  { id: 2, name: 'Operations', head: 'Alson Lim', staff: 4, description: 'Day-to-day business operations and logistics.' },
];

export default function Departments() {
  const [showForm, setShowForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head: '', description: '' });

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Departments</h2>
            <p className="text-gray-500 text-sm mt-0.5">Organise your staff into departments.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Department
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">New Department</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Department Name</label>
                <input
                  type="text"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Marketing"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Department Head</label>
                <input
                  type="text"
                  value={newDept.head}
                  onChange={(e) => setNewDept({ ...newDept, head: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={newDept.description}
                onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
              <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
            </div>
          </div>
        )}

        {/* Department cards */}
        <div className="grid lg:grid-cols-2 gap-4">
          {mockDepts.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">{d.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{d.description}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Head</p>
                  <p className="font-medium text-gray-700 mt-0.5">{d.head}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Staff Count</p>
                  <p className="font-medium text-gray-700 mt-0.5">{d.staff}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}