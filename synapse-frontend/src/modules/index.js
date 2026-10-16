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
 *   }
 *
 * Login pages live in src/modules/auth and export `loginRoutes` the same way.
 */
import { appointmentRoutes } from './appointment';
import { loginRoutes } from './auth';
import doctorModule from './doctor';
import patientModule from './patient';
import pharmacistModule from './pharmacist';

export const modules = [patientModule, doctorModule, pharmacistModule];
export { appointmentRoutes, loginRoutes };

