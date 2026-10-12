import { Navigate, useNavigate } from 'react-router-dom';
import { ROLES, homePathForRole, useAuth } from '../../../core/auth';
import { Button, LogoMark } from '../../../core/ui';

/**
 * TEMPORARY DEV STUB. Replace this file with the real login pages.
 * It only demonstrates the contract: call login({ user, token }) then navigate home.
 */
const DEV_USERS = [
  { id: 'p-101', name: 'Aarav Sharma', role: ROLES.PATIENT },
  { id: 'ph-301', name: 'Rohan Verma', role: ROLES.PHARMACIST },
];

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to={homePathForRole(user.role)} replace />;

  return (
    <div style={{ maxWidth: 420, margin: '12vh auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700 }}>
        <LogoMark size={34} /> SYNapse
      </div>
      <p style={{ color: 'var(--c-muted)', margin: '12px 0 24px' }}>
        Development login stub. The real login pages will replace this screen.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {DEV_USERS.map((u) => (
          <Button
            key={u.role}
            variant="outline"
            onClick={() => {
              login({ user: u, token: 'dev-token' });
              navigate(homePathForRole(u.role), { replace: true });
            }}
          >
            Continue as {u.role}
          </Button>
        ))}
      </div>
    </div>
  );
}
