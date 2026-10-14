import { isoDay } from '../../../core/api/mockUtils';

/** Mock data only. Delete once the real API is wired in patientService.js. */

export const mockAvailableSlots = [
  { id: 's1', doctorName: 'Dr. Meera Iyer', speciality: 'General Physician', date: isoDay(0), time: '04:30 PM' },
  { id: 's2', doctorName: 'Dr. Kabir Singh', speciality: 'Dermatology', date: isoDay(1), time: '10:15 AM' },
];

export const mockUpcomingAppointment = {
  id: 'a1',
  doctorName: 'Dr. Meera Iyer',
  speciality: 'General Physician',
  date: isoDay(2),
  time: '11:00 AM',
};

export const mockVisits = [
  {
    id: 'v1',
    date: isoDay(-6),
    doctorName: 'Dr. Meera Iyer',
    complaint: 'Fever and sore throat',
    medicines: ['Paracetamol 500mg', 'Cetirizine 10mg'],
  },
  {
    id: 'v2',
    date: isoDay(-27),
    doctorName: 'Dr. Kabir Singh',
    complaint: 'Skin rash on forearm',
    medicines: ['Hydrocortisone cream', 'Loratadine 10mg'],
  },
  {
    id: 'v3',
    date: isoDay(-63),
    doctorName: 'Dr. Meera Iyer',
    complaint: 'Seasonal cold and cough',
    medicines: ['Dextromethorphan syrup', 'Vitamin C'],
  },
  {
    id: 'v4',
    date: isoDay(-120),
    doctorName: 'Dr. Anita Rao',
    complaint: 'Mild sprain, left ankle',
    medicines: ['Ibuprofen 400mg', 'Diclofenac gel'],
  },
];

export const mockPatientProfile = {
  id: 'p-101',
  name: 'Aarav Sharma',
  age: 21,
  gender: 'Male',
  email: 'aarav.sharma@example.com',
  contact: '+91 98765 43210',
};

