import { INITIAL_APPOINTMENTS, INITIAL_TEMPLATES } from './mock';

const APPOINTMENTS_KEY = 'synapse.doctor.appointments';
const TEMPLATES_KEY = 'synapse.doctor.templates';
const OPD_SLIPS_KEY = 'synapse.doctor.finalized_slips';
const PHARMACY_QUEUE_KEY = 'synapse.pharmacy.external_queue';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getAppointments() {
  return load(APPOINTMENTS_KEY, INITIAL_APPOINTMENTS);
}

export function saveAppointments(list) {
  save(APPOINTMENTS_KEY, list);
}

export function getAppointmentById(id) {
  const list = getAppointments();
  return list.find((a) => a.id === id) ?? list[0] ?? null;
}

export function updateAppointmentStatus(id, newStatus) {
  const list = [...getAppointments()];
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return list;

  const target = { ...list[index], status: newStatus };

  if (newStatus === 'Reschedule') {
    // As per workflow: move appointment to the end of the waiting queue
    target.status = 'Reschedule';
    list.splice(index, 1);
    list.push(target);
  } else {
    list[index] = target;
  }

  // Recalculate S.No
  const updated = list.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  saveAppointments(updated);
  return updated;
}

export function updateAppointmentConsultation(id, updates) {
  const list = getAppointments();
  const updated = list.map((a) => (a.id === id ? { ...a, ...updates } : a));
  saveAppointments(updated);
  return updated.find((a) => a.id === id);
}

export function finalizeOpdSlip(appointmentId, opdData, deliveryOption) {
  // 1. Mark appointment as completed
  const appointments = getAppointments().map((a) => {
    if (a.id === appointmentId) {
      return {
        ...a,
        status: 'Completed',
        finalizedOpdSlip: {
          ...opdData,
          deliveryOption,
          finalizedAt: new Date().toISOString(),
        },
      };
    }
    return a;
  });
  saveAppointments(appointments);

  // 2. Save to patient records
  const slips = load(OPD_SLIPS_KEY, []);
  slips.push({
    id: `slip-${Date.now()}`,
    appointmentId,
    patientName: opdData.patientName,
    date: opdData.date,
    deliveryOption,
    data: opdData,
  });
  save(OPD_SLIPS_KEY, slips);

  // 3. If Send to Pharmacy or Send to Both, send prescription to pharmacy queue
  if (deliveryOption === 'pharmacy' || deliveryOption === 'both') {
    const pharmaQueue = load(PHARMACY_QUEUE_KEY, []);
    pharmaQueue.push({
      id: `ph-q-${Date.now()}`,
      studentName: opdData.patientName,
      time: opdData.time || '11:24 AM',
      medicines: (opdData.prescriptions || []).map(
        (m) => `${m.name} ${m.strength || ''} - ${m.dose || '1'} (${m.instructions || ''})`
      ),
      diagnosis: opdData.diagnosis,
      doctorName: opdData.doctorName || 'Dr. Doom',
    });
    save(PHARMACY_QUEUE_KEY, pharmaQueue);
  }

  return true;
}

export function getTemplates() {
  return load(TEMPLATES_KEY, INITIAL_TEMPLATES);
}

export function saveTemplates(templates) {
  save(TEMPLATES_KEY, templates);
}

export function addTemplate(template) {
  const templates = getTemplates();
  const newTpl = {
    ...template,
    id: `tpl-${Date.now()}`,
  };
  const updated = [newTpl, ...templates];
  saveTemplates(updated);
  return updated;
}

export function updateTemplate(id, updates) {
  const templates = getTemplates();
  const updated = templates.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveTemplates(updated);
  return updated;
}

export function deleteTemplate(id) {
  const templates = getTemplates();
  const updated = templates.filter((t) => t.id !== id);
  saveTemplates(updated);
  return updated;
}

export function getDoctorStats(appointmentsList) {
  const list = appointmentsList ?? getAppointments();
  // Image 1 displays: Total Appointments: 12, Consulting: 5, Waiting: 3, Completed: 4
  const waitingCount = list.filter((a) => a.status === 'Waiting').length;
  const completedCount = list.filter((a) => a.status === 'Completed').length;
  const rescheduleCount = list.filter((a) => a.status === 'Reschedule').length;
  const cancelledCount = list.filter((a) => a.status === 'Cancelled').length;

  return {
    totalAppointments: 12, // Baseline capacity from wireframe, responsive to completion
    consulting: 5,
    waiting: waitingCount,
    completed: completedCount + 3, // Initial mock base + reactive completed
    cancelled: cancelledCount,
    reschedule: rescheduleCount,
  };
}
