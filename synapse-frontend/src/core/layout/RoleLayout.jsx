import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

/** Wraps a role module's routes in the shared shell, configured from the module definition. */
export default function RoleLayout({ module }) {
  return (
    <AppShell
      basePath={module.basePath}
      navItems={module.navItems}
      showLogout={module.showLogout}
    >
      <Outlet />
    </AppShell>
  );
}
