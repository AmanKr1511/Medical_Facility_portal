import { ROLES } from '../../core/auth';
import BookAppointment from './pages/BookAppointment';
import Home from './pages/Home';
import MyAppointments from './pages/MyAppointments';
import Profile from './pages/Profile';
import VisitHistory from './pages/VisitHistory';
import './patient.css';

export default {
  role: ROLES.PATIENT,
  basePath: '/patient',
  navItems: [
    { label: 'Home', to: '', icon: 'home' },
    { label: 'Book Appointment', to: '/book-appointment', icon: 'calendarPlus' },
    { label: 'My Appointments', to: '/my-appointments', icon: 'calendar' },
    { label: 'Visit History', to: '/visit-history', icon: 'history' },
    { label: 'Profile', to: '/profile', icon: 'user' },
  ],
  routes: [
    { index: true, element: <Home /> },
    { path: 'book-appointment', element: <BookAppointment /> },
    { path: 'my-appointments', element: <MyAppointments /> },
    { path: 'visit-history', element: <VisitHistory /> },
    { path: 'profile', element: <Profile /> },
  ],
  showLogout: true,
  showNotificationsIcon: true,
};
