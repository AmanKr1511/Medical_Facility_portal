import { useState } from 'react';
import { useAuth } from '../../../core/auth';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Avatar, Button, DataTable, Modal, Section } from '../../../core/ui';
import { getDoctorInfo, getRecentPrescriptions, getTodayAppointments } from '../services/doctorService';

const prescriptionColumns = [
  { key: 'patientName', header: 'Patient Name' },
  { key: 'diagnosis', header: 'Diagnosis' },
  { key: 'time', header: 'Time', width: '25%' },
];

export default function DoctorHome() {
  const { user } = useAuth();
  const info = useAsync(getDoctorInfo);
  const appointments = useAsync(getTodayAppointments);
  const prescriptions = useAsync(getRecentPrescriptions);

  const [activeConsultation, setActiveConsultation] = useState(null);

  const statusClass = (status) => {
    if (status === 'In Consultation') return 'doctor-status-badge status-in-consultation';
    if (status === 'Waiting') return 'doctor-status-badge status-waiting';
    return 'doctor-status-badge status-scheduled';
  };

  return (
    <div>
      <div className="doctor-header-card">
        <div className="doctor-profile-info">
          <Avatar name={user?.name ?? 'Dr. Meera Iyer'} size={48} />
          <div>
            <h1 className="doctor-meta-title">{user?.name ?? 'Dr. Meera Iyer'}</h1>
            <p className="doctor-meta-sub">
              {info.data?.speciality ?? 'General Physician'} • {info.data?.room ?? 'Room 104'}
            </p>
          </div>
        </div>
        <div className="doctor-stat-badge">
          <span>OPD Session Active</span>
        </div>
      </div>

      <div className="doctor-grid">
        <Section title="Today's Patient Queue" className="section--first">
          <AsyncView
            loading={appointments.loading}
            error={appointments.error}
            onRetry={appointments.reload}
          >
            <div className="doctor-queue-list">
              {(appointments.data ?? []).map((item) => {
                const isCurrent = item.status === 'In Consultation';
                return (
                  <div
                    key={item.id}
                    className={`doctor-queue-card${isCurrent ? ' is-active' : ''}`}
                  >
                    <div className="doctor-queue-row-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="doctor-token-chip">Token #{item.tokenNumber}</span>
                        <span className="doctor-queue-patient">
                          {item.patientName} ({item.gender}, {item.age}y)
                        </span>
                      </div>
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </div>

                    <p className="doctor-queue-complaint">
                      <strong>Complaint:</strong> {item.complaint}
                    </p>

                    <div className="doctor-vitals-row">
                      <span>BP: <strong>{item.vitals.bp}</strong></span>
                      <span>Pulse: <strong>{item.vitals.pulse}</strong></span>
                      <span>Temp: <strong>{item.vitals.temp}</strong></span>
                      <span style={{ marginLeft: 'auto', color: 'var(--c-muted)' }}>
                        Scheduled: {item.time}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <Button
                        variant={isCurrent ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setActiveConsultation(item)}
                      >
                        {isCurrent ? 'Continue Consultation' : 'Call Patient'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AsyncView>
        </Section>

        <div>
          <Section title="Recent Prescriptions" className="section--first">
            <AsyncView
              loading={prescriptions.loading}
              error={prescriptions.error}
              onRetry={prescriptions.reload}
            >
              <DataTable
                columns={prescriptionColumns}
                rows={prescriptions.data ?? []}
                empty="No prescriptions recorded today."
              />
            </AsyncView>
          </Section>
        </div>
      </div>

      {activeConsultation && (
        <Modal
          title={`Consultation: ${activeConsultation.patientName}`}
          onClose={() => setActiveConsultation(null)}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ color: 'var(--c-muted)' }}>
              Token #{activeConsultation.tokenNumber} • Patient ID: {activeConsultation.patientId}
            </p>
            <div className="card" style={{ background: 'var(--c-surface-alt)' }}>
              <strong>Reported Complaint:</strong>
              <p style={{ marginTop: 4 }}>{activeConsultation.complaint}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="card" style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>Blood Pressure</span>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{activeConsultation.vitals.bp}</p>
              </div>
              <div className="card" style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>Heart Rate</span>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{activeConsultation.vitals.pulse}</p>
              </div>
              <div className="card" style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>Temperature</span>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{activeConsultation.vitals.temp}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button variant="outline" onClick={() => setActiveConsultation(null)}>
                Close
              </Button>
              <Button onClick={() => setActiveConsultation(null)}>
                Save Consultation Notes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
