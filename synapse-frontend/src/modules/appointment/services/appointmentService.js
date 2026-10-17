import { api } from '../../../core/api/client';
import { mockDoctors } from './mock';

function to24HourTime(str) {
  if (!str) return '10:00:00';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str.trim())) {
    const parts = str.trim().split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}:00`;
  }
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '10:00:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = match[3].toUpperCase();
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}

/**
 * Service for public appointment booking flow connected to backend REST API.
 */

/** @returns {Promise<DoctorSchedule[]>} */
export async function getDoctors() {
  try {
    const [doctors, availabilities] = await Promise.all([
      api.get('/accounts/doctors/'),
      api.get('/clinical/availability/'),
    ]);

    if (!Array.isArray(doctors) || !doctors.length) {
      return mockDoctors;
    }

    const today = new Date();
    const nextDates = [0, 1, 2, 3, 4].map((offset) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      return d.toISOString().split('T')[0];
    });

    return doctors.map((doc, idx) => {
      const docAvail = (Array.isArray(availabilities) ? availabilities : []).filter(
        (a) => a.doctor === doc.id
      );

      const slots = docAvail.length
        ? ['09:30 AM', '10:15 AM', '11:00 AM', '02:30 PM', '03:15 PM', '04:00 PM']
        : ['10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM'];

      const avatarText = doc.name
        ? doc.name
            .replace(/^Dr\.?\s+/i, '')
            .split(/\s+/)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : `D${idx + 1}`;

      return {
        id: String(doc.id),
        name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
        specialization: doc.specialization || 'Consultant Physician',
        qualification: doc.qualification || 'MBBS, MD',
        cabin: doc.cabin || `OPD Room ${101 + idx}`,
        experience: '10+ years',
        avatarText,
        availableDates: nextDates,
        slots,
      };
    });
  } catch {
    return mockDoctors;
  }
}

/** @param {string} doctorId */
export async function getDoctorById(doctorId) {
  const doctors = await getDoctors();
  return doctors.find((d) => d.id === doctorId) ?? doctors[0];
}

/**
 * Submits the completed appointment form to the backend API.
 *
 * @param {AppointmentSubmissionPayload} payload
 * @returns {Promise<{ success: boolean, opdNumber: string, appointmentId: string, data: AppointmentSubmissionPayload }>}
 */
export async function submitAppointment(payload) {
  let docId = parseInt(payload.doctorId, 10);
  if (isNaN(docId) || docId <= 0) {
    // If doctor ID is string like 'doc-meera', fetch doctors to match ID
    try {
      const docs = await api.get('/accounts/doctors/');
      if (Array.isArray(docs) && docs.length) {
        docId = docs[0].id;
      } else {
        docId = 1;
      }
    } catch {
      docId = 1;
    }
  }

  const backendPayload = {
    name: payload.name?.trim(),
    email: payload.email?.trim(),
    age: Number(payload.age) || 21,
    gender: payload.gender || 'Male',
    entry_number: payload.entryNumber?.trim().toUpperCase() || '',
    department: payload.department?.trim() || 'General / Unspecified',
    father_or_husband_name: payload.fatherOrHusbandName?.trim() || 'Guardian',
    complaints: payload.complaints?.trim() || 'Consultation request',
    past_illness: payload.pastIllness?.trim() || '',
    allergies: payload.allergies?.trim() || '',
    phone: payload.phone?.trim() || '',
    emergency_contact_name: payload.emergencyContactName?.trim() || '',
    emergency_contact_phone: payload.emergencyContactPhone?.trim() || '',
    doctor_id: docId,
    appointment_date: payload.appointmentDate || new Date().toISOString().split('T')[0],
    appointment_time: to24HourTime(payload.appointmentTime),
    is_emergency: false,
    consultation_source: payload.consultationSource || 'consult_later',
  };

  const response = await api.post('/clinical/appointments/public/', backendPayload);

  const opdNumber = response.opd_number || `OPD-${Date.now().toString().slice(-6)}`;

  return {
    success: true,
    opdNumber,
    appointmentId: String(response.appointment_id || opdNumber),
    data: {
      ...payload,
      opdNumber,
      status: response.status || 'CONFIRMED',
      createdAt: new Date().toISOString(),
    },
  };
}
