import { ROLES } from '../../core/auth';
import PharmacistHome from './pages/PharmacistHome';
import './pharmacist.css';

export default {
  role: ROLES.PHARMACIST,
  basePath: '/pharmacist',
  navItems: [{ label: 'Home', to: '', icon: 'home' }],
  routes: [{ index: true, element: <PharmacistHome /> }],
  showLogout: true,
};
