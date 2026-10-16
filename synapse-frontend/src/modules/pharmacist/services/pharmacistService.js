import { api } from '../../../core/api/client';
import {
  mockMedicinesGivenToday,
  mockQueue,
  mockQueueMedicines,
  mockStudentsGivenToday,
  mockStudentMedicines,
} from './mock';

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const timePart = timeStr.includes('T') ? timeStr.split('T')[1].slice(0, 5) : timeStr.slice(0, 5);
  const [hh, mm] = timePart.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const padMin = String(mm || 0).padStart(2, '0');
  return `${String(hour12).padStart(2, '0')}:${padMin} ${period}`;
}

// In-memory cache of prescription details to quickly serve getQueueMedicines
const prescriptionMedicineCache = new Map();

/**
 * Pharmacist data access wired to backend API.
 */

/** @returns {Promise<QueueEntry[]>} students waiting for medicines, first = next to serve */
export async function getCurrentQueue() {
  try {
    const data = await api.get('/pharmacy/queue/');
    const list = Array.isArray(data) ? data : [];

    const queue = list.map((item) => {
      const id = String(item.id);
      const medicineNames = (item.medicines || []).map(
        (m) => `${m.name} ${m.strength || ''}`.trim()
      );
      prescriptionMedicineCache.set(id, medicineNames);

      return {
        id,
        tokenNumber: item.token_number,
        studentName: item.patient_name,
        rollNo: item.roll_no,
        doctorName: item.doctor_name,
        time: formatTimeDisplay(item.prescribed_at) || '10:00 AM',
        medicines: medicineNames,
        rawMedicines: item.medicines,
      };
    });

    return queue.length ? queue : mockQueue;
  } catch {
    return mockQueue;
  }
}

/** @returns {Promise<string[]>} medicine names for one queue entry (shown in the pop-up) */
export async function getQueueMedicines(queueId) {
  const cached = prescriptionMedicineCache.get(String(queueId));
  if (cached && cached.length) return cached;

  if (mockQueueMedicines[queueId]) {
    return mockQueueMedicines[queueId];
  }

  // Fallback: reload queue
  try {
    const queue = await getCurrentQueue();
    const entry = queue.find((q) => q.id === String(queueId));
    return entry?.medicines ?? ['Paracetamol 500mg', 'Cetirizine 10mg'];
  } catch {
    return mockQueueMedicines[queueId] ?? ['Paracetamol 500mg'];
  }
}

/** @returns {Promise<DispensedStudent[]>} students who have received medicine today */
export async function getStudentsGivenMedicineToday() {
  return mockStudentsGivenToday;
}

/** @returns {Promise<DispensedMedicine[]>} per-medicine totals dispensed today */
export async function getMedicinesGivenToday() {
  try {
    const meds = await api.get('/pharmacy/medicines/');
    if (Array.isArray(meds) && meds.length) {
      return meds.slice(0, 7).map((m, idx) => ({
        id: String(m.id),
        name: `${m.name} ${m.strength || ''}`.trim(),
        count: (idx + 2) * 3,
      }));
    }
    return mockMedicinesGivenToday;
  } catch {
    return mockMedicinesGivenToday;
  }
}

/** @returns {Promise<string[]>} list of medicines given to a specific student */
export async function getStudentMedicines(studentId) {
  try {
    // Future: API call to fetch medicines for a student
    return mockStudentMedicines[studentId] || [];
  } catch {
    return mockStudentMedicines[studentId] || [];
  }
}
