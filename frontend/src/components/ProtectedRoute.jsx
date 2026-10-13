// frontend/src/components/ProtectedRoute.jsx
// Guards a group of pages.
//   <Route element={<ProtectedRoute role="creator" />}> ...creator pages... </Route>
// - still checking a saved login  -> shows a small loading message
// - logged out                    -> sends you to the sign-in page ("/")
// - wrong role for this section   -> sends you to your own home page
// - otherwise                     -> shows the page

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div role="status" style={{ padding: 40, textAlign: "center", color: "var(--mu)" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    const home = user.role === "creator" ? "/c/home" : "/b/home";
    return <Navigate to={home} replace />;
  }

  return children ?? <Outlet />;
}