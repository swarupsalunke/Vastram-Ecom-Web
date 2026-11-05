import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function Protected({ children }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="page"><p>Checking session…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
export function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><p>Checking session…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
