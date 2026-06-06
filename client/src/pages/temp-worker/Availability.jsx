import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';
import api from '../../utils/api';

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(start, end) {
  const t = (dt) => new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${t(start)} – ${t(end)}`;
}

function toLocalInputs(dt) {
  const d = new Date(dt);
  const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const time = [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':');
  return { date, time };
}

export default function Availability() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', start: '', end: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', start: '', end: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get('/temp-worker/availability')
      .then((r) => setSlots(r.data.data))
      .catch(() => setError('Failed to load availability.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.date || !form.start || !form.end) {
      setError('Please fill in all fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/temp-worker/availability', {
        start_datetime: `${form.date}T${form.start}`,
        end_datetime: `${form.date}T${form.end}`,
      });
      setSlots((prev) => [...prev, res.data.data]);
      setForm({ date: '', start: '', end: '' });
      setShowForm(false);
    } catch (err) {
      const serverMsg =
        err.response?.data?.errors?.map((e) => e.msg).join(', ') ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save slot.';
      setError(serverMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (slot) => {
    const start = toLocalInputs(slot.start_datetime);
    const end = toLocalInputs(slot.end_datetime);
    setEditForm({ date: start.date, start: start.time, end: end.time });
    setEditingId(slot.availability_id);
    setError('');
  };

  const handleUpdate = async () => {
    if (!editForm.date || !editForm.start || !editForm.end) {
      setError('Please fill in all fields.');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const res = await api.put(`/temp-worker/availability/${editingId}`, {
        start_datetime: `${editForm.date}T${editForm.start}`,
        end_datetime: `${editForm.date}T${editForm.end}`,
      });
      setSlots((prev) => prev.map((s) => s.availability_id === editingId ? res.data.data : s));
      setEditingId(null);
    } catch (err) {
      const serverMsg =
        err.response?.data?.errors?.map((e) => e.msg).join(', ') ||
        err.response?.data?.message ||
        err.message ||
        'Failed to update slot.';
      setError(serverMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/temp-worker/availability/${id}`);
      setSlots((prev) => prev.filter((s) => s.availability_id !== id));
    } catch {
      setError('Failed to remove slot.');
    }
  };

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Availability</h2>
            <p className="text-gray-500 text-sm mt-0.5">Tell us when you are available so tasks can be allocated to you.</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); }}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Slot
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">New Availability Slot</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {loading && <p className="px-5 py-4 text-sm text-gray-400">Loading…</p>}
          {!loading && slots.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No availability slots set.</p>
          )}
          {slots.map((slot) =>
            editingId === slot.availability_id ? (
              <div key={slot.availability_id} className="px-5 py-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Edit Slot</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <input type="time" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <input type="time" value={editForm.end} onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditingId(null); setError(''); }} className="text-sm text-gray-500 hover:underline px-3 py-1.5">Cancel</button>
                  <button onClick={handleUpdate} disabled={updating}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50">
                    {updating ? 'Saving…' : 'Update'}
                  </button>
                </div>
              </div>
            ) : (
              <div key={slot.availability_id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatDate(slot.start_datetime)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTime(slot.start_datetime, slot.end_datetime)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={slot.status} />
                  <button onClick={() => handleEditStart(slot)} className="text-xs text-gray-400 hover:text-primary-600 transition-colors">Edit</button>
                  <button onClick={() => handleRemove(slot.availability_id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
