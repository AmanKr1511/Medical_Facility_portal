import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../../core/ui';
import {
  createEmergencyAppointment,
  finalizeOpdSlip,
  getAppointments,
  getDoctorStats,
  rescheduleAllAppointments,
  rescheduleCurrentAppointment,
  updateAppointmentStatus,
} from '../services/doctorStore';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalAppointments: 12,
    consulting: 5,
    waiting: 3,
    completed: 4,
  });
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [bannerNotice, setBannerNotice] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CONSULTING' | 'WAITING' | 'COMPLETED'

  // Emergency Case & Section state
  const [isEmergencyActive, setIsEmergencyActive] = useState(() => {
    return localStorage.getItem('synapse.doctor.emergency_active') === 'true';
  });
  const [emergencyForm, setEmergencyForm] = useState({
    patientName: 'Emergency Patient',
    triage: 'Critical (Red)',
    age: '24',
    gender: 'Male',
    complaint: 'Severe Acute Respiratory Distress & Chest Pain',
    vitals: { bp: '142/96', pulse: '118', spo2: '91', temp: '100.4' },
    treatment: 'High-flow Oxygen (6L/min), IV cannula access, Normal Saline 500ml stat, Inj. Hydrocortisone 100mg IV stat.',
  });

  useEffect(() => {
    const list = getAppointments();
    setAppointments(list);
    setStats(getDoctorStats(list));

    // Live clock: update every second
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = (id, newStatus) => {
    const updated = updateAppointmentStatus(id, newStatus);
    setAppointments(updated);
    setStats(getDoctorStats(updated));
  };

  const handleView = (aptId) => {
    const target = appointments.find((a) => a.id === aptId);
    if (target && target.status === 'Waiting') {
      handleStatusChange(aptId, 'In Progress');
    }
    navigate(`/doctor/consultation/${aptId}`);
  };

  // Separate active queue and completed patients
  const activeAppointments = appointments.filter((a) => a.status !== 'Completed');
  const completedAppointments = appointments.filter((a) => a.status === 'Completed');

  // Summary card click filtering logic
  const handleCardFilterClick = (filterType) => {
    if (activeFilter === filterType) {
      setActiveFilter('ALL');
    } else {
      setActiveFilter(filterType);
      if (filterType === 'COMPLETED') {
        setTimeout(() => {
          const el = document.getElementById('completed-patients-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  };

  // Filtered active queue appointments based on card click
  const displayedAppointments = activeAppointments.filter((a) => {
    if (activeFilter === 'WAITING') {
      return a.status === 'Waiting';
    }
    if (activeFilter === 'CONSULTING') {
      return a.status === 'In Progress' || a.status === 'Consulting';
    }
    return true;
  });

  // Currently in-progress patient
  const inProgressPatient = activeAppointments.find((a) => a.status === 'In Progress');

  // Next patient logic:
  // Go to the next patient in the active queue who is NOT in progress
  const nextPatient =
    activeAppointments.find(
      (a) => a.status !== 'In Progress' && a.status !== 'Cancelled'
    ) ||
    activeAppointments.find((a) => a.status !== 'In Progress') ||
    null;

  const handleNextPatient = () => {
    if (!nextPatient) return;
    if (nextPatient.status === 'Waiting' || nextPatient.status === 'Reschedule') {
      handleStatusChange(nextPatient.id, 'In Progress');
    }
    navigate(`/doctor/consultation/${nextPatient.id}`);
  };

  // Reschedule current in-progress patient to the end of the queue
  const handleRescheduleCurrent = () => {
    if (!inProgressPatient) return;
    const updated = rescheduleCurrentAppointment();
    setAppointments(updated);
    setStats(getDoctorStats(updated));
    setBannerNotice(`Rescheduled current patient (${inProgressPatient.patientName}) to the end of the queue.`);
    setTimeout(() => setBannerNotice(''), 4500);
  };

  // Reschedule all active patients and activate Emergency Patient Consultation section
  const handleRescheduleAll = () => {
    const updated = rescheduleAllAppointments();
    setAppointments(updated);
    setStats(getDoctorStats(updated));
    setIsEmergencyActive(true);
    localStorage.setItem('synapse.doctor.emergency_active', 'true');
    setBannerNotice('🚨 Emergency case protocol activated. All active queue appointments have been rescheduled.');
  };

  // Start full consultation for the emergency patient
  const handleStartFullEmergencyConsultation = () => {
    const emgApt = createEmergencyAppointment(emergencyForm);
    const list = getAppointments();
    setAppointments(list);
    setStats(getDoctorStats(list));
    navigate(`/doctor/consultation/${emgApt.id}`);
  };

  // Quick stabilize and finalize the emergency patient
  const handleQuickFinalizeEmergency = () => {
    const emgApt = createEmergencyAppointment(emergencyForm);
    finalizeOpdSlip(
      emgApt.id,
      {
        deliveryOption: 'both',
        patientName: emgApt.patientName,
        date: emgApt.date,
        time: emgApt.time,
        diagnosis: emergencyForm.complaint || 'Acute Emergency Presentation',
        prescriptions: [
          {
            id: 'emg-rx-1',
            name: 'Inj. Hydrocortisone',
            strength: '100 mg',
            dose: '1 IV Stat',
            timesPerDay: '1',
            days: 1,
            instructions: 'Immediate',
          },
          {
            id: 'emg-rx-2',
            name: 'Normal Saline (IV Infusion)',
            strength: '500 ml',
            dose: '1 Bottle',
            timesPerDay: '1',
            days: 1,
            instructions: 'IV over 30 mins',
          },
        ],
        examination: emgApt.examination,
        tests: ['ECG', 'CBC', 'Blood Glucose'],
        notes: emergencyForm.treatment,
        doctorName: 'Dr. Doom',
      },
      'both'
    );
    const list = getAppointments();
    setAppointments(list);
    setStats(getDoctorStats(list));
    setIsEmergencyActive(false);
    localStorage.removeItem('synapse.doctor.emergency_active');
    setBannerNotice(`Emergency consultation for ${emgApt.patientName} stabilized and recorded in completed patients.`);
    setTimeout(() => setBannerNotice(''), 5000);
  };

  // Dismiss / close emergency section
  const handleResolveEmergency = () => {
    setIsEmergencyActive(false);
    localStorage.removeItem('synapse.doctor.emergency_active');
    setBannerNotice('Emergency protocol closed. Rescheduled patients are available in the queue.');
    setTimeout(() => setBannerNotice(''), 3500);
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'Waiting':
        return 'doc-status-badge is-waiting';
      case 'In Progress':
        return 'doc-status-badge is-in-progress';
      case 'Reschedule':
        return 'doc-status-badge is-reschedule';
      case 'Completed':
        return 'doc-status-badge is-completed';
      case 'Cancelled':
        return 'doc-status-badge is-cancelled';
      default:
        return 'doc-status-badge';
    }
  };

  return (
    <div className="doc-page">
      {/* Page Header */}
      <div className="doc-page-head">
        <div>
          <h1 className="doc-page-title">Doctor Dashboard</h1>
          <p className="doc-page-sub">
            Outpatient queue, consultation management, and patient history
          </p>
        </div>

        <div className="doc-date-badge">
          <Icon name="calendar" size={16} />
          <span>
            {currentDateTime.toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' '}
            • {currentDateTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Banner Notice Alert */}
      {bannerNotice && (
        <div
          className={
            isEmergencyActive
              ? 'tpl-alert-success doc-alert-emergency-banner'
              : 'tpl-alert-success'
          }
          role="status"
          style={{ marginBottom: 18 }}
        >
          <Icon name={isEmergencyActive ? 'bell' : 'checkCircle'} size={18} />
          <span style={{ fontWeight: 600 }}>{bannerNotice}</span>
        </div>
      )}

      {/* Summary KPI Cards Grid (Click to filter queue) */}
      <div className="doc-stats-grid">
        {/* Total Appointments */}
        <div
          role="button"
          tabIndex={0}
          className={`doc-stat-card card-total ${activeFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => handleCardFilterClick('ALL')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardFilterClick('ALL');
            }
          }}
          title="Click to view all appointments"
        >
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-blue">
              <Icon name="calendar" size={20} />
            </span>
            <span className="doc-stat-number">{stats.totalAppointments}</span>
          </div>
          <div className="doc-stat-label">Total Appointments</div>
        </div>

        {/* Consulting */}
        <div
          role="button"
          tabIndex={0}
          className={`doc-stat-card card-consulting ${activeFilter === 'CONSULTING' ? 'is-active' : ''}`}
          onClick={() => handleCardFilterClick('CONSULTING')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardFilterClick('CONSULTING');
            }
          }}
          title="Click to filter Consulting / In Progress patients"
        >
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-green">
              <Icon name="stethoscope" size={20} />
            </span>
            <span className="doc-stat-number">{stats.consulting}</span>
          </div>
          <div className="doc-stat-label">Consulting</div>
        </div>

        {/* Waiting */}
        <div
          role="button"
          tabIndex={0}
          className={`doc-stat-card card-waiting ${activeFilter === 'WAITING' ? 'is-active' : ''}`}
          onClick={() => handleCardFilterClick('WAITING')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardFilterClick('WAITING');
            }
          }}
          title="Click to filter Waiting queue patients"
        >
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-orange">
              <Icon name="hourglass" size={20} />
            </span>
            <span className="doc-stat-number">{stats.waiting}</span>
          </div>
          <div className="doc-stat-label">Waiting</div>
        </div>

        {/* Completed */}
        <div
          role="button"
          tabIndex={0}
          className={`doc-stat-card card-completed ${activeFilter === 'COMPLETED' ? 'is-active' : ''}`}
          onClick={() => handleCardFilterClick('COMPLETED')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardFilterClick('COMPLETED');
            }
          }}
          title="Click to view Completed consultations"
        >
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-purple">
              <Icon name="checkCircle" size={20} />
            </span>
            <span className="doc-stat-number">{stats.completed}</span>
          </div>
          <div className="doc-stat-label">Completed</div>
        </div>
      </div>

      {/* Emergency Patient Consultation Section (Triggered via Reschedule All) */}
      {isEmergencyActive && (
        <div className="doc-section-card doc-emergency-section">
          <div className="doc-emergency-header">
            <div className="doc-emergency-badge-wrap">
              <span className="doc-emergency-pulse" />
              <span className="doc-emergency-badge">🚨 EMERGENCY TRIAGE PROTOCOL ACTIVE</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="doc-emergency-resolve-btn"
              onClick={handleResolveEmergency}
              title="Close emergency protocol"
            >
              Resolve / Close Emergency
            </Button>
          </div>

          <div className="doc-emergency-banner-text">
            <h2 className="doc-emergency-title">Emergency Patient Consultation</h2>
            <p className="doc-emergency-desc">
              All regular appointments have been rescheduled to accommodate this critical emergency case. Document emergency findings and triage care below.
            </p>
          </div>

          <div className="doc-emergency-grid">
            {/* Left Column: Triage, Demographics & Chief Complaint */}
            <div className="doc-emergency-card-left">
              <div className="doc-emergency-field-row">
                <div className="doc-emergency-field" style={{ flex: 2 }}>
                  <label>Emergency Patient Name / Identifier</label>
                  <input
                    type="text"
                    className="input doc-emergency-input"
                    value={emergencyForm.patientName}
                    onChange={(e) =>
                      setEmergencyForm({ ...emergencyForm, patientName: e.target.value })
                    }
                    placeholder="e.g. Emergency Patient"
                  />
                </div>

                <div className="doc-emergency-field" style={{ flex: 1.5 }}>
                  <label>Triage Priority</label>
                  <select
                    className="input doc-emergency-input doc-emergency-triage-select"
                    value={emergencyForm.triage}
                    onChange={(e) =>
                      setEmergencyForm({ ...emergencyForm, triage: e.target.value })
                    }
                  >
                    <option value="Critical (Red)">Critical (Red) - Immediate</option>
                    <option value="Urgent (Yellow)">Urgent (Yellow)</option>
                    <option value="Severe Trauma">Severe Trauma</option>
                    <option value="Acute Cardiac">Acute Cardiac</option>
                    <option value="Severe Anaphylaxis">Severe Anaphylaxis</option>
                  </select>
                </div>

                <div className="doc-emergency-field" style={{ flex: 1 }}>
                  <label>Age / Sex</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      style={{ width: '60px' }}
                      className="input doc-emergency-input"
                      value={emergencyForm.age}
                      onChange={(e) =>
                        setEmergencyForm({ ...emergencyForm, age: e.target.value })
                      }
                      placeholder="Age"
                    />
                    <select
                      className="input doc-emergency-input"
                      value={emergencyForm.gender}
                      onChange={(e) =>
                        setEmergencyForm({ ...emergencyForm, gender: e.target.value })
                      }
                    >
                      <option value="Male">M</option>
                      <option value="Female">F</option>
                      <option value="Other">O</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="doc-emergency-field" style={{ marginTop: 12 }}>
                <label>Emergency Chief Complaint / Presentation</label>
                <input
                  type="text"
                  className="input doc-emergency-input"
                  value={emergencyForm.complaint}
                  onChange={(e) =>
                    setEmergencyForm({ ...emergencyForm, complaint: e.target.value })
                  }
                  placeholder="e.g. Severe acute breathlessness & chest pain"
                />
              </div>

              <div className="doc-emergency-vitals-row">
                <div className="doc-emergency-vital-box">
                  <span className="doc-vital-label">BP</span>
                  <input
                    type="text"
                    className="input doc-vital-input"
                    value={emergencyForm.vitals.bp}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        vitals: { ...emergencyForm.vitals, bp: e.target.value },
                      })
                    }
                    placeholder="140/90"
                  />
                </div>
                <div className="doc-emergency-vital-box">
                  <span className="doc-vital-label">Pulse</span>
                  <input
                    type="text"
                    className="input doc-vital-input"
                    value={emergencyForm.vitals.pulse}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        vitals: { ...emergencyForm.vitals, pulse: e.target.value },
                      })
                    }
                    placeholder="110"
                  />
                </div>
                <div className="doc-emergency-vital-box">
                  <span className="doc-vital-label">SpO2</span>
                  <input
                    type="text"
                    className="input doc-vital-input"
                    value={emergencyForm.vitals.spo2}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        vitals: { ...emergencyForm.vitals, spo2: e.target.value },
                      })
                    }
                    placeholder="92%"
                  />
                </div>
                <div className="doc-emergency-vital-box">
                  <span className="doc-vital-label">Temp</span>
                  <input
                    type="text"
                    className="input doc-vital-input"
                    value={emergencyForm.vitals.temp}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        vitals: { ...emergencyForm.vitals, temp: e.target.value },
                      })
                    }
                    placeholder="100.4"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Interventions & Action Triggers */}
            <div className="doc-emergency-card-right">
              <div className="doc-emergency-field">
                <label>Emergency Immediate Interventions / Stat Medications</label>
                <textarea
                  className="input doc-emergency-textarea"
                  rows={3}
                  value={emergencyForm.treatment}
                  onChange={(e) =>
                    setEmergencyForm({ ...emergencyForm, treatment: e.target.value })
                  }
                  placeholder="e.g. High-flow O2 (6L/min), IV Normal Saline bolus, Inj. Hydrocortisone 100mg IV stat..."
                />
              </div>

              <div className="doc-emergency-actions-bar">
                <Button
                  variant="primary"
                  className="doc-emergency-start-btn"
                  onClick={handleStartFullEmergencyConsultation}
                >
                  <Icon name="stethoscope" size={16} />
                  <span>Open Full Consultation</span>
                </Button>

                <Button
                  variant="outline"
                  className="doc-emergency-quick-finalize-btn"
                  onClick={handleQuickFinalizeEmergency}
                >
                  <Icon name="checkCircle" size={16} />
                  <span>Quick Stabilize & Complete</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Appointments Section (Active Queue) */}
      <div className="doc-section-card">
        <div className="doc-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="doc-table-title">Today's Appointments</h2>
            <span className="doc-count-badge is-active">
              {activeFilter !== 'ALL' && activeFilter !== 'COMPLETED'
                ? `${displayedAppointments.length} of ${activeAppointments.length} Active`
                : `${activeAppointments.length} Active`}
            </span>
          </div>
          <p className="doc-section-sub">
            Active consultation and waiting queue for today's OPD session
          </p>
        </div>

        {/* Active Filter Bar */}
        {activeFilter !== 'ALL' && (
          <div className={`doc-filter-bar filter-${activeFilter.toLowerCase()}`}>
            <div className="doc-filter-bar-left">
              <span className="doc-filter-indicator-dot" />
              <span className="doc-filter-text">
                Filter:{' '}
                <strong>
                  {activeFilter === 'WAITING'
                    ? 'Waiting Patients'
                    : activeFilter === 'CONSULTING'
                    ? 'Consulting / In Progress'
                    : 'Completed Consultations'}
                </strong>
              </span>
              <span className="doc-filter-count">
                ({activeFilter === 'COMPLETED' ? completedAppointments.length : displayedAppointments.length}{' '}
                {(activeFilter === 'COMPLETED' ? completedAppointments.length : displayedAppointments.length) === 1
                  ? 'patient'
                  : 'patients'})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeFilter === 'COMPLETED' && (
                <button
                  type="button"
                  className="doc-filter-jump-btn"
                  onClick={() => {
                    const el = document.getElementById('completed-patients-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Jump to Completed ↓
                </button>
              )}
              <button
                type="button"
                className="doc-filter-clear-btn"
                onClick={() => setActiveFilter('ALL')}
                title="Clear filter and view all appointments"
              >
                <Icon name="close" size={12} />
                <span>Clear Filter</span>
              </button>
            </div>
          </div>
        )}

        {activeAppointments.length === 0 ? (
          <div className="doc-empty-state">
            <div className="doc-empty-icon icon-green">
              <Icon name="checkCircle" size={32} />
            </div>
            <div className="doc-empty-title">All consultations completed!</div>
            <p className="doc-empty-desc">
              There are no pending patients in the active queue. You can review completed patients below.
            </p>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div className="doc-empty-state">
            <div className="doc-empty-icon icon-orange">
              <Icon name="hourglass" size={32} />
            </div>
            <div className="doc-empty-title">
              No {activeFilter === 'WAITING' ? 'waiting' : 'consulting'} patients
            </div>
            <p className="doc-empty-desc">
              There are currently no patients in the active queue with status "
              {activeFilter === 'WAITING' ? 'Waiting' : 'In Progress'}".
            </p>
            <div style={{ marginTop: 12 }}>
              <Button variant="outline" size="sm" onClick={() => setActiveFilter('ALL')}>
                Show All Patients
              </Button>
            </div>
          </div>
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>S.No.</th>
                  <th style={{ width: '52%' }}>Patient</th>
                  <th style={{ width: '24%' }}>Status</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedAppointments.map((apt, index) => (
                  <tr
                    key={apt.id}
                    className={apt.status === 'In Progress' ? 'doc-row-in-progress' : ''}
                  >
                    <td className="doc-sno">{index + 1}</td>
                    <td>
                      <div className="doc-patient-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="doc-patient-name">{apt.patientName}</span>
                          {apt.status === 'In Progress' && (
                            <span className="doc-live-tag">
                              <span className="doc-pulse-dot" /> Consulting Now
                            </span>
                          )}
                        </div>
                        <span className="doc-patient-sub">{apt.detailsSub}</span>
                      </div>
                    </td>
                    <td>
                      <div className="doc-status-select-wrap">
                        <select
                          className={statusBadgeClass(apt.status)}
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          aria-label={`Status for ${apt.patientName}`}
                        >
                          <option value="Waiting">Waiting</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Reschedule">Reschedule</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        variant={apt.status === 'In Progress' ? 'primary' : 'outline'}
                        size="sm"
                        className="doc-view-btn"
                        onClick={() => handleView(apt.id)}
                      >
                        {apt.status === 'In Progress' ? 'Continue' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions bar on bottom left corner of Today's Appointments */}
        <div className="doc-table-footer-left">
          <Button
            variant="primary"
            className="doc-btn-next-patient"
            onClick={handleNextPatient}
            disabled={!nextPatient}
            title={
              nextPatient
                ? `Navigate to next patient: ${nextPatient.patientName}`
                : 'No waiting patients in queue'
            }
          >
            <Icon name="arrowRight" size={16} />
            <span>Next Patient</span>
            {nextPatient && (
              <span className="doc-next-patient-name">({nextPatient.patientName})</span>
            )}
          </Button>

          <Button
            variant="outline"
            className="doc-btn-reschedule-current"
            onClick={handleRescheduleCurrent}
            disabled={!inProgressPatient}
            title={
              inProgressPatient
                ? `Reschedule current in-progress patient (${inProgressPatient.patientName}) to end of queue`
                : 'No patient is currently in progress'
            }
          >
            <Icon name="hourglass" size={15} />
            <span>Reschedule Current</span>
            {inProgressPatient && (
              <span className="doc-reschedule-name">({inProgressPatient.patientName})</span>
            )}
          </Button>

          <Button
            variant="outline"
            className="doc-btn-reschedule-all"
            onClick={handleRescheduleAll}
            disabled={activeAppointments.length === 0}
            title="Reschedule all patients to end of queue and open Emergency Patient Consultation"
          >
            <Icon name="bell" size={15} />
            <span>Reschedule All</span>
          </Button>
        </div>
      </div>

      {/* Separate Section: Completed Patients */}
      <div
        id="completed-patients-section"
        className={`doc-section-card doc-completed-section ${activeFilter === 'COMPLETED' ? 'is-highlighted-section' : ''}`}
      >
        <div className="doc-table-header doc-section-header-flex">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="doc-table-title">Completed Patients</h2>
              <span className="doc-count-badge is-completed">
                {completedAppointments.length} Completed
              </span>
            </div>
            <p className="doc-section-sub">
              Patients who have completed their consultation today and received prescriptions / OPD slips
            </p>
          </div>
        </div>

        {completedAppointments.length === 0 ? (
          <div className="doc-empty-state">
            <div className="doc-empty-icon icon-purple">
              <Icon name="checkCircle" size={32} />
            </div>
            <div className="doc-empty-title">No completed patients yet</div>
            <p className="doc-empty-desc">
              When a patient's consultation is finalized with an OPD slip or marked as Completed, they will be displayed in this section.
            </p>
          </div>
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>S.No.</th>
                  <th style={{ width: '28%' }}>Patient</th>
                  <th style={{ width: '24%' }}>Diagnosis / Complaint</th>
                  <th style={{ width: '18%' }}>Prescription & Tests</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {completedAppointments.map((apt, index) => {
                  const prescriptionCount = apt.prescriptions?.length || 0;
                  const testsCount = apt.selectedTests?.length || 0;
                  const diagnosisText =
                    apt.finalizedOpdSlip?.diagnosis ||
                    apt.diagnosis ||
                    (Array.isArray(apt.complaints) && apt.complaints[0]?.complaint) ||
                    'General checkup';

                  return (
                    <tr key={apt.id} className="doc-row-completed">
                      <td className="doc-sno">{index + 1}</td>
                      <td>
                        <div className="doc-patient-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="doc-patient-name">{apt.patientName}</span>
                            {(apt.isEmergency || apt.patientCategory === 'Emergency') && (
                              <span className="doc-emergency-tag">
                                🚨 EMERGENCY
                              </span>
                            )}
                          </div>
                          <span className="doc-patient-sub">
                            {apt.detailsSub ||
                              `${apt.age}y • ${apt.gender} • ${apt.patientCategory || 'Student'}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="doc-diagnosis-cell">
                          <span className="doc-diagnosis-title">{diagnosisText}</span>
                          {apt.finalizedOpdSlip?.deliveryOption && (
                            <span className="doc-route-badge">
                              Sent to:{' '}
                              {apt.finalizedOpdSlip.deliveryOption === 'pharmacist'
                                ? 'Pharmacist'
                                : apt.finalizedOpdSlip.deliveryOption === 'patient'
                                ? 'Patient'
                                : 'Both'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="doc-rx-summary-cell">
                          <span className="doc-rx-badge">
                            <Icon name="pill" size={13} />
                            <span>
                              {prescriptionCount} {prescriptionCount === 1 ? 'Med' : 'Meds'}
                            </span>
                          </span>
                          {testsCount > 0 && (
                            <span className="doc-test-badge">
                              <Icon name="fileText" size={13} />
                              <span>
                                {testsCount} {testsCount === 1 ? 'Test' : 'Tests'}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="doc-status-select-wrap">
                          <select
                            className={statusBadgeClass(apt.status)}
                            value={apt.status}
                            onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                            aria-label={`Status for ${apt.patientName}`}
                          >
                            <option value="Waiting">Waiting</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Reschedule">Reschedule</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="doc-view-btn"
                          onClick={() => handleView(apt.id)}
                          title="View consultation details"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
