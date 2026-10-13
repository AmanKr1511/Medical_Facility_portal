import { ROLES } from '../../core/auth';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientConsultation from './pages/PatientConsultation';
import PrescriptionTemplates from './pages/PrescriptionTemplates';
import './doctor.css';

export default {
  role: ROLES.DOCTOR,
  basePath: '/doctor',
  navItems: [
    { label: "Today's Appointments", to: '', icon: 'calendar' },
    { label: 'Prescription Templates', to: '/templates', icon: 'fileText' },
  ],
  routes: [
    { index: true, element: <DoctorDashboard /> },
    { path: 'templates', element: <PrescriptionTemplates /> },
    { path: 'consultation/:appointmentId', element: <PatientConsultation /> },
    { path: 'consultation', element: <PatientConsultation /> },
  ],
  showLogout: true,
  showNotificationsIcon: true,
};
