import { delay } from '../../../core/api/mockUtils';
import { DOCTOR_INFO, MOCK_APPOINTMENTS, MOCK_RECENT_PRESCRIPTIONS } from './mock';

/**
 * @typedef {{
 *   id: string,
 *   tokenNumber: string,
 *   patientId: string,
 *   patientName: string,
 *   age: number,
 *   gender: string,
 *   time: string,
 *   complaint: string,
 *   status: string,
 *   vitals: { bp: string, pulse: string, temp: string }
 * }} DoctorAppointment
 */

export async function getDoctorInfo() {
  await delay(80);
  return DOCTOR_INFO;
}

export async function getTodayAppointments() {
  await delay(120);
  return [...MOCK_APPOINTMENTS];
}

export async function getRecentPrescriptions() {
  await delay(120);
  return [...MOCK_RECENT_PRESCRIPTIONS];
}
