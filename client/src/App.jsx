import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home from './pages/public/Home';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import Organisations from './pages/admin/Organisations';
import AuditLogs from './pages/admin/AuditLogs';
import AdminNotifications from './pages/admin/AdminNotifications';
import SubscriptionPlans from './pages/admin/SubscriptionPlans';

// Org Admin
import OrgAdminDashboard from './pages/org-admin/OrgAdminDashboard';
import Staff from './pages/org-admin/Staff';
import Departments from './pages/org-admin/Departments';
import Skills from './pages/org-admin/Skills';
import OrgAdminNotifications from './pages/org-admin/OrgAdminNotifications';
import StaffRoles from './pages/org-admin/StaffRoles';

// Project Manager
import PMDashboard from './pages/pm/PMDashboard';
import Tasks from './pages/pm/Tasks';
import Allocate from './pages/pm/Allocate';
import Reports from './pages/pm/Reports';
import PMNotifications from './pages/pm/PMNotifications';

// Permanent Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerMyTasks from './pages/worker/MyTasks';
import WorkerAvailability from './pages/worker/Availability';
import Leave from './pages/worker/Leave';
import WorkerAttendance from './pages/worker/Attendance';
import WorkerProfile from './pages/worker/Profile';

// Temporary Worker
import TempWorkerDashboard from './pages/temp-worker/TempWorkerDashboard';
import TempMyTasks from './pages/temp-worker/MyTasks';
import TempAvailability from './pages/temp-worker/Availability';
import TempAttendance from './pages/temp-worker/Attendance';
import TempProfile from './pages/temp-worker/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* System Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/organisations" element={<Organisations />} />
          <Route path="/admin/plans" element={<SubscriptionPlans />} />
          <Route path="/admin/logs" element={<AuditLogs />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />

          {/* Organisation Admin */}
          <Route path="/org-admin" element={<OrgAdminDashboard />} />
          <Route path="/org-admin/staff" element={<Staff />} />
          <Route path="/org-admin/departments" element={<Departments />} />
          <Route path="/org-admin/skills" element={<Skills />} />
          <Route path="/org-admin/roles" element={<StaffRoles />} />
          <Route path="/org-admin/notifications" element={<OrgAdminNotifications />} />

          {/* Project Manager */}
          <Route path="/pm" element={<PMDashboard />} />
          <Route path="/pm/tasks" element={<Tasks />} />
          <Route path="/pm/allocate" element={<Allocate />} />
          <Route path="/pm/reports" element={<Reports />} />
          <Route path="/pm/notifications" element={<PMNotifications />} />

          {/* Permanent Worker */}
          <Route path="/worker" element={<WorkerDashboard />} />
          <Route path="/worker/tasks" element={<WorkerMyTasks />} />
          <Route path="/worker/availability" element={<WorkerAvailability />} />
          <Route path="/worker/leave" element={<Leave />} />
          <Route path="/worker/attendance" element={<WorkerAttendance />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />

          {/* Temporary Worker */}
          <Route path="/temp-worker" element={<TempWorkerDashboard />} />
          <Route path="/temp-worker/tasks" element={<TempMyTasks />} />
          <Route path="/temp-worker/availability" element={<TempAvailability />} />
          <Route path="/temp-worker/attendance" element={<TempAttendance />} />
          <Route path="/temp-worker/profile" element={<TempProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}