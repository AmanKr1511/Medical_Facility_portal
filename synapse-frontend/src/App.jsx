import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, homePathForRole, useAuth } from './core/auth';
import RoleLayout from './core/layout/RoleLayout';
import { appointmentRoutes, loginRoutes, modules } from './modules';

/**
 * Routing is generated from the module registry (src/modules/index.js).
 * To add or replace a role's UI, edit the registry, not this file.
 */
export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? homePathForRole(user.role) : '/login'} replace />}
      />

      {loginRoutes.map((r) => (
        <Route key={r.path} {...r} />
      ))}

      {appointmentRoutes.map((r) => (
        <Route key={r.path} {...r} />
      ))}


      {modules.map((m) => (
        <Route
          key={m.role}
          path={`${m.basePath}/*`}
          element={
            <ProtectedRoute role={m.role}>
              <RoleLayout module={m} />
            </ProtectedRoute>
          }
        >
          {m.routes.map((r) => (
            <Route key={r.path ?? 'index'} {...r} />
          ))}
          <Route path="*" element={<Navigate to={m.basePath} replace />} />
        </Route>
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
