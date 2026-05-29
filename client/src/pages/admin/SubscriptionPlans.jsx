import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ADMIN_NAV } from './nav';

async function apiFetch(method, path, body) {
  const res = await api.request({
    method,
    url: `/admin${path}`,
    ...(body !== undefined ? { data: body } : {}),
  });
  return res.data;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price_monthly: '',
  price_annual: '',
  max_users: '',
  features: [],
};

function PlanModal({ plan, onClose, onSaved }) {
  const editing = !!plan;
  const [form, setForm] = useState(
    editing
      ? {
          name:          plan.name,
          description:   plan.description ?? '',
          price_monthly: String(plan.price_monthly),
          price_annual:  String(plan.price_annual),
          max_users:     plan.max_users != null ? String(plan.max_users) : '',
          features:      plan.features.map((f) => f.feature_name),
        }
      : { ...EMPTY_FORM, features: [] },
  );
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function addFeature() {
    const v = featureInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, features: [...f.features, v] }));
    setFeatureInput('');
  }

  function removeFeature(i) {
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name:          form.name.trim(),
        description:   form.description.trim() || null,
        price_monthly: parseFloat(form.price_monthly),
        price_annual:  parseFloat(form.price_annual),
        max_users:     form.max_users !== '' ? parseInt(form.max_users, 10) : null,
      };

      if (!editing) {
        body.features = form.features;
        const res = await apiFetch('POST', '/plans', body);
        onSaved(res.data, false);
      } else {
        await apiFetch('PATCH', `/plans/${plan.plan_id}`, body);

        // Sync features: add new ones, remove deleted ones
        const existing = plan.features.map((f) => f.feature_name);
        const toAdd = form.features.filter((f) => !existing.includes(f));
        const toRemove = plan.features.filter((f) => !form.features.includes(f.feature_name));

        for (const f of toAdd) {
          await apiFetch('POST', `/plans/${plan.plan_id}/features`, { feature_name: f });
        }
        for (const f of toRemove) {
          await apiFetch('DELETE', `/plans/${plan.plan_id}/features/${f.feature_id}`);
        }

        const updated = await apiFetch('GET', `/plans/${plan.plan_id}`);
        onSaved(updated.data, true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Plan' : 'New Subscription Plan'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name *</label>
            <input value={form.name} onChange={set('name')} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Price (SGD) *</label>
              <input type="number" min="0" step="0.01" value={form.price_monthly} onChange={set('price_monthly')} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Annual Price (SGD) *</label>
              <input type="number" min="0" step="0.01" value={form.price_annual} onChange={set('price_annual')} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Users (leave blank for unlimited)</label>
            <input type="number" min="1" value={form.max_users} onChange={set('max_users')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Add a feature and press Enter"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={addFeature}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg">
                Add
              </button>
            </div>
            <ul className="space-y-1">
              {form.features.map((f, i) => (
                <li key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                  <span>✓ {f}</span>
                  <button type="button" onClick={() => removeFeature(i)}
                    className="text-red-400 hover:text-red-600 text-xs ml-2">Remove</button>
                </li>
              ))}
              {form.features.length === 0 && (
                <li className="text-xs text-gray-400 px-1">No features added yet.</li>
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanCard({ plan, onEdit, onToggle }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col ${plan.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">{plan.name}</h3>
            {!plan.is_active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          {plan.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-3 flex gap-6">
        <div>
          <p className="text-xs text-gray-400">Monthly</p>
          <p className="text-lg font-bold text-gray-800">S${Number(plan.price_monthly).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Annual</p>
          <p className="text-lg font-bold text-primary-600">S${Number(plan.price_annual).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Max Users</p>
          <p className="text-lg font-bold text-gray-800">{plan.max_users ?? '∞'}</p>
        </div>
      </div>

      {plan.features.length > 0 && (
        <div className="px-5 pb-3">
          <ul className="space-y-0.5">
            {plan.features.map((f) => (
              <li key={f.feature_id} className="text-xs text-gray-600 flex items-center gap-1">
                <span className="text-green-500">✓</span> {f.feature_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto px-5 py-3 border-t border-gray-50 flex gap-3">
        <button onClick={() => onEdit(plan)}
          className="text-xs text-primary-600 hover:underline font-medium">
          Edit
        </button>
        <button onClick={() => onToggle(plan)}
          className={`text-xs font-medium hover:underline ${plan.is_active ? 'text-yellow-600' : 'text-green-600'}`}>
          {plan.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalPlan, setModalPlan] = useState(undefined); // undefined=closed, null=new, plan=edit

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('GET', `/plans?include_inactive=${showInactive}`)
      .then((r) => setPlans(r.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(saved, wasEdit) {
    if (wasEdit) {
      setPlans((prev) => prev.map((p) => (p.plan_id === saved.plan_id ? saved : p)));
    } else {
      setPlans((prev) => [...prev, saved]);
    }
    setModalPlan(undefined);
  }

  async function handleToggle(plan) {
    try {
      const action = plan.is_active ? 'deactivate' : 'reactivate';
      const res = await apiFetch('PATCH', `/plans/${plan.plan_id}/${action}`);
      setPlans((prev) => prev.map((p) => (p.plan_id === res.data.plan_id ? res.data : p)));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  const visible = showInactive ? plans : plans.filter((p) => p.is_active);

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Subscription Plans</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Manage pricing tiers available to organisations.
            </p>
          </div>
          <button
            onClick={() => setModalPlan(null)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Plan
          </button>
        </div>

        {/* Toggle inactive */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded" />
          Show inactive plans
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm py-10 text-center">Loading plans…</div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-gray-500 text-sm">No subscription plans yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((plan) => (
              <PlanCard key={plan.plan_id} plan={plan} onEdit={setModalPlan} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      {modalPlan !== undefined && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setModalPlan(undefined)}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}