import { useState } from 'react';
import { Button, Icon } from '../../../core/ui';
import IITRoparLogo from './IITRoparLogo';

export default function OpdSlipModal({
  appointment,
  consultationData,
  doctorName = 'Dr. Doom',
  onClose,
  onFinalize,
}) {
  const complaintsText = Array.isArray(appointment.complaints)
    ? appointment.complaints
        .map((c) => (typeof c === 'object' && c ? `${c.complaint} (${c.duration})` : String(c)))
        .join(', ')
    : typeof appointment.complaints === 'string'
    ? appointment.complaints
    : '';

  const complaintsSentence = complaintsText
    ? `C/o – ${complaintsText}.`
    : 'C/o – Routine consultation.';

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleConfirmFinalize = async () => {
    setIsFinalizing(true);
    await onFinalize({
      deliveryOption: 'both',
      patientName: appointment.patientName,
      date: appointment.date,
      time: appointment.time,
      diagnosis: consultationData.diagnosis,
      prescriptions: consultationData.prescriptions,
      examination: consultationData.examination,
      tests: consultationData.selectedTests,
      notes: consultationData.notes,
      doctorName,
    });
  };

  // Checkbox categories
  const categories = ['Faculty', 'Staff', 'Family', 'Student', 'Cash', 'Credit', 'Others'];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="opd-modal-container">
        {/* Modal Top Header */}
        <div className="opd-modal-header">
          <h2 className="opd-modal-title">Generated OPD Slip</h2>
          <button
            type="button"
            className="opd-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Scrollable Printable Document */}
        <div className="opd-modal-body">
          <div className="opd-sheet">
            {/* Institution Header */}
            <div className="opd-inst-header">
              <div className="opd-logo-cell">
                <IITRoparLogo size={88} />
              </div>
              <div className="opd-header-text">
                <div className="opd-inst-banner">
                  INDIAN INSTITUTE OF TECHNOLOGY ROPAR
                </div>
                <div className="opd-inst-address">
                  Medical Center / Rupnagar-140001, Punjab, India
                </div>
                <div className="opd-inst-contact">
                  Medical Centre Emergency Contact No. 01881-235193, 90410-53926
                </div>
              </div>
            </div>

            {/* Document Title */}
            <h1 className="opd-main-title">OPD SLIP</h1>

            {/* Patient Demographic Details */}
            <div className="opd-patient-meta">
              <div className="opd-meta-row">
                <div className="opd-meta-item flex-3">
                  <span className="opd-label">Name</span>
                  <span className="opd-value-underline">{appointment.patientName}</span>
                </div>
                <div className="opd-meta-item flex-2">
                  <span className="opd-label">IPD/OPD No.</span>
                  <span className="opd-value-underline">{appointment.opdNumber || '20205'}</span>
                </div>
                <div className="opd-meta-item flex-2">
                  <span className="opd-label">Date</span>
                  <span className="opd-value-underline">{appointment.date || '13/10/2026'}</span>
                </div>
              </div>

              <div className="opd-meta-row">
                <div className="opd-meta-item flex-1">
                  <span className="opd-label">Father's/Husband's Name</span>
                  <span className="opd-value-underline">
                    {appointment.fatherHusbandName || 'Sanjay Mehta'}
                  </span>
                </div>
              </div>

              <div className="opd-meta-row">
                <div className="opd-meta-item flex-1">
                  <span className="opd-label">Age</span>
                  <span className="opd-value-underline">{appointment.age}</span>
                </div>
                <div className="opd-meta-item flex-1">
                  <span className="opd-label">Gender</span>
                  <span className="opd-value-underline">{appointment.gender}</span>
                </div>
                <div className="opd-meta-item flex-2">
                  <span className="opd-label">Department</span>
                  <span className="opd-value-underline">
                    {appointment.courseDepartment || 'B.Tech (CSE)'}
                  </span>
                </div>
                <div className="opd-meta-item flex-2">
                  <span className="opd-label">Entry No.</span>
                  <span className="opd-value-underline">{appointment.institutionId || 'STU-1023'}</span>
                </div>
              </div>

              {/* Patient Category Checkboxes */}
              <div className="opd-categories-row">
                {categories.map((cat) => {
                  const isChecked =
                    (appointment.patientCategory || '').toLowerCase() === cat.toLowerCase();
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

              {/* Diagnosis */}
              <div className="opd-meta-row opd-diagnosis-row">
                <div className="opd-meta-item flex-1">
                  <span className="opd-label">Diagnosis</span>
                  <span className="opd-value-underline bold">
                    {consultationData.diagnosis || 'Viral fever'}
                  </span>
                </div>
              </div>
            </div>

            {/* Two-Column Clinical Table */}
            <div className="opd-clinical-table">
              <div className="opd-col-reports">
                <div className="opd-col-header">Date/Reports</div>
                <div className="opd-reports-content">
                  <div className="opd-vital-item">
                    <span className="opd-vital-label">BP</span>
                    <span className="opd-vital-val">
                      {consultationData.examination?.bp || '127/77'} mmHg
                    </span>
                  </div>
                  <div className="opd-vital-item">
                    <span className="opd-vital-label">PR</span>
                    <span className="opd-vital-val">
                      {consultationData.examination?.pulse || '105'} /min
                    </span>
                  </div>
                  <div className="opd-vital-item">
                    <span className="opd-vital-label">Temp</span>
                    <span className="opd-vital-val">
                      {consultationData.examination?.temperature || '99.7'} °F
                    </span>
                  </div>
                  <div className="opd-vital-item">
                    <span className="opd-vital-label">SpO₂</span>
                    <span className="opd-vital-val">
                      {consultationData.examination?.spo2 || '98'} %
                    </span>
                  </div>
                  <div className="opd-vital-item">
                    <span className="opd-vital-label">O/E</span>
                    <span className="opd-vital-val">
                      {consultationData.examination?.oe || 'NAD'}
                    </span>
                  </div>

                  {/* Underline note lines */}
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
                  {/* Complaints */}
                  <p className="opd-complaints-line">{complaintsSentence}</p>

                  <div className="opd-adv-section">
                    <strong className="opd-adv-heading">Adv:</strong>
                    <ul className="opd-adv-list">
                      {consultationData.notes && (
                        <li>Rest and take warm fluids. {consultationData.notes}</li>
                      )}
                      {(consultationData.prescriptions || []).map((p, idx) => (
                        <li key={idx}>
                          {p.name} {p.strength} – {p.dose || '1'} tab{' '}
                          {p.timesPerDay === '3'
                            ? 'TDS'
                            : p.timesPerDay === '2'
                            ? 'BD'
                            : 'OD'}{' '}
                          for {p.days} days ({p.instructions}).
                        </li>
                      ))}
                      {(consultationData.selectedTests || []).length > 0 && (
                        <li>Lab: {consultationData.selectedTests.join(', ')}</li>
                      )}
                      <li>Review if symptoms persist.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor Signature Block (strictly text only, no signature image, no "Digitally Signed by") */}
            <div className="opd-footer">
              <div className="opd-doctor-block">
                <div className="opd-doc-name">{doctorName}</div>
                <div className="opd-doc-title">Medical Officer</div>
                <div className="opd-doc-facility">IIT Ropar Medical Centre</div>
                <div className="opd-doc-datetime">
                  Date: {appointment.date || '13/10/2026'}&nbsp;&nbsp;&nbsp;&nbsp;Time:{' '}
                  {appointment.time || '11:24 AM'}
                </div>
              </div>
            </div>
          </div>

          {/* Generate OPD Slip Button */}
          <div className="opd-generate-actions">
            <Button
              variant="primary"
              onClick={handleConfirmFinalize}
              disabled={isFinalizing}
              style={{ padding: '10px 24px', fontSize: 15 }}
            >
              {isFinalizing ? 'Finalizing...' : 'Generate OPD Slip'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
