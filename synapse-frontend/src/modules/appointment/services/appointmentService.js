import { delay } from '../../../core/api/mockUtils';
import { mockDoctors } from './mock';

/**
 * Service for public appointment booking flow.
 * Any user can access this without role-based login.
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   qualification: string,
 *   cabin: string,
 *   experience: string,
 *   avatarText: string,
 *   availableDates: string[],
 *   slots: string[]
 * }} DoctorSchedule
 *
 * @typedef {{
 *   name: string,
 *   email: string,
 *   age: number,
 *   gender: 'Male' | 'Female' | 'Other',
 *   entryNumber?: string,
 *   department?: string,
 *   fatherOrHusbandName: string,
 *   complaints: string,
 *   pastIllness?: string,
 *   allergies?: string,
 *   doctorId: string,
 *   doctorName: string,
 *   appointmentDate: string,
 *   appointmentTime: string
 * }} AppointmentSubmissionPayload
 */

/** @returns {Promise<DoctorSchedule[]>} */
export async function getDoctors() {
  await delay(100);
  return mockDoctors;
}

/** @param {string} doctorId */
export async function getDoctorById(doctorId) {
  await delay(50);
  return mockDoctors.find((d) => d.id === doctorId) ?? mockDoctors[0];
}

/**
 * Submits the completed appointment form as JSON fields to the backend API.
 * Formatted cleanly so backend can ingest directly into database.
 *
 * @param {AppointmentSubmissionPayload} payload
 * @returns {Promise<{ success: boolean, opdNumber: string, appointmentId: string, data: AppointmentSubmissionPayload }>}
 */
export async function submitAppointment(payload) {
  await delay(350);

  const opdNumber = `OPD-${Date.now().toString().slice(-6)}`;

  const cleanPayload = {
    opdNumber,
    name: payload.name?.trim(),
    email: payload.email?.trim(),
    age: Number(payload.age),
    gender: payload.gender,
    entryNumber: payload.entryNumber?.trim().toUpperCase() || 'N/A',
    department: payload.department?.trim() || 'General / Unspecified',
    fatherOrHusbandName: payload.fatherOrHusbandName?.trim(),
    complaints: payload.complaints?.trim(),
    pastIllness: payload.pastIllness?.trim() || 'None reported',
    allergies: payload.allergies?.trim() || 'No known allergies',
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    appointmentDate: payload.appointmentDate,
    appointmentTime: payload.appointmentTime,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  // Log clean JSON representation for future backend integration inspection
  // eslint-disable-next-line no-console
  console.log('Sending appointment payload to API (JSON):\n', JSON.stringify(cleanPayload, null, 2));

  return {
    success: true,
    opdNumber,
    appointmentId: opdNumber,
    data: cleanPayload,
  };
}
