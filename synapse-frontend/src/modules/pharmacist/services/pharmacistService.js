import { delay } from '../../../core/api/mockUtils';
import { mockMedicinesGivenToday, mockQueue, mockQueueMedicines, mockStudentsGivenToday } from './mock';

/**
 * Pharmacist data access. Pages import ONLY from this file.
 *
 * Currently backed by mock data because the frontend/backend JSON contract is not
 * decided. When it is, replace each function body with a call through core/api/client
 * and map the response to the shapes below; no page or component should need to change.
 *
 * @typedef {{ id: string, studentName: string, time: string }} QueueEntry   time is display text
 * @typedef {{ id: string, studentName: string, time: string }} DispensedStudent
 * @typedef {{ id: string, name: string, count: number }} DispensedMedicine
 */

/** @returns {Promise<QueueEntry[]>} students waiting for medicines, first = next to serve */
export async function getCurrentQueue() {
  await delay();
  return mockQueue;
}

/** @returns {Promise<string[]>} medicine names for one queue entry (shown in the pop-up) */
export async function getQueueMedicines(queueId) {
  await delay(150);
  return mockQueueMedicines[queueId] ?? [];
}

/** @returns {Promise<DispensedStudent[]>} students who have received medicine today */
export async function getStudentsGivenMedicineToday() {
  await delay();
  return mockStudentsGivenToday;
}

/** @returns {Promise<DispensedMedicine[]>} per-medicine totals dispensed today */
export async function getMedicinesGivenToday() {
  await delay();
  return mockMedicinesGivenToday;
}
