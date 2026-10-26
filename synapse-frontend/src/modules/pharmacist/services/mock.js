/** Mock data only. Delete once the real API is wired in pharmacistService.js. */

export const mockQueue = [
  { id: 'q1', studentName: 'Ananya Gupta', time: '03:42 PM' },
  { id: 'q2', studentName: 'Vikram Patel', time: '03:51 PM' },
  { id: 'q3', studentName: 'Sneha Reddy', time: '04:05 PM' },
];

export const mockQueueMedicines = {
  q1: ['Paracetamol 500mg', 'Cetirizine 10mg', 'ORS sachet', 'Vitamin C', 'Cough syrup'],
  q2: ['Ibuprofen 400mg', 'Diclofenac gel'],
  q3: ['Amoxicillin 500mg', 'Pantoprazole 40mg', 'Paracetamol 500mg'],
};

export const mockStudentsGivenToday = [
  { id: 'g1', studentName: 'Rahul Nair', time: '09:12 AM' },
  { id: 'g2', studentName: 'Priya Menon', time: '09:40 AM' },
  { id: 'g3', studentName: 'Aditya Joshi', time: '10:18 AM' },
  { id: 'g4', studentName: 'Kavya Krishnan', time: '11:03 AM' },
  { id: 'g5', studentName: 'Mohit Bansal', time: '11:47 AM' },
  { id: 'g6', studentName: 'Ishita Kapoor', time: '12:30 PM' },
  { id: 'g7', studentName: 'Arjun Mehta', time: '01:15 PM' },
];

export const mockMedicinesGivenToday = [
  { id: 'm1', name: 'Paracetamol 500mg', count: 14 },
  { id: 'm2', name: 'Cetirizine 10mg', count: 9 },
  { id: 'm3', name: 'Ibuprofen 400mg', count: 6 },
  { id: 'm4', name: 'ORS sachet', count: 5 },
  { id: 'm5', name: 'Pantoprazole 40mg', count: 4 },
  { id: 'm6', name: 'Cough syrup', count: 3 },
  { id: 'm7', name: 'Diclofenac gel', count: 2 },
];

export const mockStudentMedicines = {
  g1: ['Paracetamol 500mg', 'Cetirizine 10mg', 'ORS sachet'],
  g2: ['Ibuprofen 400mg', 'Diclofenac gel'],
  g3: ['Amoxicillin 500mg', 'Pantoprazole 40mg', 'Paracetamol 500mg'],
  g4: ['Cough syrup', 'Vitamin C'],
  g5: ['Paracetamol 500mg', 'Cetirizine 10mg'],
  g6: ['ORS sachet', 'Oral rehydration salts'],
  g7: ['Azithromycin 500mg', 'Loperamide 2mg'],
};

/** Mock OPD history records - used when backend is not available */
export const mockOPDHistory = [
  { opdNumber: 'OPD-001', patientName: 'Ananya Gupta', doctorName: 'Dr. Smith', visitTime: '09:30 AM' },
  { opdNumber: 'OPD-002', patientName: 'Vikram Patel', doctorName: 'Dr. Jones', visitTime: '10:15 AM' },
  { opdNumber: 'OPD-003', patientName: 'Sneha Reddy', doctorName: 'Dr. Brown', visitTime: '11:00 AM' },
  { opdNumber: 'OPD-004', patientName: 'Rahul Nair', doctorName: 'Dr. White', visitTime: '01:45 PM' },
  { opdNumber: 'OPD-005', patientName: 'Priya Menon', doctorName: 'Dr. Black', visitTime: '02:30 PM' },
  { opdNumber: 'OPD-006', patientName: 'Arjun Mehta', doctorName: 'Dr. Green', visitTime: '03:15 PM' },
  { opdNumber: 'OPD-007', patientName: 'Kavya Krishnan', doctorName: 'Dr. Red', visitTime: '04:00 PM' },
];
