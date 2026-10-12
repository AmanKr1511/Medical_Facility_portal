import { delay } from '../../../core/api/mockUtils';
import { mockAvailableSlots, mockUpcomingAppointment, mockVisits } from './mock';

/**
 * Patient data access. Pages import ONLY from this file.
 *
 * Currently backed by mock data because the frontend/backend JSON contract is not
 * decided. When it is, replace each function body with a call through core/api/client
 * (api.get / api.post) and map the response to the shapes documented below. No page
 * or component should need to change.
 *
 * @typedef {{ id: string, doctorName: string, speciality: string, date: string, time: string }} TimeSlot
 *   date is ISO "YYYY-MM-DD"; time is display text, e.g. "04:30 PM"
 * @typedef {TimeSlot} Appointment
 * @typedef {{ id: string, date: string, doctorName: string, complaint: string, medicines: string[] }} Visit
 */

/** @returns {Promise<TimeSlot[]>} upcoming open slots to show on Home */
export async function getAvailableSlots() {
  await delay();
  return mockAvailableSlots;
}

/** @returns {Promise<Appointment|null>} the patient's next appointment, if any */
export async function getUpcomingAppointment() {
  await delay();
  return mockUpcomingAppointment;
}

/**
 * @param {{ date?: string, doctor?: string, medicine?: string, limit?: number }} [filters]
 *   date: ISO day (exact match); doctor / medicine: case-insensitive "contains"
 * @returns {Promise<Visit[]>} newest first
 */
export async function getVisits({ date, doctor, medicine, limit } = {}) {
  await delay();
  const contains = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

  let visits = [...mockVisits].sort((a, b) => b.date.localeCompare(a.date));
  if (date) visits = visits.filter((v) => v.date === date);
  if (doctor) visits = visits.filter((v) => contains(v.doctorName, doctor));
  if (medicine) visits = visits.filter((v) => v.medicines.some((m) => contains(m, medicine)));
  return limit ? visits.slice(0, limit) : visits;
}
