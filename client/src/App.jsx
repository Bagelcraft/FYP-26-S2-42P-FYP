import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home from './pages/public/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import Organisations from './pages/admin/Organisations';
import AuditLogs from './pages/admin/AuditLogs';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminEnquiries from './pages/admin/AdminEnquiries';
import AdminLandingContent from './pages/admin/AdminLandingContent';

// Org Admin
import OrgAdminDashboard from './pages/org-admin/OrgAdminDashboard';
import Staff from './pages/org-admin/Staff';
import Departments from './pages/org-admin/Departments';
import Skills from './pages/org-admin/Skills';
import OrgAdminNotifications from './pages/org-admin/OrgAdminNotifications';
import StaffRoles from './pages/org-admin/StaffRoles';
import Shifts from './pages/org-admin/Shifts';
import OrgSubscription from './pages/org-admin/Subscription';
import OrgProfile from './pages/org-admin/OrgProfile';
import ProfileChangeRequests from './pages/org-admin/ProfileChangeRequests';
import ShiftChangeRequests from './pages/org-admin/ShiftChangeRequests';

// Manager
import PMDashboard from './pages/pm/PMDashboard';
import Tasks from './pages/pm/Tasks';
import Team from './pages/pm/Team';
import Allocate from './pages/pm/Allocate';
import PMCalendar from './pages/pm/Calendar';
import PMLeave from './pages/pm/Leave';
import Testimonials from './pages/pm/Testimonials';
import Reports from './pages/pm/Reports';
import PMNotifications from './pages/pm/PMNotifications';
// NOTE: Subscription import removed — page no longer mounted under the Manager portal.

// Permanent Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerMyTasks from './pages/worker/MyTasks';
import WorkerSchedule from './pages/worker/Schedule';
import WorkerCalendar from './pages/worker/Calendar';
import Leave from './pages/worker/Leave';
import WorkerAttendance from './pages/worker/Attendance';
import WorkerNotifications from './pages/worker/Notifications';
import WorkerProfile from './pages/worker/Profile';

// Temporary Worker
import TempWorkerDashboard from './pages/temp-worker/TempWorkerDashboard';
import TempMyTasks from './pages/temp-worker/MyTasks';
import TempSchedule from './pages/temp-worker/Schedule';
import TempNotifications from './pages/temp-worker/Notifications';
import TempProfile from './pages/temp-worker/Profile';

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

          {/* System Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/organisations" element={<Organisations />} />
          <Route path="/admin/enquiries" element={<AdminEnquiries />} />
          <Route path="/admin/landing-content" element={<AdminLandingContent />} />
          <Route path="/admin/logs" element={<AuditLogs />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />

          {/* Organisation Admin */}
          <Route path="/org-admin" element={<OrgAdminDashboard />} />
          <Route path="/org-admin/staff" element={<Staff />} />
          <Route path="/org-admin/departments" element={<Departments />} />
          <Route path="/org-admin/skills" element={<Skills />} />
          <Route path="/org-admin/roles" element={<StaffRoles />} />
          <Route path="/org-admin/shifts" element={<Shifts />} />
          <Route path="/org-admin/subscription" element={<OrgSubscription />} />
          <Route path="/org-admin/profile" element={<OrgProfile />} />
          <Route path="/org-admin/profile-change-requests" element={<ProfileChangeRequests />} />
          <Route path="/org-admin/shift-change-requests" element={<ShiftChangeRequests />} />
          <Route path="/org-admin/notifications" element={<OrgAdminNotifications />} />

          {/* Manager */}
          <Route path="/pm" element={<PMDashboard />} />
          <Route path="/pm/tasks" element={<Tasks />} />
          <Route path="/pm/team" element={<Team />} />
          <Route path="/pm/allocate" element={<Allocate />} />
          <Route path="/pm/calendar" element={<PMCalendar />} />
          <Route path="/pm/leave" element={<PMLeave />} />
          <Route path="/pm/testimonials" element={<Testimonials />} />
          <Route path="/pm/reports" element={<Reports />} />
          <Route path="/pm/notifications" element={<PMNotifications />} />
          {/* NOTE: /pm/subscription route removed. */}

          {/* Permanent Worker */}
          <Route path="/worker" element={<WorkerDashboard />} />
          <Route path="/worker/tasks" element={<WorkerMyTasks />} />
          <Route path="/worker/schedule" element={<WorkerSchedule />} />
          <Route path="/worker/calendar" element={<WorkerCalendar />} />
          <Route path="/worker/leave" element={<Leave />} />
          <Route path="/worker/attendance" element={<WorkerAttendance />} />
          <Route path="/worker/notifications" element={<WorkerNotifications />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />

          {/* Temporary Worker */}
          <Route path="/temp-worker" element={<TempWorkerDashboard />} />
          <Route path="/temp-worker/tasks" element={<TempMyTasks />} />
          <Route path="/temp-worker/schedule" element={<TempSchedule />} />
          <Route path="/temp-worker/notifications" element={<TempNotifications />} />
          <Route path="/temp-worker/profile" element={<TempProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
