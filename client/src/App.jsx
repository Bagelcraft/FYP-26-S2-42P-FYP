import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home from './pages/public/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Suspended from './pages/Suspended';
import NotFound from './pages/NotFound';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import Organisations from './pages/admin/Organisations';
import AdminEnquiries from './pages/admin/AdminEnquiries';
import AdminLandingContent from './pages/admin/AdminLandingContent';
import AdminSettings from './pages/admin/Settings';

// Org Admin
import OrgAdminDashboard from './pages/org-admin/OrgAdminDashboard';
import Staff from './pages/org-admin/Staff';
import Departments from './pages/org-admin/Departments';
import Skills from './pages/org-admin/Skills';
import StaffRoles from './pages/org-admin/StaffRoles';
import Shifts from './pages/org-admin/Shifts';
import OrgSubscription from './pages/org-admin/Subscription';
import OrgProfile from './pages/org-admin/OrgProfile';
import ProfileChangeRequests from './pages/org-admin/ProfileChangeRequests';
import ShiftChangeRequests from './pages/org-admin/ShiftChangeRequests';
import AuditLogs from './pages/org-admin/AuditLogs';

// Manager
import PMDashboard from './pages/pm/PMDashboard';
import Projects from './pages/pm/Projects';
import Tasks from './pages/pm/Tasks';
import Roster from './pages/pm/Roster';
import Team from './pages/pm/Team';
import Allocate from './pages/pm/Allocate';
import PMCalendar from './pages/pm/Calendar';
import PMLeave from './pages/pm/Leave';
import Testimonials from './pages/pm/Testimonials';
import Reports from './pages/pm/Reports';
// NOTE: Subscription import removed — page no longer mounted under the Manager portal.

// Permanent Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerMyTasks from './pages/worker/MyTasks';
import WorkerCalendar from './pages/worker/Calendar';
import Leave from './pages/worker/Leave';
import WorkerAttendance from './pages/worker/Attendance';
import WorkerProfile from './pages/worker/Profile';

// Temporary Worker
import TempWorkerDashboard from './pages/temp-worker/TempWorkerDashboard';
import TempMyTasks from './pages/temp-worker/MyTasks';
import TempCalendar from './pages/temp-worker/Calendar';
import TempTimesheet from './pages/temp-worker/Timesheet';
import TempProfile from './pages/temp-worker/Profile';

import RequireOrgType from './components/RequireOrgType';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/suspended" element={<Suspended />} />

          {/* System Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/organisations" element={<Organisations />} />
          <Route path="/admin/enquiries" element={<AdminEnquiries />} />
          <Route path="/admin/landing-content" element={<AdminLandingContent />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          {/* Organisation Admin */}
          <Route path="/org-admin" element={<OrgAdminDashboard />} />
          <Route path="/org-admin/staff" element={<Staff />} />
          <Route path="/org-admin/departments" element={<Departments />} />
          <Route path="/org-admin/skills" element={<Skills />} />
          <Route path="/org-admin/roles" element={<StaffRoles />} />
          <Route path="/org-admin/shifts" element={<RequireOrgType allow={['NON_PROJECT']}><Shifts /></RequireOrgType>} />
          <Route path="/org-admin/subscription" element={<OrgSubscription />} />
          <Route path="/org-admin/profile" element={<OrgProfile />} />
          <Route path="/org-admin/profile-change-requests" element={<ProfileChangeRequests />} />
          <Route path="/org-admin/shift-change-requests" element={<RequireOrgType allow={['NON_PROJECT']}><ShiftChangeRequests /></RequireOrgType>} />
          <Route path="/org-admin/audit-logs" element={<AuditLogs />} />

          {/* Manager */}
          <Route path="/pm" element={<PMDashboard />} />
          <Route path="/pm/projects" element={<RequireOrgType allow={['PROJECT']}><Projects /></RequireOrgType>} />
          <Route path="/pm/tasks" element={<Tasks />} />
          <Route path="/pm/roster" element={<RequireOrgType allow={['NON_PROJECT']}><Roster /></RequireOrgType>} />
          <Route path="/pm/team" element={<Team />} />
          <Route path="/pm/allocate" element={<Allocate />} />
          <Route path="/pm/calendar" element={<PMCalendar />} />
          <Route path="/pm/leave" element={<PMLeave />} />
          <Route path="/pm/testimonials" element={<Testimonials />} />
          <Route path="/pm/reports" element={<Reports />} />
          {/* NOTE: /pm/subscription route removed. */}

          {/* Permanent Worker */}
          <Route path="/worker" element={<WorkerDashboard />} />
          <Route path="/worker/tasks" element={<WorkerMyTasks />} />
          {/* The roster merged into Calendar; keep the old path working. */}
          <Route path="/worker/schedule" element={<Navigate to="/worker/calendar" replace />} />
          <Route path="/worker/calendar" element={<WorkerCalendar />} />
          <Route path="/worker/leave" element={<Leave />} />
          <Route path="/worker/attendance" element={<WorkerAttendance />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />

          {/* Temporary Worker */}
          <Route path="/temp-worker" element={<TempWorkerDashboard />} />
          <Route path="/temp-worker/tasks" element={<TempMyTasks />} />
          {/* The roster merged into Calendar; keep the old path working. */}
          <Route path="/temp-worker/schedule" element={<Navigate to="/temp-worker/calendar" replace />} />
          <Route path="/temp-worker/calendar" element={<TempCalendar />} />
          <Route path="/temp-worker/timesheet" element={<TempTimesheet />} />
          <Route path="/temp-worker/profile" element={<TempProfile />} />

          {/* Catch-all: an unmatched path must never render a blank page. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
