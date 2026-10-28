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
 * Generates a public QR session for patients on the appointment form to upload reports from mobile.
 */
export async function getConsultationQrSession() {
  return await api.post('/clinical/consultation/qr-session/');
}

/**
 * Polls status of a QR upload session.
 */
export async function checkUploadSessionStatus(token) {
  return await api.get(`/clinical/upload-session/${token}/`);
}

/**
 * Submits the completed appointment form to the backend API.
 *
 * @param {AppointmentSubmissionPayload} payload
 * @returns {Promise<{ success: boolean, opdNumber: string, appointmentId: string, data: AppointmentSubmissionPayload, reports: Array }>}
 */
export async function submitAppointment(payload) {
  let docId = parseInt(payload.doctorId, 10);
  if (isNaN(docId) || docId <= 0) {
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

  const hasFiles = Array.isArray(payload.attachedFiles) && payload.attachedFiles.length > 0;
  let response;

  if (hasFiles || payload.sessionToken) {
    const formData = new FormData();
    formData.append('name', payload.name?.trim() || '');
    formData.append('email', payload.email?.trim() || '');
    formData.append('age', String(Number(payload.age) || 21));
    formData.append('gender', payload.gender || 'Male');
    formData.append('entry_number', payload.entryNumber?.trim().toUpperCase() || '');
    formData.append('department', payload.department?.trim() || 'General / Unspecified');
    formData.append('father_or_husband_name', payload.fatherOrHusbandName?.trim() || 'Guardian');
    formData.append('complaints', payload.complaints?.trim() || 'Consultation request');
    formData.append('past_illness', payload.pastIllness?.trim() || '');
    formData.append('allergies', payload.allergies?.trim() || '');
    formData.append('phone', payload.phone?.trim() || '');
    formData.append('emergency_contact_name', payload.emergencyContactName?.trim() || '');
    formData.append('emergency_contact_phone', payload.emergencyContactPhone?.trim() || '');
    formData.append('doctor_id', String(docId));
    formData.append('appointment_date', payload.appointmentDate || new Date().toISOString().split('T')[0]);
    formData.append('appointment_time', to24HourTime(payload.appointmentTime));
    formData.append('is_emergency', 'false');
    formData.append('consultation_source', payload.consultationSource || 'consult_later');

    if (payload.sessionToken) {
      formData.append('session_token', payload.sessionToken);
    }

    if (hasFiles) {
      payload.attachedFiles.forEach((fileItem) => {
        if (fileItem.file) {
          formData.append('reports', fileItem.file);
          formData.append('report_name', fileItem.name || fileItem.file.name);
          formData.append('report_type', fileItem.category || 'Lab Report');
        }
      });
    }

    response = await api.post('/clinical/appointments/public/', formData);
  } else {
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
    response = await api.post('/clinical/appointments/public/', backendPayload);
  }

  const opdNumber = response.opd_number || `OPD-${Date.now().toString().slice(-6)}`;
  const appointmentId = String(response.appointment_id || opdNumber);
  const returnedReports = Array.isArray(response.reports) ? response.reports : [];

  // Sync to doctor appointments store so doctor dashboard immediately sees the appointment
  try {
    const APPOINTMENTS_KEY = 'synapse.doctor.appointments';
    const raw = localStorage.getItem(APPOINTMENTS_KEY);
    let existingList = raw ? JSON.parse(raw) : [];

    const clientReports = returnedReports.length > 0 ? returnedReports : (payload.attachedFiles || []).map((f, i) => ({
      id: `rep-client-${Date.now()}-${i}`,
      name: f.name || f.file?.name || 'Medical Document',
      type: f.category || 'Lab Report',
      date: new Date().toLocaleDateString('en-GB'),
      size: f.sizeFormatted || '1.0 MB',
      file_url: f.previewUrl || '',
      summary: 'Uploaded by patient during consultation booking',
    }));

    const newAppointment = {
      id: appointmentId,
      sNo: 1,
      patientName: payload.name,
      patientCategory: payload.department ? 'Student / Staff' : 'General Patient',
      detailsSub: `OPD - General Medicine | ${payload.age}y | ${payload.gender}`,
      age: Number(payload.age) || 21,
      gender: payload.gender || 'Male',
      institutionId: payload.entryNumber || opdNumber,
      courseDepartment: payload.department || 'General',
      hostel: 'Campus',
      contact: payload.phone || 'N/A',
      fatherHusbandName: payload.fatherOrHusbandName || 'N/A',
      opdNumber: opdNumber,
      date: payload.appointmentDate || new Date().toLocaleDateString('en-GB'),
      time: payload.appointmentTime || '10:15 AM',
      status: 'Waiting',
      allergies: payload.allergies || 'None reported',
      currentMedicines: 'None',
      pastIllness: payload.pastIllness || 'None',
      reports: clientReports,
      complaints: [
        { complaint: payload.complaints, duration: 'Presenting complaint' },
      ],
      examination: {
        temperature: '98.6',
        bp: '120/80',
        pulse: '76',
        spo2: '99',
        oe: 'NAD',
        remarks: 'Consultation request from portal',
      },
      diagnosis: '',
      prescriptions: [],
      selectedTemplate: '',
      selectedTests: [],
      notes: '',
    };

    const resequenced = [newAppointment, ...existingList.filter(a => String(a.id) !== appointmentId)].map((item, idx) => ({
      ...item,
      sNo: idx + 1,
    }));
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(resequenced));
  } catch {
    /* ignore localStorage errors */
  }

  return {
    success: true,
    opdNumber,
    appointmentId,
    reports: returnedReports,
    data: {
      ...payload,
      opdNumber,
      status: response.status || 'CONFIRMED',
      createdAt: new Date().toISOString(),
      reports: returnedReports,
    },
  };
}
