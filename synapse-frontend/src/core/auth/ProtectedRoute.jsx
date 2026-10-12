import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathForRole } from './roles';

/** Renders children only for a logged-in user holding `role`. */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }
  return children;
}
