/**
 * MODULE REGISTRY: the single place where role UIs and login pages are plugged in.
 *
 * Each role module (src/modules/<role>/index.jsx) default-exports:
 *   {
 *     role:        'patient' | 'pharmacist'   (see core/auth/roles.js)
 *     basePath:    '/patient'
 *     navItems:    [{ label, to, icon }]                 sidebar entries ('' = module home)
 *     routes:      [{ index: true, element }, { path: 'x', element }]   react-router <Route> props
 *     showLogout?: boolean                               Logout at the bottom of the sidebar
 *     showNotificationsIcon?: boolean                    round icon in the top bar
 *   }
 *
 * Login pages live in src/modules/auth and export `loginRoutes` the same way.
 */
import { loginRoutes } from './auth';
import patientModule from './patient';
import pharmacistModule from './pharmacist';

export const modules = [patientModule, pharmacistModule];
export { loginRoutes };
