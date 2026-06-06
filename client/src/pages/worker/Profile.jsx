import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { WORKER_NAV } from './nav';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function Profile() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name ?? '', email: user?.email ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function startEdit() {
    setForm({ full_name: user?.full_name ?? '', email: user?.email ?? '' });
    setError('');
    setSuccess('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
  }

  async function save() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/worker/profile', { full_name: form.full_name.trim(), email: form.email.trim() });
      // Update auth context so the sidebar name stays in sync
      const token = localStorage.getItem('token');
      login({ ...user, full_name: data.data.full_name, email: data.data.email }, token);
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.full_name ?? 'W').charAt(0).toUpperCase();

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your personal details.</p>
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">{success}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{user?.full_name}</h3>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              {editing ? (
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Employee Type</label>
              <p className="text-sm font-medium text-gray-700">Permanent Worker</p>
            </div>
          </div>

          {editing && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}