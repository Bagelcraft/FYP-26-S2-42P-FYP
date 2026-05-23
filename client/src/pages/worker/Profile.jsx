import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { WORKER_NAV } from './nav';

const initialSkills = ['JavaScript', 'React'];

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [skills, setSkills] = useState(initialSkills);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (s) => setSkills(skills.filter((sk) => sk !== s));

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your personal details and registered skills.</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
              W
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Weishi Tan</h3>
              <p className="text-sm text-gray-500">Software Developer · Engineering</p>
              <p className="text-sm text-gray-400">weishi@techcorp.com</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: 'Weishi Tan' },
              { label: 'Employee Type', value: 'Permanent Worker' },
              { label: 'Department', value: 'Engineering' },
              { label: 'Job Title', value: 'Software Developer' },
              { label: 'Email', value: 'weishi@techcorp.com' },
              { label: 'Phone', value: '+65 9123 4567' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                {editing ? (
                  <input
                    defaultValue={f.value}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-700">{f.value}</p>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="mt-4 flex justify-end">
              <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">My Skills</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <div key={s} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 text-sm font-medium px-3 py-1.5 rounded-full">
                <span>{s}</span>
                <button onClick={() => removeSkill(s)} className="text-primary-400 hover:text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add a skill..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={addSkill}
              className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}