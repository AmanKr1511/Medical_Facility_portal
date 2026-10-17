import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, LogoMark } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';
import { submitAppointment } from '../services/appointmentService';
import { DEPARTMENTS } from '../services/mock';

export default function AppointmentForm() {
  const location = useLocation();
  const navigate = useNavigate();

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
      </main>
    </div>
  );
}
