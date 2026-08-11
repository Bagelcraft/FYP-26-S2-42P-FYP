import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';
import api from '../../utils/api';

// Two independent switches. Each controls email verification for one flow, so a
// system admin can relax one without touching the other — e.g. drop the step for
// staff onboarding during a demo while keeping public signups verified.
const SECTIONS = [
  {
    title: 'Email Verification',
    blurb: 'Verification proves someone can actually receive mail at the address they gave — which is what password reset depends on later.',
    toggles: [
  {
    key: 'require_registration_verification',
    title: 'Verify email on organisation registration',
    on:  'Applicants must click an emailed link before you can approve them.',
    off: 'Applicants are treated as verified immediately and appear in the approval queue straight away. You still approve every registration by hand.',
    caution: 'Turning this off means an applicant can register with an address they do not own.',
  },
  {
    key: 'require_staff_verification',
    title: 'Verify email when an org admin adds an employee',
    on:  'New employees receive a link and cannot sign in until they use it.',
    off: 'New employees can sign in as soon as their account is created.',
    caution: 'Turning this on will block new staff from signing in until they act on the email — make sure sending is configured.',
  },
    ],
  },
  {
    title: 'Email Domain Check',
    blurb: 'Before accepting an address, SmartTask asks DNS whether its domain publishes a mail server. Internal domains (test.corp) and company domains still being set up have none, so switch the check off for that flow. Address spelling is always still validated.',
    toggles: [
      {
        key: 'require_registration_domain_check',
        title: 'Check the domain when an organisation registers',
        on:  'Registration is refused if the domain has no mail server.',
        off: 'Any correctly-formed address is accepted, even on a domain that cannot receive mail.',
        caution: 'With this off, an applicant can register on a domain that will never receive your verification email.',
      },
      {
        key: 'require_staff_domain_check',
        title: 'Check the domain when an org admin adds an employee',
        on:  'Adding an employee is refused if the domain has no mail server.',
        off: 'Any correctly-formed address is accepted — use this for internal domains like company.corp.',
        caution: 'With this off, staff may be created on addresses that cannot receive password-reset emails.',
      },
    ],
  },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get('/admin/settings')
      .then((r) => setSettings(r.data.data))
      .catch(() => showToast('Failed to load settings.', true))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key) => {
    const next = !settings[key];
    setSavingKey(key);
    // Optimistic: a switch that lags behind the click feels broken.
    setSettings((prev) => ({ ...prev, [key]: next }));
    try {
      const r = await api.patch('/admin/settings', { [key]: next });
      setSettings(r.data.data);
      showToast('Setting saved.');
    } catch (err) {
      setSettings((prev) => ({ ...prev, [key]: !next }));
      showToast(err.response?.data?.message ?? 'Failed to save setting.', true);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Platform Settings</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Switches that apply across every organisation on the platform.
          </p>
        </div>

        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            Loading settings…
          </div>
        ) : SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">{section.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{section.blurb}</p>
            </div>

            <div className="divide-y divide-gray-50">
              {section.toggles.map(({ key, title, on, off, caution }) => {
                const enabled = Boolean(settings?.[key]);
                return (
                  <div key={key} className="px-6 py-5 flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{enabled ? on : off}</p>
                      <p className={`text-xs mt-2 leading-relaxed ${enabled ? 'text-gray-400' : 'text-amber-600'}`}>
                        {enabled ? null : `⚠ ${caution}`}
                      </p>
                    </div>

                    <button
                      role="switch"
                      aria-checked={enabled}
                      aria-label={title}
                      disabled={savingKey === key}
                      onClick={() => toggle(key)}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <p className="text-xs text-gray-500">
                Changes take effect immediately. Accounts created earlier keep whatever
                state they already had.
              </p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
