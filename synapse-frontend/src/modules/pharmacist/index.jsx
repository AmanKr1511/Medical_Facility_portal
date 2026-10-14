import { Navigate } from 'react-router-dom';
import { ROLES } from '../../core/auth';
import MedicinesGivenToday from './pages/MedicinesGivenToday';
import PharmacistHome from './pages/PharmacistHome';
import './pharmacist.css';

export default {
  role: ROLES.PHARMACIST,
  basePath: '/pharmacist',
  navItems: [
    { label: 'Current Queue', to: '', icon: 'users' },
    { label: 'Given Medicine Today', to: '/given-today', icon: 'pill' },
  ],
  routes: [
    { index: true, element: <PharmacistHome /> },
    { path: 'given-today', element: <MedicinesGivenToday /> },
    { path: 'history', element: <Navigate to="/pharmacist/given-today" replace /> },
  ],
  showLogout: true,
};
