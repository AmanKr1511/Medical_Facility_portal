import { useCallback, useState } from 'react';
import { Button, Modal } from '../../../core/ui';
import IITRoparLogo from '../../doctor/components/IITRoparLogo';
import { formatDate } from '../../../core/utils/date';

export function useOpdSlipViewer(visitsData, PatientProfile) {
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const close = useCallback(() => setSelectedVisitId(null), []);

  if (!visitsData || !Array.isArray(visitsData)) {
    return { openSlip: setSelectedVisitId };
  }

  // Find the specific visit that was clicked
  const visit = selectedVisitId ? visitsData.find((v) => v.id === selectedVisitId) : null;

  const slipViewer = selectedVisitId && visit ? (
    <Modal title="Digital OPD Slip" onClose={close} width="920px">
      <div className="opd-sheet">
        <div className="opd-inst-header">
          <div className="opd-logo-cell">
            <IITRoparLogo size={88} />
          </div>
          <div className="opd-header-text">
            <div className="opd-inst-banner">INDIAN INSTITUTE OF TECHNOLOGY ROPAR</div>
            <div className="opd-inst-address">Medical Center / Rupnagar-140001, Punjab, India</div>
            <div className="opd-inst-contact">Medical Centre Emergency Contact No. 01881-235193, 90410-53926</div>
          </div>
        </div>
        <div className="opd-patient-meta">
          <div className="opd-meta-row">
            <div className="opd-meta-item flex-2">
              <span className="opd-label">Name</span>
              <span className="opd-value-underline">{PatientProfile?.name || '-'}</span>
            </div>
            <div className="opd-meta-item flex-1">
              <span className="opd-label">IPD/OPD No.</span>
              <span className="opd-value-underline">{visit.opd_number || '-'}</span>
            </div>
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Date</span>
              <span className="opd-value-underline">{formatDate(visit.date)}</span>
            </div>
          </div>
          <div className="opd-meta-row">
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Father's/Husband's Name</span>
              <span className="opd-value-underline">{visit.fatherHusbandName || '-'}</span>
            </div>
          </div>
          <div className="opd-meta-row">
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Age</span>
              <span className="opd-value-underline">{PatientProfile?.age || '-'}</span>
            </div>
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Gender</span>
              <span className="opd-value-underline">{PatientProfile?.gender || '-'}</span>
            </div>
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Department</span>
              <span className="opd-value-underline">{PatientProfile?.department || '-'}</span>
            </div>
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Entry No.</span>
              <span className="opd-value-underline">{PatientProfile?.id || '-'}</span>
            </div>
          </div>
          <div className="opd-categories-row">
            {['Faculty', 'Staff', 'Family', 'Student'].map((cat) => {
              const isChecked = (visit.patientCategory || 'Student') === cat;
              return (
                <label key={cat} className="opd-checkbox-label">
                  <span>{cat}</span>
                  <span className={`opd-fake-box ${isChecked ? 'is-checked' : ''}`}>
                    {isChecked ? '✔' : ''}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="opd-meta-row opd-diagnosis-row">
            <div className="opd-meta-item flex-1">
              <span className="opd-label">Diagnosis</span>
              <span className="opd-value-underline bold">{visit.diagnosis || 'Routine consultation'}</span>
            </div>
          </div>
        </div>
        <div className="opd-clinical-table">
          <div className="opd-col-reports">
            <div className="opd-col-header">Date/Reports</div>
            <div className="opd-reports-content">
              <div className="opd-report-row">
                <span className="opd-report-date">{formatDate(visit.date)}</span>
                <span className="opd-report-desc">OPD Consultation – {visit.doctorName}</span>
              </div>
              <div className="opd-blank-lines">
                <div className="opd-line"></div>
                <div className="opd-line"></div>
                <div className="opd-line"></div>
                <div className="opd-line"></div>
              </div>
            </div>
          </div>
          <div className="opd-col-treatment">
            <div className="opd-col-header">Notes & Treatment</div>
            <div className="opd-treatment-content">
              <p className="opd-complaints-line">C/o – {visit.complaint || 'Routine consultation'}.</p>
              <div className="opd-adv-section">
                <strong className="opd-adv-heading">Adv:</strong>
                <ul className="opd-adv-list">
                  {visit.medicines?.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                  <li>Review if symptoms persist.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="opd-footer">
          <div className="opd-doctor-block">
            <div className="opd-doc-name">
              Dr. {visit.doctorName.replace(/^Dr\.?\s+/i, '')}
            </div>
            <div className="opd-doc-title">Medical Officer</div>
            <div className="opd-doc-facility">IIT Ropar Medical Centre</div>
          </div>
        </div>
      </div>
      <div className="opd-slip-actions">
        <Button
          variant="outline"
          disabled
          onClick={() =>
            alert('Send on Mail functionality will be implemented via backend.')
          }
        >
          <span>Send on Mail</span>
        </Button>
        <Button onClick={close}>Done</Button>
      </div>
    </Modal>
  ) : null;

  return { openSlip: setSelectedVisitId, slipViewer };
}