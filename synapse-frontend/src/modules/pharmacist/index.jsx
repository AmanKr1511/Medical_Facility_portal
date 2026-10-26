import { Navigate } from 'react-router-dom';
import { ROLES } from '../../core/auth';
import MedicinesGivenToday from './pages/MedicinesGivenToday';
import OPDHistory from './pages/OPDHistory';
import PharmacistHome from './pages/PharmacistHome';
import './pharmacist.css';

export default {
  role: ROLES.PHARMACIST,
  basePath: '/pharmacist',
  navItems: [
    { label: 'Current Queue', to: '', icon: 'users' },
    { label: 'Given Medicine Today', to: '/given-today', icon: 'pill' },
    { label: 'OPD History', to: '/opd-history', icon: 'history' },
  ],
  routes: [
    { index: true, element: <PharmacistHome /> },
    { path: 'given-today', element: <MedicinesGivenToday /> },
    { path: 'opd-history', element: <OPDHistory /> },
    { path: 'history', element: <Navigate to="/pharmacist/opd-history" replace /> },
  ],
  showLogout: true,
};
