import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home from './pages/public/Home';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrgAdminDashboard from './pages/org-admin/OrgAdminDashboard';
import PMDashboard from './pages/pm/PMDashboard';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import TempWorkerDashboard from './pages/temp-worker/TempWorkerDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Role dashboards */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/org-admin/*" element={<OrgAdminDashboard />} />
          <Route path="/pm/*" element={<PMDashboard />} />
          <Route path="/worker/*" element={<WorkerDashboard />} />
          <Route path="/temp-worker/*" element={<TempWorkerDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}