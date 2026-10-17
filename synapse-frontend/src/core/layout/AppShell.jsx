import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Avatar, Icon, LogoMark } from '../ui';
import './shell.css';

/**
 * Common frame for every role: top bar + sidebar + content area.
 *
 * navItems:    [{ label, to, icon, end? }]   (paths relative to the module's basePath)
 * showLogout:  adds a Logout entry at the bottom of the sidebar
 */
export default function AppShell({ basePath, navItems, showLogout = false, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false);
    };
    if (isMobileNavOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen]);

  return (
    <div className="shell">
      {/* Backdrop for mobile drawer */}
      <div
        className={`shell__backdrop${isMobileNavOpen ? ' is-open' : ''}`}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />

      <header className="shell__topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className="shell__menu-toggle"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileNavOpen}
          >
            <Icon name={isMobileNavOpen ? 'close' : 'menu'} size={22} />
          </button>
          <Link to={basePath} className="shell__brand" title="SYNapse Home">
            <LogoMark />
            <span>SYNapse</span>
          </Link>
        </div>
        <div className="shell__user">
          <Avatar name={user?.name} size={36} />
          <span className="shell__user-name">{user?.name}</span>
        </div>
      </header>

      <div className="shell__body">
        <nav
          className={`shell__sidebar${isMobileNavOpen ? ' is-open' : ''}`}
          aria-label="Main"
        >
          {/* Mobile drawer header */}
          <div className="shell__drawer-head">
            <div className="shell__drawer-brand">
              <LogoMark size={24} />
              <span>SYNapse</span>
            </div>
            <button
              type="button"
              className="shell__drawer-close"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <ul className="shell__nav">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={`${basePath}${item.to}`}
                  end={item.end ?? item.to === ''}
                  className={({ isActive }) => `shell__link${isActive ? ' is-active' : ''}`}
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {showLogout && (
            <div className="shell__footer">
              <button
                type="button"
                className="shell__link"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  logout();
                }}
              >
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
