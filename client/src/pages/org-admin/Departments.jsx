import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

export default function Departments() {
  const [depts, setDepts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState(null); // null = creating new
  const [form, setForm]         = useState({ name: '' });
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    api.get('/org-admin/departments')
      .then((r) => setDepts(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditDept(null);
    setForm({ name: '' });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(d) {
    setEditDept(d);
    setForm({ name: d.name });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const body = { name: form.name.trim() };
    try {
      if (editDept) {
        const r = await api.patch(`/org-admin/departments/${editDept.department_id}`, body);
        setDepts((prev) => prev.map((d) => d.department_id === editDept.department_id ? r.data.data : d));
      } else {
        const r = await api.post('/org-admin/departments', body);
        setDepts((prev) => [...prev, r.data.data]);
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(dept) {
    if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/org-admin/departments/${dept.department_id}`);
      setDepts((prev) => prev.filter((d) => d.department_id !== dept.department_id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Department Management</h2>
            <p className="text-gray-500 text-sm mt-0.5">Organise your staff into departments.</p>
          </div>
          <button onClick={openCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Department
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Create / Edit form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">{editDept ? 'Edit Department' : 'New Department'}</h3>
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Department Name *</label>
                <input required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Marketing" />
                <p className="text-xs text-gray-400 mt-1">Assign roles to this department from the Role Management page.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {depts.map((d) => (
              <div key={d.department_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-base">{d.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{d._count?.tasks ?? 0} task{(d._count?.tasks ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(d)} className="text-xs text-primary-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(d)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-1.5">Roles ({d.roles?.length ?? 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(d.roles ?? []).map((r) => (
                      <span key={r.role_id} className="bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{r.role_name}</span>
                    ))}
                    {(d.roles?.length ?? 0) === 0 && <span className="text-xs text-gray-400">No roles assigned yet.</span>}
                  </div>
                </div>
              </div>
            ))}
            {depts.length === 0 && (
              <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No departments yet.</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}