import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Placeholder pages — to be replaced in Sprint 4
const Placeholder = ({ name }) => (
  <div className="flex items-center justify-center h-screen">
    <h1 className="text-2xl font-bold text-gray-600">{name} — Coming Soon</h1>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="Public Home" />} />
        <Route path="/login" element={<Placeholder name="Login" />} />
        <Route path="/unauthorized" element={<Placeholder name="Unauthorized" />} />
        <Route path="/admin/*" element={<Placeholder name="System Admin Dashboard" />} />
        <Route path="/org-admin/*" element={<Placeholder name="Org Admin Dashboard" />} />
        <Route path="/pm/*" element={<Placeholder name="Project Manager Dashboard" />} />
        <Route path="/worker/*" element={<Placeholder name="Permanent Worker Dashboard" />} />
        <Route path="/temp-worker/*" element={<Placeholder name="Temporary Worker Dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
