import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth';
import { Button, Icon, Modal } from '../../../core/ui';
import OpdSlipModal from '../components/OpdSlipModal';
import ReportsModal from '../components/ReportsModal';
import SaveTemplateModal from '../components/SaveTemplateModal';
import {
  finalizeOpdSlip,
  getAppointmentById,
  getTemplates,
  updateAppointmentConsultation,
} from '../services/doctorStore';
import { AVAILABLE_MEDICINES, AVAILABLE_TESTS } from '../services/mock';

const STRENGTH_OPTIONS = ['500 mg', '650 mg', '10 mg', '20 mg', '40 mg', '250 mg', '400 mg', '0.5%', '10 ml', 'Topical'];
const DOSE_OPTIONS = ['1', '2', '5 ml', '10 ml', '1 packet'];
const TIMES_OPTIONS = ['1', '2', '3', '4'];
const INSTRUCTION_OPTIONS = ['After food', 'Before food', 'With water', 'At bedtime', 'External use'];

export default function PatientConsultation() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('Common Cold');

  // Consultation form fields
  const [examination, setExamination] = useState({
    temperature: '99.7',
    bp: '127/77',
    pulse: '105',
    spo2: '98',
    oe: 'NAD',
    remarks: 'Mild throat infection, no breathlessness.',
  });
  const [diagnosis, setDiagnosis] = useState('Viral fever');
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedTests, setSelectedTests] = useState(['CBC', 'ESR', 'Chest X-Ray', 'ECG']);
  const [notes, setNotes] = useState('Rest and take warm fluids. Review if symptoms persist.');

  // Medicine quick search / add
  const [medSearchInput, setMedSearchInput] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [testSearchInput, setTestSearchInput] = useState('');

  // Modals state
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showOpdModal, setShowOpdModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Success banner
  const [bannerMessage, setBannerMessage] = useState('');

  useEffect(() => {
    const apt = getAppointmentById(appointmentId);
    if (apt) {
      if (apt.status === 'Waiting') {
        updateAppointmentStatus(apt.id, 'In Progress');
        apt.status = 'In Progress';
      }
      setAppointment(apt);
      if (apt.examination) setExamination(apt.examination);
      if (apt.diagnosis) setDiagnosis(apt.diagnosis);
      if (apt.prescriptions) setPrescriptions(apt.prescriptions);
      if (apt.selectedTests) setSelectedTests(apt.selectedTests);
      if (apt.notes) setNotes(apt.notes);
    }
    const tpls = getTemplates();
    setTemplates(tpls);
    if (tpls.length > 0) {
      setSelectedTemplateName(tpls[0].name);
    }
  }, [appointmentId]);

  if (!appointment) {
    return (
      <div className="doc-page">
        <p>Loading patient consultation data...</p>
      </div>
    );
  }

  // Handle Examination updates
  const handleExamChange = (field, value) => {
    setExamination((prev) => ({ ...prev, [field]: value }));
  };

  // Medicine table management
  const handleAddMedicine = (selectedMed) => {
    let nameToAdd = '';
    let strengthToAdd = '500 mg';
    let instructionsToAdd = 'After food';

    if (selectedMed && typeof selectedMed === 'object' && selectedMed.name) {
      nameToAdd = selectedMed.name;
      strengthToAdd = selectedMed.defaultStrength || '500 mg';
      instructionsToAdd = selectedMed.defaultInstructions || 'After food';
    } else {
      const query = (medSearchInput || '').trim();
      if (!query) return; // Never auto-add when input is empty!

      const found =
        AVAILABLE_MEDICINES.find((m) => m.name.toLowerCase() === query.toLowerCase()) ||
        AVAILABLE_MEDICINES.find((m) => m.name.toLowerCase().includes(query.toLowerCase()));

      if (found) {
        nameToAdd = found.name;
        strengthToAdd = found.defaultStrength || '500 mg';
        instructionsToAdd = found.defaultInstructions || 'After food';
      } else {
        nameToAdd = query;
      }
    }

    if (!nameToAdd.trim()) return;

    const newMed = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: nameToAdd,
      strength: strengthToAdd,
      dose: '1',
      timesPerDay: '3',
      days: 5,
      instructions: instructionsToAdd,
    };

    setPrescriptions((prev) => [...prev, newMed]);
    setMedSearchInput('');
    setShowMedDropdown(false);
  };

  const handleAddBlankRow = () => {
    const newMed = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'Paracetamol',
      strength: '500 mg',
      dose: '1',
      timesPerDay: '3',
      days: 5,
      instructions: 'After food',
    };
    setPrescriptions((prev) => [...prev, newMed]);
  };

  const handleUpdateMedicine = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const handleRemoveMedicine = (index) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Prescription template load
  const handleLoadTemplate = () => {
    const tpl = templates.find((t) => t.name === selectedTemplateName);
    if (!tpl) return;

    if (tpl.medicines && tpl.medicines.length > 0) {
      setPrescriptions([...tpl.medicines]);
    }
    if (tpl.notes) {
      setNotes((prev) => (prev ? `${prev} ${tpl.notes}` : tpl.notes));
    }
    setBannerMessage(`Loaded template "${tpl.name}" into prescription.`);
    setTimeout(() => setBannerMessage(''), 2500);
  };

  // Save as Template callback
  const handleSaveAsTemplate = (newTemplate) => {
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    setBannerMessage(`Template "${newTemplate.name}" saved successfully.`);
    setTimeout(() => setBannerMessage(''), 3000);
  };

  // Tests management
  const handleAddTest = (testName) => {
    const clean = testName.trim();
    if (!clean || selectedTests.includes(clean)) return;
    setSelectedTests((prev) => [...prev, clean]);
    setTestSearchInput('');
  };

  const handleRemoveTest = (testName) => {
    setSelectedTests((prev) => prev.filter((t) => t !== testName));
  };

  // Clear consultation entries
  const handleConfirmClear = () => {
    setExamination({
      temperature: '',
      bp: '',
      pulse: '',
      spo2: '',
      oe: '',
      remarks: '',
    });
    setDiagnosis('');
    setPrescriptions([]);
    setSelectedTests([]);
    setNotes('');
    setShowClearConfirmModal(false);
    setBannerMessage('Consultation entries cleared.');
    setTimeout(() => setBannerMessage(''), 2000);
  };

  // Finalize OPD Slip
  const handleFinalizeOpd = async (opdPayload) => {
    // 1. Update appointment record
    updateAppointmentConsultation(appointment.id, {
      examination,
      diagnosis,
      prescriptions,
      selectedTests,
      notes,
    });

    // 2. Finalize and route OPD Slip
    finalizeOpdSlip(appointment.id, opdPayload, opdPayload.deliveryOption);

    setShowOpdModal(false);
    // 3. Return to Doctor Dashboard
    navigate('/doctor', {
      state: { notice: `OPD Slip finalized and routed to ${opdPayload.deliveryOption}.` },
    });
  };

  const trimmedMedQuery = medSearchInput.trim().toLowerCase();
  const matchedMedicines = trimmedMedQuery
    ? AVAILABLE_MEDICINES.filter((m) => m.name.toLowerCase().includes(trimmedMedQuery))
    : [];

  return (
    <div className="doc-page">
      {/* Top Header / Breadcrumb */}
      <div className="consult-top-bar">
        <button
          type="button"
          className="consult-back-btn"
          onClick={() => navigate('/doctor')}
        >
          <Icon name="arrowLeft" size={18} />
          <span>Back to Appointments</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="doc-status-badge is-in-progress"
            style={{ width: 'auto', padding: '5px 12px', fontSize: '12.5px' }}
          >
            ● {appointment.status || 'In Progress'}
          </span>
          <div className="consult-datetime-badge">
            Date: {appointment.date || '13 Oct 2026'} | Time: {appointment.time || '11:24 AM'}
          </div>
        </div>
      </div>

      <h1 className="doc-page-title" style={{ marginTop: 8, marginBottom: 16 }}>
        Patient Consultation
      </h1>

      {bannerMessage && (
        <div className="tpl-alert-success" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" size={16} />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Patient Information Header Card */}
      <div className="patient-header-card">
        <div className="patient-info-left">
          <div className="patient-avatar-circle">
            <Icon name="user" size={32} />
          </div>
          <div className="patient-meta-block">
            <h2 className="patient-name-title">{appointment.patientName}</h2>
            <div className="patient-sub-line">
              Age: {appointment.age} | {appointment.gender} | ID: {appointment.institutionId}
            </div>
            <div className="patient-sub-line">
              Course: {appointment.courseDepartment} | Hostel: {appointment.hostel}
            </div>
            <div className="patient-sub-line">
              Contact: {appointment.contact}
            </div>
          </div>
        </div>

        <div className="patient-info-right">
          <div className="patient-badges-col">
            <div className="patient-badge-row">
              <span className="patient-badge-title">Allergies</span>
              <span className="patient-chip chip-red">{appointment.allergies}</span>
            </div>
            <div className="patient-badge-row">
              <span className="patient-badge-title">Current Medicines</span>
              <span className="patient-chip chip-blue">{appointment.currentMedicines}</span>
            </div>
            <div className="patient-badge-row">
              <span className="patient-badge-title">Past Illness / History</span>
              <span className="patient-chip chip-green">{appointment.pastIllness}</span>
            </div>
          </div>

          {/* View Reports Button / Card */}
          <button
            type="button"
            className="view-reports-card-btn"
            onClick={() => setShowReportsModal(true)}
          >
            <div className="view-reports-inner">
              <Icon name="fileText" size={20} />
              <div className="view-reports-text">
                <strong>View Reports ({appointment.reports?.length ?? 0})</strong>
                <span>View all reports uploaded by patient</span>
              </div>
              <Icon name="chevronRight" size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* Grid: 1. Complaints & 2. Examination */}
      <div className="consult-grid-2col">
        {/* Section 1: Complaints / Symptoms (Read-Only) */}
        <div className="consult-section-box">
          <h3 className="consult-section-title">1. Complaints / Symptoms</h3>
          <div className="consult-table-wrap">
            <table className="consult-table">
              <thead>
                <tr>
                  <th style={{ width: '65%' }}>Complaint</th>
                  <th style={{ width: '35%' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(appointment.complaints) ? (
                  appointment.complaints.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{typeof c === 'object' && c ? c.complaint : c}</strong>
                      </td>
                      <td style={{ color: 'var(--c-muted)' }}>
                        {typeof c === 'object' && c ? c.duration : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>
                      <strong>{appointment.complaints || 'Routine consultation'}</strong>
                    </td>
                    <td style={{ color: 'var(--c-muted)' }}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Examination / Findings */}
        <div className="consult-section-box">
          <h3 className="consult-section-title">2. Examination / Findings</h3>
          <div className="exam-fields-grid">
            <div className="field">
              <label className="field__label">Temperature (°C)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 99.7"
                value={examination.temperature}
                onChange={(e) => handleExamChange('temperature', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label">BP (mmHg)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 127/77"
                value={examination.bp}
                onChange={(e) => handleExamChange('bp', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label">Pulse (bpm)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 105"
                value={examination.pulse}
                onChange={(e) => handleExamChange('pulse', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label">SpO₂ (%)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 98"
                value={examination.spo2}
                onChange={(e) => handleExamChange('spo2', e.target.value)}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label className="field__label">O/E</label>
            <input
              type="text"
              className="input"
              placeholder="NAD (No Abnormality Detected)"
              value={examination.oe}
              onChange={(e) => handleExamChange('oe', e.target.value)}
            />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label className="field__label">Remarks</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Mild throat infection, no breathlessness."
              value={examination.remarks}
              onChange={(e) => handleExamChange('remarks', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Diagnosis */}
      <div className="consult-section-box" style={{ marginTop: 16 }}>
        <h3 className="consult-section-title">3. Diagnosis</h3>
        <input
          type="text"
          className="input"
          placeholder="Enter diagnosis (e.g. Viral fever)"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
      </div>

      {/* Section 4: Prescription */}
      <div className="consult-section-box" style={{ marginTop: 16 }}>
        <h3 className="consult-section-title">4. Prescription</h3>

        <div className="tpl-med-search-bar">
          <div className="tpl-med-input-wrap">
            <Icon name="search" size={16} />
            <input
              type="text"
              className="input"
              placeholder="Search medicine (name / brand / salt)..."
              value={medSearchInput}
              onFocus={() => setShowMedDropdown(true)}
              onChange={(e) => {
                setMedSearchInput(e.target.value);
                setShowMedDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (matchedMedicines.length > 0) {
                    handleAddMedicine(matchedMedicines[0]);
                  } else {
                    handleAddMedicine();
                  }
                } else if (e.key === 'Escape') {
                  setShowMedDropdown(false);
                }
              }}
            />

            {showMedDropdown && medSearchInput.trim() && (
              <div className="med-autocomplete-dropdown">
                {matchedMedicines.map((m) => (
                  <div
                    key={m.name}
                    className="med-autocomplete-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddMedicine(m);
                    }}
                  >
                    <div>
                      <span className="med-autocomplete-name">{m.name}</span>
                      <span className="med-autocomplete-meta" style={{ marginLeft: 8 }}>
                        {m.defaultInstructions}
                      </span>
                    </div>
                    <span className="med-autocomplete-badge">{m.defaultStrength}</span>
                  </div>
                ))}
                {!matchedMedicines.some((m) => m.name.toLowerCase() === medSearchInput.trim().toLowerCase()) && (
                  <div
                    className="med-autocomplete-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddMedicine();
                    }}
                  >
                    <span className="med-autocomplete-name" style={{ color: '#2563eb' }}>
                      + Add &quot;{medSearchInput.trim()}&quot; as custom medicine
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            variant="primary"
            type="button"
            disabled={!medSearchInput.trim()}
            onClick={() => {
              if (matchedMedicines.length > 0) {
                handleAddMedicine(matchedMedicines[0]);
              } else {
                handleAddMedicine();
              }
            }}
            title={!medSearchInput.trim() ? 'Type medicine name to add' : 'Add medicine'}
          >
            <Icon name="plus" size={16} /> Add Medicine
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={handleAddBlankRow}
            title="Add an empty row to customize"
          >
            + Blank Row
          </Button>
        </div>

        <div className="tpl-table-wrap">
          <table className="tpl-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>S.No.</th>
                <th style={{ width: '24%' }}>Medicine Name</th>
                <th style={{ width: '15%' }}>Strength</th>
                <th style={{ width: '11%' }}>Dose</th>
                <th style={{ width: '11%' }}>Times / Day</th>
                <th style={{ width: '10%' }}>Days</th>
                <th style={{ width: '17%' }}>Instructions</th>
                <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="doc-empty-table-cell">
                    No medicines prescribed yet. Search a medicine above to add, or load from a template.
                  </td>
                </tr>
              ) : (
                prescriptions.map((med, idx) => (
                <tr key={med.id || idx}>
                  <td className="doc-sno">{idx + 1}</td>
                  <td>
                    <select
                      className="input tpl-select"
                      value={med.name}
                      onChange={(e) => handleUpdateMedicine(idx, 'name', e.target.value)}
                    >
                      <option value={med.name}>{med.name}</option>
                      {AVAILABLE_MEDICINES.filter((m) => m.name !== med.name).map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input tpl-select"
                      value={med.strength}
                      onChange={(e) => handleUpdateMedicine(idx, 'strength', e.target.value)}
                    >
                      {STRENGTH_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input tpl-select"
                      value={med.dose}
                      onChange={(e) => handleUpdateMedicine(idx, 'dose', e.target.value)}
                    >
                      {DOSE_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input tpl-select"
                      value={med.timesPerDay}
                      onChange={(e) => handleUpdateMedicine(idx, 'timesPerDay', e.target.value)}
                    >
                      {TIMES_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="input"
                      value={med.days}
                      onChange={(e) => handleUpdateMedicine(idx, 'days', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="input tpl-select"
                      value={med.instructions}
                      onChange={(e) => handleUpdateMedicine(idx, 'instructions', e.target.value)}
                    >
                      {INSTRUCTION_OPTIONS.map((ins) => (
                        <option key={ins} value={ins}>
                          {ins}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="tpl-row-del-btn"
                      onClick={() => handleRemoveMedicine(idx)}
                      aria-label={`Remove ${med.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: 5. Prescription Templates & 6. Tests / Referral */}
      <div className="consult-grid-2col" style={{ marginTop: 16 }}>
        {/* Section 5: Prescription Templates */}
        <div className="consult-section-box">
          <h3 className="consult-section-title">5. Prescription Templates</h3>
          <div className="field">
            <select
              className="input"
              value={selectedTemplateName}
              onChange={(e) => setSelectedTemplateName(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id || t.name} value={t.name}>
                  {t.name} ({t.condition})
                </option>
              ))}
            </select>
          </div>
          <div className="consult-tpl-actions" style={{ marginTop: 12 }}>
            <Button variant="outline" size="sm" type="button" onClick={handleLoadTemplate}>
              Load
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
            >
              Save as Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate('/doctor/templates')}
            >
              Manage Templates
            </Button>
          </div>
        </div>

        {/* Section 6: Tests / Referral */}
        <div className="consult-section-box">
          <h3 className="consult-section-title">6. Tests / Referral</h3>
          <div className="tpl-med-input-wrap">
            <Icon name="search" size={16} />
            <input
              type="text"
              className="input"
              placeholder="Search and add tests (e.g., CBC, X-Ray, LFT, ECG, Thyroid Profile...)"
              value={testSearchInput}
              onChange={(e) => setTestSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTest(testSearchInput);
                }
              }}
            />
          </div>

          {/* Quick-add suggestions if typing */}
          {testSearchInput && (
            <div className="test-suggestions-row">
              {AVAILABLE_TESTS.filter((t) =>
                t.toLowerCase().includes(testSearchInput.toLowerCase())
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="test-suggest-chip"
                  onClick={() => handleAddTest(t)}
                >
                  + {t}
                </button>
              ))}
            </div>
          )}

          {/* Selected Tests Tags */}
          <div className="selected-tests-container">
            <span style={{ fontSize: 13, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>
              Selected Tests / Referrals:
            </span>
            <div className="selected-tests-list">
              {selectedTests.map((test) => (
                <span key={test} className="test-pill-tag">
                  <span>{test}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTest(test)}
                    aria-label={`Remove test ${test}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Notes */}
      <div className="consult-section-box" style={{ marginTop: 16 }}>
        <h3 className="consult-section-title">7. Notes</h3>
        <textarea
          className="input"
          rows={3}
          placeholder="Rest and take warm fluids. Review if symptoms persist."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="consult-bottom-actions">
        <Button
          variant="outline"
          type="button"
          onClick={() => setShowClearConfirmModal(true)}
        >
          Clear
        </Button>

        <Button
          variant="primary"
          type="button"
          onClick={() => setShowOpdModal(true)}
          style={{ padding: '10px 24px', fontSize: 15 }}
        >
          Generate OPD Slip
        </Button>
      </div>

      {/* Modals */}
      {showReportsModal && (
        <ReportsModal
          patientName={appointment.patientName}
          reports={appointment.reports || []}
          onClose={() => setShowReportsModal(false)}
        />
      )}

      {showSaveTemplateModal && (
        <SaveTemplateModal
          currentMedicines={prescriptions}
          defaultCondition={diagnosis}
          onSave={handleSaveAsTemplate}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}

      {showClearConfirmModal && (
        <Modal
          title="Clear Consultation Details?"
          onClose={() => setShowClearConfirmModal(false)}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <p>
              Are you sure you want to clear the unsaved consultation entries? This will
              reset your entered findings, diagnosis, and prescription without altering
              the patient's original complaints or medical records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="outline" onClick={() => setShowClearConfirmModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmClear}
                style={{ background: 'var(--c-danger)', borderColor: 'var(--c-danger)' }}
              >
                Clear Entries
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showOpdModal && (
        <OpdSlipModal
          appointment={appointment}
          consultationData={{
            diagnosis,
            examination,
            prescriptions,
            selectedTests,
            notes,
          }}
          doctorName={user?.name || 'Dr. Doom'}
          onClose={() => setShowOpdModal(false)}
          onFinalize={handleFinalizeOpd}
        />
      )}
    </div>
  );
}
