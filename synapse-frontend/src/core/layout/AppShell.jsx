import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { Avatar, Icon, LogoMark } from '../ui';
import './shell.css';

/**
 * Common frame for every role: top bar + sidebar + content area.
 *
 * navItems:    [{ label, to, icon, end? }]   (paths relative to the module's basePath)
 * showLogout:  adds a Logout entry at the bottom of the sidebar
 * showNotificationsIcon: the round icon left of the user name in the top bar
 */
export default function AppShell({ basePath, navItems, showLogout = false, showNotificationsIcon = false, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="shell__topbar">
        <div className="shell__brand">
          <LogoMark />
          <span>SYNapse</span>
        </div>
        <div className="shell__user">
          {showNotificationsIcon && (
            <button type="button" className="shell__icon-btn" aria-label="Notifications">
              <Icon name="bell" size={18} />
            </button>
          )}
          <Avatar name={user?.name} size={36} />
          <span className="shell__user-name">{user?.name}</span>
        </div>
      </header>

      <div className="shell__body">
        <nav className="shell__sidebar" aria-label="Main">
          <ul className="shell__nav">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={`${basePath}${item.to}`}
                  end={item.end ?? item.to === ''}
                  className={({ isActive }) => `shell__link${isActive ? ' is-active' : ''}`}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {showLogout && (
            <div className="shell__footer">
              <button type="button" className="shell__link" onClick={logout}>
                <Icon name="logout" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </nav>

        <main className="shell__content">{children}</main>
      </div>
    </div>
  );
}
