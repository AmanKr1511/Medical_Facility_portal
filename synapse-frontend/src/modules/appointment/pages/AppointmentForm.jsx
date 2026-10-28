import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, LogoMark } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';
import { submitAppointment, getConsultationQrSession, checkUploadSessionStatus } from '../services/appointmentService';
import { DEPARTMENTS } from '../services/mock';
import '../appointment.css';

export default function AppointmentForm() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Selected schedule passed from the front page (or fallbacks)
  const doctorInfo = location.state || {
    doctorId: 'doc-meera',
    doctorName: 'Dr. Meera Iyer',
    date: new Date().toISOString().split('T')[0],
    time: '10:15 AM',
  };

  // Source of the appointment request: 'consult_now' | 'consult_later' | undefined
  const consultationSource = location.state?.consultation_source;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'Male',
    entryNumber: '',
    department: '',
    fatherOrHusbandName: '',
    complaints: '',
    pastIllness: '',
    allergies: '',
    // Optional contact fields
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Medical report uploads state (direct file picker + mobile QR upload)
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSessionData, setQrSessionData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrNotice, setQrNotice] = useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const category = isPdf ? 'Lab Report' : 'Radiology / X-Ray';
      const sizeStr =
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        category,
        sizeFormatted: sizeStr,
        previewUrl: URL.createObjectURL(file),
      };
    });

    setAttachedFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRemoveFile = (id) => {
    setAttachedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCategoryChange = (id, newCat) => {
    setAttachedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCat } : item))
    );
  };

  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    setQrNotice('');
    if (!qrSessionData) {
      setQrLoading(true);
      try {
        const session = await getConsultationQrSession();
        setQrSessionData(session);
      } catch (err) {
        setQrNotice('Failed to generate QR code. You can browse and select files directly from your device.');
      } finally {
        setQrLoading(false);
      }
    }
  };

  // Poll for QR uploads from smartphone while QR session is open
  useEffect(() => {
    if (!qrSessionData?.token) return;
    let timer = null;
    let isCancelled = false;

    const poll = async () => {
      try {
        const res = await checkUploadSessionStatus(qrSessionData.token);
        if (res && res.is_used && Array.isArray(res.reports) && res.reports.length > 0) {
          setQrNotice('Report received from your phone!');
          setAttachedFiles((prev) => {
            const existingNames = new Set(prev.map((p) => p.name));
            const fresh = res.reports
              .filter((r) => !existingNames.has(r.name))
              .map((r) => ({
                id: `qr-${r.id || Date.now()}`,
                name: r.name,
                category: r.type || 'Lab Report',
                sizeFormatted: 'Uploaded from mobile',
                file_url: r.file_url,
                isFromQr: true,
              }));
            return [...prev, ...fresh];
          });
          return;
        }
      } catch {
        /* ignore polling errors */
      }
      if (!isCancelled) {
        timer = setTimeout(poll, 2500);
      }
    };

    poll();
    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [qrSessionData?.token]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Patient full name is required.';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.age || Number(formData.age) <= 0 || Number(formData.age) > 120) {
      errs.age = 'Please enter a valid age between 1 and 120.';
    }
    if (!formData.complaints.trim()) {
      errs.complaints = 'Please describe the complaints or symptoms.';
    }
    // Entry number and department are not compulsory
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        age: Number(formData.age),
        gender: formData.gender,
        entryNumber: formData.entryNumber,
        department: formData.department,
        fatherOrHusbandName: formData.fatherOrHusbandName,
        complaints: formData.complaints,
        pastIllness: formData.pastIllness,
        allergies: formData.allergies,
        phone: formData.phone,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        doctorId: doctorInfo.doctorId,
        doctorName: doctorInfo.doctorName,
        appointmentDate: doctorInfo.date,
        appointmentTime: doctorInfo.time,
        consultationSource: consultationSource || 'consult_later',
        attachedFiles,
        sessionToken: qrSessionData?.token,
      };

      const result = await submitAppointment(payload);
      setSubmittedData(result);
    } catch {
      alert('Failed to submit appointment. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="appt-public-page">
      {/* Top Navbar */}
      <header className="appt-topbar">
        <div className="appt-topbar__inner">
          <Link to="/login" className="appt-brand">
            <LogoMark size={28} />
            <div>
              <span className="appt-brand__title">SYNapse</span>
              <span className="appt-brand__sub">Institute Health Centre</span>
            </div>
          </Link>
          <div className="appt-topbar__actions">
            <Link to="/appointment" className="appt-back-btn">
              <Icon name="arrowLeft" size={16} />
              <span>Back to Schedule</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="appt-container">
        {/* Stepper Header */}
        <div className="appt-stepper">
          <div className="appt-step is-complete">
            <span className="appt-step__number">✓</span>
            <span className="appt-step__label">Schedule Selected</span>
          </div>
          <div className="appt-step__line is-complete" />
          <div className={`appt-step ${submittedData ? 'is-complete' : 'is-active'}`}>
            <span className="appt-step__number">2</span>
            <span className="appt-step__label">Patient Information</span>
          </div>
          <div className={`appt-step__line ${submittedData ? 'is-complete' : ''}`} />
          <div className={`appt-step ${submittedData ? 'is-active' : ''}`}>
            <span className="appt-step__number">3</span>
            <span className="appt-step__label">Confirmation</span>
          </div>
        </div>

        {submittedData ? (
          /* Success Screen */
          <div className="card appt-success-card">
            <div className="appt-success-icon-wrap">
              <svg
                width="72"
                height="72"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="#ecfdf5" />
                <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="#059669" strokeWidth="2.5" />
              </svg>
            </div>

            <h1 className="appt-success-title">Appointment Booked Successfully!</h1>
            <p className="appt-success-subtitle">
              Your appointment request has been recorded.
            </p>

            <div className="appt-ref-badge">
              <span>OPD Number: </span>
              <strong>{submittedData.opdNumber || submittedData.appointmentId}</strong>
            </div>

            <div className="appt-summary-grid">
              <div className="appt-summary-card">
                <h3 className="appt-summary-head">Clinical Appointment</h3>
                <dl className="appt-summary-dl">
                  <div>
                    <dt>Doctor:</dt>
                    <dd>{submittedData.data.doctorName}</dd>
                  </div>
                  <div>
                    <dt>Date:</dt>
                    <dd>{formatDate(submittedData.data.appointmentDate)}</dd>
                  </div>
                  <div>
                    <dt>Time:</dt>
                    <dd>{submittedData.data.appointmentTime}</dd>
                  </div>
                  <div>
                    <dt>Status:</dt>
                    <dd><span className="badge badge--success">Confirmed</span></dd>
                  </div>
                </dl>
              </div>

              <div className="appt-summary-card">
                <h3 className="appt-summary-head">Patient Particulars</h3>
                <dl className="appt-summary-dl">
                  <div>
                    <dt>Patient Name:</dt>
                    <dd>{submittedData.data.name}</dd>
                  </div>
                  <div>
                    <dt>Email Address:</dt>
                    <dd>{submittedData.data.email}</dd>
                  </div>
                  <div>
                    <dt>Age / Gender:</dt>
                    <dd>{submittedData.data.age} yrs / {submittedData.data.gender}</dd>
                  </div>
                  <div>
                    <dt>Entry Number:</dt>
                    <dd>{submittedData.data.entryNumber || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Department:</dt>
                    <dd>{submittedData.data.department || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Father/Husband:</dt>
                    <dd>{submittedData.data.fatherOrHusbandName}</dd>
                  </div>
                  <div>
                    <dt>Complaints:</dt>
                    <dd>{submittedData.data.complaints}</dd>
                  </div>
                  <div>
                    <dt>Allergies:</dt>
                    <dd>{submittedData.data.allergies}</dd>
                  </div>
                  <div>
                    <dt>Mobile Phone:</dt>
                    <dd>{submittedData.data.phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Emergency Contact:</dt>
                    <dd>{submittedData.data.emergencyContactName || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Emergency Phone:</dt>
                    <dd>{submittedData.data.emergencyContactPhone || 'Not provided'}</dd>
                  </div>
                  {submittedData.reports && submittedData.reports.length > 0 && (
                    <div className="appt-fields-grid--full" style={{ marginTop: 12 }}>
                      <dt>Attached Medical Reports ({submittedData.reports.length}):</dt>
                      <dd>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {submittedData.reports.map((r) => (
                            <span key={r.id} className="appt-confirm-report-tag">
                              <Icon name="fileText" size={14} />
                              <span>{r.name} ({r.type})</span>
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* JSON Payload Inspection for Backend Integration */}
            <div className="appt-json-box">
              <button
                type="button"
                className="appt-json-toggle"
                onClick={() => setShowJsonPreview(!showJsonPreview)}
              >
                <Icon name="fileText" size={16} />
                <span>{showJsonPreview ? 'Hide API JSON Payload' : 'View API JSON Payload (Backend Ready)'}</span>
              </button>
              {showJsonPreview && (
                <pre className="appt-json-pre">
                  {JSON.stringify(submittedData.data, null, 2)}
                </pre>
              )}
            </div>

            <div className="appt-success-actions">
              <Button variant="outline" onClick={() => navigate('/appointment')}>
                Book Another Appointment
              </Button>
              <Button onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          </div>
        ) : (
          /* Appointment Form */
          <div className="appt-form-layout">
            {/* Selected Slot Sticky Bar */}
            <div className="card appt-slot-banner">
              <div className="appt-slot-banner__info">
                <span className="appt-slot-banner__tag">Selected Slot</span>
                <span className="appt-slot-banner__doc">
                  <strong>{doctorInfo.doctorName}</strong>
                </span>
                <span className="appt-slot-banner__meta">
                  {formatDate(doctorInfo.date)} at {doctorInfo.time}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/appointment')}
              >
                Change Doctor / Time
              </Button>
            </div>

            {/* Main Form */}
            <form className="card appt-form-card" onSubmit={handleSubmit} noValidate>
              <div className="appt-form-card__head">
                <h2 className="appt-form-title">Patient Information Form</h2>
                <p className="appt-form-subtitle">
                  Please provide accurate patient particulars and clinical complaints for your medical record.
                </p>
              </div>

              {/* Section 1: Personal Details */}
              <div className="appt-form-section">
                <h3 className="appt-section-heading">
                  <span className="appt-section-num">1</span>
                  <span>Personal Particulars</span>
                </h3>

                <div className="appt-fields-grid">
                  {/* Name */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-name">
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      id="pat-name"
                      type="text"
                      className={`input${errors.name ? ' is-invalid' : ''}`}
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      onChange={handleChange('name')}
                      required
                    />
                    {errors.name && <span className="field-err">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-email">
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      id="pat-email"
                      type="email"
                      className={`input${errors.email ? ' is-invalid' : ''}`}
                      placeholder="e.g. aarav.sharma@example.com"
                      value={formData.email}
                      onChange={handleChange('email')}
                      required
                    />
                    {errors.email && <span className="field-err">{errors.email}</span>}
                  </div>

                  {/* Age */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-age">
                      Age (Years) <span className="req">*</span>
                    </label>
                    <input
                      id="pat-age"
                      type="number"
                      min="1"
                      max="120"
                      className={`input${errors.age ? ' is-invalid' : ''}`}
                      placeholder="e.g. 21"
                      value={formData.age}
                      onChange={handleChange('age')}
                      required
                    />
                    {errors.age && <span className="field-err">{errors.age}</span>}
                  </div>
                  
                  {/* Phone */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-phone">
                      Mobile Phone
                    </label>
                    <input
                      id="pat-phone"
                      type="tel"
                      className="input"
                      placeholder="+91 98765 43210 (Optional)"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                    />
                  </div>

                  {/* Gender */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-gender">
                      Gender
                    </label>
                    <select
                      id="pat-gender"
                      className={`input${errors.gender ? ' is-invalid' : ''}`}
                      value={formData.gender}
                      onChange={handleChange('gender')}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && <span className="field-err">{errors.gender}</span>}
                  </div>

                  {/* Father/Husband's name */}
                  <div className="field appt-fields-grid--full">
                    <label className="field__label" htmlFor="pat-guardian">
                      Father's / Husband's Name
                    </label>
                    <input
                      id="pat-guardian"
                      type="text"
                      className={`input${errors.fatherOrHusbandName ? ' is-invalid' : ''}`}
                      placeholder="e.g. Rajesh Sharma"
                      value={formData.fatherOrHusbandName}
                      onChange={handleChange('fatherOrHusbandName')}
                    />
                    {errors.fatherOrHusbandName && (
                      <span className="field-err">{errors.fatherOrHusbandName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Institutional Affiliation (Not Compulsory) */}
              <div className="appt-form-section">
                <h3 className="appt-section-heading">
                  <span className="appt-section-num">2</span>
                  <span>Institutional Affiliation (Optional)</span>
                </h3>

                <div className="appt-fields-grid">
                  {/* Entry Number - Not compulsory */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-entry">
                      Entry Number / Roll Number / ID
                    </label>
                    <input
                      id="pat-entry"
                      type="text"
                      className="input"
                      placeholder="e.g. 2023CSB101 or EMP-502 (Optional)"
                      value={formData.entryNumber}
                      onChange={handleChange('entryNumber')}
                    />
                  </div>

                  {/* Department - Not compulsory */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-dept">
                      Department / Office
                    </label>
                    <select
                      id="pat-dept"
                      className="input"
                      value={formData.department}
                      onChange={handleChange('department')}
                    >
                      <option value="">-- Select Department (Optional) --</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Clinical & Medical History */}
              <div className="appt-form-section">
                <h3 className="appt-section-heading">
                  <span className="appt-section-num">3</span>
                  <span>Clinical Complaints & Medical History</span>
                </h3>

                <div className="appt-fields-stack">
                  {/* Complaints / Symptoms */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-complaints">
                      Complaints / Current Symptoms <span className="req">*</span>
                    </label>
                    <textarea
                      id="pat-complaints"
                      rows={3}
                      className={`input appt-textarea${errors.complaints ? ' is-invalid' : ''}`}
                      placeholder="Please specify fever, headache, stomach ache, cough, injuries, or duration of symptoms..."
                      value={formData.complaints}
                      onChange={handleChange('complaints')}
                      required
                    />
                    {errors.complaints && (
                      <span className="field-err">{errors.complaints}</span>
                    )}
                  </div>

                  {/* Past illness / history */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-illness">
                      Past Illness / Medical History
                    </label>
                    <textarea
                      id="pat-illness"
                      rows={2}
                      className="input appt-textarea"
                      placeholder="Any pre-existing conditions (e.g. diabetes, hypertension, asthma, prior surgeries, or write 'None')..."
                      value={formData.pastIllness}
                      onChange={handleChange('pastIllness')}
                    />
                  </div>

                  {/* Allergies */}
                  <div className="field">
                    <label className="field__label" htmlFor="pat-allergies">
                      Known Allergies (Drugs, Food, Environmental)
                    </label>
                    <input
                      id="pat-allergies"
                      type="text"
                      className="input"
                      placeholder="e.g. Penicillin, paracetamol, dust, or 'None'"
                      value={formData.allergies}
                      onChange={handleChange('allergies')}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Medical Reports & Documents Upload */}
              <div className="appt-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <h3 className="appt-section-heading" style={{ margin: 0 }}>
                    <span className="appt-section-num">4</span>
                    <span>Medical Reports & Previous Prescriptions (Optional)</span>
                  </h3>
                  <button
                    type="button"
                    className="appt-qr-trigger-btn"
                    onClick={handleOpenQrModal}
                  >
                    <Icon name="camera" size={16} />
                    <span>Upload from Phone (Scan QR)</span>
                  </button>
                </div>
                <p className="appt-section-sub">
                  Upload previous prescriptions, blood tests (CBC, Lipid, etc.), or scans (X-Ray, MRI). The doctor will review these directly in their consultation dashboard.
                </p>

                {/* File Dropzone */}
                <div className="appt-upload-dropzone">
                  <input
                    id="pat-reports-input"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp,.jpg"
                    multiple
                    className="appt-file-hidden-input"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="pat-reports-input" className="appt-dropzone-label">
                    <div className="appt-dropzone-icon">
                      <Icon name="upload" size={28} />
                    </div>
                    <div>
                      <div className="appt-dropzone-title">
                        <strong>Click to browse files</strong> or drag and drop
                      </div>
                      <div className="appt-dropzone-hint">
                        PDF, PNG, JPG up to 15 MB each • Lab reports, prescriptions, X-rays
                      </div>
                    </div>
                  </label>
                </div>

                {/* Attached files list */}
                {attachedFiles.length > 0 && (
                  <div className="appt-attached-list">
                    <div className="appt-attached-header">
                      <span>Attached Medical Documents ({attachedFiles.length})</span>
                    </div>
                    <div className="appt-attached-items">
                      {attachedFiles.map((item) => (
                        <div key={item.id} className="appt-attached-chip">
                          <div className="appt-attached-chip-left">
                            <Icon name="fileText" size={20} className="appt-attached-icon" />
                            <div>
                              <span className="appt-attached-name" title={item.name}>{item.name}</span>
                              <span className="appt-attached-size">{item.sizeFormatted}</span>
                            </div>
                          </div>

                          <div className="appt-attached-chip-right">
                            <select
                              className="appt-attached-cat-select"
                              value={item.category}
                              onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                            >
                              <option value="Lab Report">Lab Report</option>
                              <option value="Prescription">Prescription</option>
                              <option value="Radiology / X-Ray">Radiology / X-Ray</option>
                              <option value="Discharge Summary">Discharge Summary</option>
                              <option value="Other">Other</option>
                            </select>

                            <button
                              type="button"
                              className="appt-attached-del-btn"
                              onClick={() => handleRemoveFile(item.id)}
                              title="Remove file"
                              aria-label="Remove file"
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* Form Footer Actions */}
              <div className="appt-form-footer">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/appointment')}
                >
                  <Icon name="arrowLeft" size={16} />
                  <span>Back to Doctor Selection</span>
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="appt-submit-btn"
                >
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      <span>Sending to Medical API...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="checkCircle" size={18} />
                      <span>Submit Appointment</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
        {/* Mobile QR Upload Modal */}
        {showQrModal && (
          <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="appt-qr-modal-card">
              <div className="appt-qr-modal-header">
                <div>
                  <h3 className="appt-qr-modal-title">Upload Reports from Smartphone</h3>
                  <p className="appt-qr-modal-sub">
                    Scan with your mobile camera to take a photo of your paper report or upload a PDF
                  </p>
                </div>
                <button
                  type="button"
                  className="appt-qr-close-btn"
                  onClick={() => setShowQrModal(false)}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <div className="appt-qr-modal-body">
                {qrLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <span className="spinner" />
                    <p>Generating secure upload QR code...</p>
                  </div>
                ) : qrSessionData ? (
                  <div className="appt-qr-content">
                    <div className="appt-qr-img-wrapper">
                      <img
                        src={qrSessionData.qr_code_data_url}
                        alt="QR Code for mobile upload"
                        className="appt-qr-img"
                      />
                    </div>
                    <div className="appt-qr-instructions">
                      <ol>
                        <li>Open the <strong>Camera</strong> app on your smartphone</li>
                        <li>Scan the QR code to open the secure upload page</li>
                        <li>Snap a clear picture of your report or choose a PDF</li>
                        <li>Tap <strong>Upload</strong> — it attaches here automatically!</li>
                      </ol>
                      <div className="appt-qr-live-pill">
                        <span className="appt-qr-dot" />
                        <span>Waiting for mobile report upload...</span>
                      </div>
                      {qrNotice && (
                        <div className="appt-qr-success-notice">
                          <Icon name="checkCircle" size={16} />
                          <span>{qrNotice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{qrNotice}</p>
                )}
              </div>

              <div className="appt-qr-modal-footer">
                <Button onClick={() => setShowQrModal(false)}>
                  Done / Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
