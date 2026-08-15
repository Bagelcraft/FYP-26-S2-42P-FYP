import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route-level counterpart to the server's requireOrgType middleware, and to the
// `orgTypes` field on nav items.
//
// Hiding a link in the sidebar is not the same as making the page unreachable —
// a project-based organisation has no roster, so a worker there could still type
// /worker/schedule and land on a shift page that can only ever be empty. This
// closes that gap, so the three layers agree: the nav hides it, the route blocks
// it, and the API refuses it.
//
// An unknown org type (a session predating the field) is allowed through, the
// same fallback DashboardLayout uses — the API remains the real boundary, so the
// worst case is a page that renders empty rather than one that wrongly 404s.
export default function RequireOrgType({ allow, children }) {
  const { user } = useAuth();
  const orgType = user?.org_type ?? null;

  if (orgType && !allow.includes(orgType)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
