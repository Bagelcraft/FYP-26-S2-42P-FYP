import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';

const initialSkills = ['JavaScript', 'React', 'SQL', 'Python', 'UI/UX Design', 'Node.js', 'TypeScript'];

export default function Skills() {
  const [skills, setSkills] = useState(initialSkills);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => setSkills(skills.filter((s) => s !== skill));

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Skills Registry</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage the skills available for task allocation and staff profiles.</p>
        </div>

        {/* Add skill */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Add New Skill</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              placeholder="e.g. Docker"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={addSkill}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add Skill
            </button>
          </div>
        </div>

        {/* Skills list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">All Skills</h3>
            <span className="text-xs text-gray-400">{skills.length} skills registered</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div key={skill} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full">
                <span>{skill}</span>
                <button
                  onClick={() => removeSkill(skill)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-gray-400 text-sm">No skills registered yet.</p>
            )}
          </div>
        </div>

        {/* Skills usage summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Skill Usage</h3>
          <div className="space-y-3">
            {[
              { skill: 'JavaScript', staffCount: 2, taskCount: 3 },
              { skill: 'React', staffCount: 1, taskCount: 2 },
              { skill: 'SQL', staffCount: 2, taskCount: 1 },
              { skill: 'Python', staffCount: 2, taskCount: 0 },
            ].map((s) => (
              <div key={s.skill} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">{s.skill}</span>
                <div className="flex gap-4 text-gray-400 text-xs">
                  <span>{s.staffCount} staff</span>
                  <span>{s.taskCount} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}