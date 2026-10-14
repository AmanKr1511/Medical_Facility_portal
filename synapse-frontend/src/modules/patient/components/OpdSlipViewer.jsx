import { useCallback, useState } from 'react';
import { Button, Icon, LogoMark, Modal } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';
import { mockPatientProfile, mockVisits } from '../services/mock';

export function useOpdSlipViewer() {
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const close = useCallback(() => setSelectedVisitId(null), []);

  const visit = selectedVisitId
    ? mockVisits.find((v) => v.id === selectedVisitId) || {
        id: selectedVisitId,
        date: new Date().toISOString().split('T')[0],
        doctorName: 'Attending Physician',
        complaint: 'Routine follow-up',
        medicines: ['Paracetamol 500mg'],
      }
    : null;

  const slipViewer = selectedVisitId && visit ? (
    <Modal title="Digital OPD Slip" onClose={close}>
      <div className="opd-slip">
        <div className="opd-slip__header">
          <div className="opd-slip__brand">
            <LogoMark size={24} />
            <span>SYNapse Health Centre</span>
          </div>
          <span className="opd-slip__badge">Slip #{visit.id.toUpperCase()}</span>
        </div>

        <div className="opd-slip__section">
          <h4 className="opd-slip__section-title">Patient Particulars</h4>
          <div className="opd-slip__grid">
            <div>
              <span className="opd-label">Name:</span> {mockPatientProfile.name}
            </div>
            <div>
              <span className="opd-label">Patient ID:</span> {mockPatientProfile.id}
            </div>
            <div>
              <span className="opd-label">Age / Gender:</span> {mockPatientProfile.age} yrs / {mockPatientProfile.gender}
            </div>
            <div>
              <span className="opd-label">Contact:</span> {mockPatientProfile.contact}
            </div>
          </div>
        </div>

        <div className="opd-slip__section">
          <h4 className="opd-slip__section-title">Clinical Consultation</h4>
          <div className="opd-slip__grid">
            <div>
              <span className="opd-label">Visit Date:</span> {formatDate(visit.date)}
            </div>
            <div>
              <span className="opd-label">Doctor:</span> {visit.doctorName}
            </div>
            <div className="opd-slip__grid--full">
              <span className="opd-label">Chief Complaint:</span> {visit.complaint}
            </div>
          </div>
        </div>

        <div className="opd-slip__section">
          <h4 className="opd-slip__section-title">Prescribed Medication</h4>
          <ul className="opd-slip__med-list">
            {visit.medicines?.map((med, idx) => (
              <li key={idx} className="opd-slip__med-item">
                <span className="opd-slip__med-dot" />
                <span>{med}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="opd-slip__footer">
          <p className="opd-slip__disclaimer">
            * This is a computer-generated medical consultation slip from SYNapse Institute Facility Portal.
          </p>
          <div className="opd-slip__actions">
            <Button variant="outline" onClick={() => window.print()}>
              <Icon name="download" size={16} />
              <span>Print Slip</span>
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      </div>
    </Modal>
  ) : null;

  return { openSlip: setSelectedVisitId, slipViewer };
}
