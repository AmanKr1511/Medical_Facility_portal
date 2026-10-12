import LoginPage from './pages/LoginPage';

/**
 * Owned by the login-pages teammate.
 * Export `loginRoutes`: an array of react-router <Route> props. Keep `/login` as the
 * entry point (the route guards redirect there). Add per-role pages here if wanted,
 * e.g. { path: '/login/doctor', element: <DoctorLogin /> }.
 */
export const loginRoutes = [{ path: '/login', element: <LoginPage /> }];
