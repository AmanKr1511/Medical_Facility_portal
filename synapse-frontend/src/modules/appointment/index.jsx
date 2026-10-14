import { Navigate } from 'react-router-dom';
import AppointmentForm from './pages/AppointmentForm';
import DoctorScheduleView from './pages/DoctorScheduleView';
import './appointment.css';

/**
 * Public, non-role-based appointment booking module.
 * Accessible without signing in.
 */
export const appointmentRoutes = [
  { path: '/appointment', element: <DoctorScheduleView /> },
  { path: '/appointment/form', element: <AppointmentForm /> },
  { path: '/book-appointment', element: <Navigate to="/appointment" replace /> },
];

export default {
  basePath: '/appointment',
  routes: appointmentRoutes,
};
