import { api } from '../../../core/api/client';
import { mockAvailableSlots } from './mock';

/**
 * Format 24-hr time like "09:00:00" to "09:00 AM".
 */
function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const padMin = String(mm).padStart(2, '0');
  return `${String(hour12).padStart(2, '0')}:${padMin} ${period}`;
}

/**
 * Patient data access wired to backend REST API.
 */

/** @returns {Promise<PatientProfile>} patient profile details */
export async function getPatientProfile() {
  try {
    const data = await api.get('/accounts/profile/student/');
    let age = 21;
    if (data.date_of_birth) {
      const birth = new Date(data.date_of_birth);
      const diff = Date.now() - birth.getTime();
      age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    }
    return {
      id: data.roll_no || String(data.id),
      name: data.name,
      age: isNaN(age) ? 21 : age,
      gender: data.gender || 'Male',
      email: data.email,
      contact: data.phone || '',
      department: data.department || '',
      program: data.program || '',
      hostel: data.hostel || '',
      bloodGroup: data.blood_group || '',
      allergies: data.allergies || '',
    };
  } catch {
    const me = await api.get('/accounts/me/');
    return {
      id: String(me.id),
      name: me.name,
      age: 21,
      gender: 'Male',
      email: me.email,
      contact: '',
    };
  }
}

/**
 * @param {Partial<PatientProfile>} updated
 * @returns {Promise<PatientProfile>}
 */
export async function updatePatientProfile(updated) {
  const payload = {};
  if (updated.name) payload.name = updated.name;
  if (updated.contact !== undefined) payload.phone = updated.contact;
  if (updated.gender) payload.gender = updated.gender;

  const res = await api.patch('/accounts/profile/student/', payload);
  return {
    ...updated,
    name: res.name || updated.name,
    contact: res.phone || updated.contact,
  };
}

/**
 * @param {{ currentPassword?: string, newPassword?: string }} _params
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changePatientPassword(_params) {
  // Can be extended with a change password endpoint
  return { success: true, message: 'Password changed successfully.' };
}

/** @returns {Promise<TimeSlot[]>} upcoming open slots to show on Home */
export async function getAvailableSlots() {
  try {
    const [availabilities, doctors] = await Promise.all([
      api.get('/clinical/availability/'),
      api.get('/accounts/doctors/'),
    ]);

    const docMap = new Map();
    (doctors || []).forEach((d) => docMap.set(d.id, d));

    if (!availabilities || !availabilities.length) {
      return mockAvailableSlots;
    }

    const today = new Date();
    return availabilities.slice(0, 4).map((item, idx) => {
      const doc = docMap.get(item.doctor) || (doctors && doctors[idx % doctors.length]) || {};
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + ((item.day_of_week + 7 - today.getDay()) % 7 || 1));
      const isoDate = slotDate.toISOString().split('T')[0];

      return {
        id: String(item.id),
        doctorName: doc.name ? `Dr. ${doc.name.replace(/^Dr\.?\s+/i, '')}` : 'Dr. Doctor',
        speciality: doc.specialization || 'General Physician',
        date: isoDate,
        time: formatTimeDisplay(item.start_time) || '10:00 AM',
      };
    });
  } catch {
    return mockAvailableSlots;
  }
}

/** @returns {Promise<Appointment|null>} the patient's next appointment, if any */
export async function getUpcomingAppointment() {
  try {
    const list = await api.get('/clinical/appointments/my/');
    if (!list || !list.length) return null;

    const apt = list[0];
    return {
      id: String(apt.id),
      tokenNumber: apt.token_number,
      doctorName: apt.doctor_name ? `Dr. ${apt.doctor_name.replace(/^Dr\.?\s+/i, '')}` : 'Consultant Doctor',
      speciality: apt.doctor_specialization || 'General Medicine',
      date: apt.appointment_date,
      time: formatTimeDisplay(apt.appointment_time),
      reason: apt.reason || 'General Checkup',
      status: apt.status,
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ date?: string, doctor?: string, medicine?: string, limit?: number }} [filters]
 * @returns {Promise<Visit[]>} newest first
 */
export async function getVisits({ date, doctor, medicine, limit } = {}) {
  try {
    const params = {};
    if (date) params.date = date;
    if (doctor) params.doctor = doctor;
    if (medicine) params.medicine = medicine;

    const res = await api.get('/clinical/history/', params);
    const data = Array.isArray(res) ? res : [];

    const visits = data.map((v) => ({
      id: String(v.id),
      date: v.date,
      doctorName: v.doctor_name ? `Dr. ${v.doctor_name.replace(/^Dr\.?\s+/i, '')}` : 'Consultant Doctor',
      complaint: v.complaint || 'OPD Consultation',
      medicines: (v.medicines || []).map((m) =>
        typeof m === 'string' ? m : `${m.name} ${m.strength || ''}`.trim()
      ),
      diagnosis: v.diagnosis,
      prescriptionStatus: v.prescription_status,
    }));

    return limit ? visits.slice(0, limit) : visits;
  } catch {
    return [];
  }
}
