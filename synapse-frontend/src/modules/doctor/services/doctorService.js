import { api } from '../../../core/api/client';
import { DOCTOR_INFO, MOCK_APPOINTMENTS, MOCK_RECENT_PRESCRIPTIONS } from './mock';

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '10:00 AM';
  const parts = timeStr.split(':');
  const hh = parseInt(parts[0], 10);
  const mm = parts[1] || '00';
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(hour12).padStart(2, '0')}:${mm} ${period}`;
}

export async function getDoctorInfo() {
  try {
    const profile = await api.get('/accounts/profile/doctor/');
    return {
      name: profile.name ? `Dr. ${profile.name.replace(/^Dr\.?\s+/i, '')}` : DOCTOR_INFO.name,
      speciality: profile.specialization || DOCTOR_INFO.speciality,
      room: profile.cabin || DOCTOR_INFO.room,
      phone: profile.phone || DOCTOR_INFO.phone,
      email: profile.email || DOCTOR_INFO.email,
    };
  } catch {
    return DOCTOR_INFO;
  }
}

export async function getTodayAppointments() {
  try {
    const queue = await api.get('/clinical/queue/');
    if (Array.isArray(queue) && queue.length > 0) {
      return queue.map((item) => ({
        id: String(item.id),
        tokenNumber: String(item.token_number),
        patientId: item.roll_no || `P-${item.id}`,
        patientName: item.patient_name,
        age: 21,
        gender: item.patient_category || 'Student',
        time: formatTimeDisplay(item.appointment_time),
        complaint: item.reason || 'Routine OPD Examination',
        status: item.status === 'BOOKED' ? 'Waiting' : item.status,
        vitals: { bp: '120/80', pulse: '78 bpm', temp: '98.6 °F' },
      }));
    }
    return [...MOCK_APPOINTMENTS];
  } catch {
    return [...MOCK_APPOINTMENTS];
  }
}

export async function getRecentPrescriptions() {
  try {
    const queue = await api.get('/clinical/queue/');
    if (Array.isArray(queue) && queue.length > 0) {
      return queue
        .filter((item) => item.status === 'COMPLETED' || item.has_prescription)
        .map((item) => ({
          id: String(item.id),
          patientName: item.patient_name,
          diagnosis: item.reason || 'Prescription issued',
          time: formatTimeDisplay(item.appointment_time),
        }));
    }
    return [...MOCK_RECENT_PRESCRIPTIONS];
  } catch {
    return [...MOCK_RECENT_PRESCRIPTIONS];
  }
}
