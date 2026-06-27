import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/enquiries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEnquiries(Array.isArray(data) ? data : []);
    } catch {
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const openEnquiry = (enquiry) => {
    setSelected(enquiry);
    setResponse('');
  };

  const handleRespond = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/enquiries/${selected.enquiry_id}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ response_message: response }),
      });
      if (!res.ok) throw new Error();
      showToast('Response sent successfully.');
      setSelected(null);
      fetchEnquiries();
    } catch {
      showToast('Failed to send response.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await fetch(`${API_BASE}/admin/enquiries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Enquiry deleted.');
      if (selected?.enquiry_id === id) setSelected(null);
      fetchEnquiries();
    } catch {
      showToast('Failed to delete enquiry.', true);
    }
  };

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Contact Enquiries</h2>
          <p className="text-gray-500 text-sm mt-0.5">Messages submitted via the public Contact Us form.</p>
        </div>

        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {toast.msg}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading enquiries...</div>
          ) : enquiries.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No enquiries yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">From</th>
                  <th className="px-5 py-3 text-left font-medium">Subject</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Received</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enquiries.map((e) => (
                  <tr key={e.enquiry_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{e.name || '—'}</p>
                      <p className="text-gray-400 text-xs">{e.email || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{e.subject}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${e.status === 'RESPONDED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {e.status === 'RESPONDED' ? 'Responded' : 'Open'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(e.created_at)}</td>
                    <td className="px-5 py-3 flex items-center gap-2">
                      <button
                        onClick={() => openEnquiry(e)}
                        className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View / Reply
                      </button>
                      <button
                        onClick={() => handleDelete(e.enquiry_id)}
                        className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-7 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{selected.subject}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{selected.name || 'Anonymous'} · {selected.email || 'No email'} · {formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selected.message}
            </div>

            {selected.status === 'RESPONDED' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Response sent</p>
                  {selected.responded_at && (
                    <span className="text-xs text-gray-400">{formatDate(selected.responded_at)}</span>
                  )}
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800 leading-relaxed whitespace-pre-wrap">
                  {selected.response_message || '(no message recorded)'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Your Reply</label>
                <textarea
                  rows={4}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <button
                  onClick={handleRespond}
                  disabled={saving || !response.trim()}
                  className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
