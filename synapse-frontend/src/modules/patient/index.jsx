import { Navigate } from 'react-router-dom';
import { ROLES } from '../../core/auth';
import Profile from './pages/Profile';
import VisitHistory from './pages/VisitHistory';
import './patient.css';

export default {
  role: ROLES.PATIENT,
  basePath: '/patient',
  navItems: [
    { label: 'Profile', to: '/profile', icon: 'user' },
    { label: 'Visit History', to: '/visit-history', icon: 'history' },
  ],
  routes: [
    { index: true, element: <Navigate to="profile" replace /> },
    { path: 'profile', element: <Profile /> },
    { path: 'visit-history', element: <VisitHistory /> },
    { path: '*', element: <Navigate to="profile" replace /> },
  ],
  showLogout: true,
  showNotificationsIcon: true,
};
