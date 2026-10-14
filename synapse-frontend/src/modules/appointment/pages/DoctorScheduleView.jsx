import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button, Icon, LogoMark } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';
import { getDoctors } from '../services/appointmentService';

export default function DoctorScheduleView() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  useEffect(() => {
    getDoctors().then((data) => {
      setDoctors(data);
      if (data.length > 0) {
        setSelectedDoctorId(data[0].id);
        setSelectedDate(data[0].availableDates[0] || '');
        setSelectedSlot(data[0].slots[0] || '');
      }
      setLoading(false);
    });
  }, []);

  const activeDoctor =
    doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const handleDoctorSelect = (doc) => {
    setSelectedDoctorId(doc.id);
    setSelectedDate(doc.availableDates[0] || '');
    setSelectedSlot(doc.slots[0] || '');
  };

  const handleProceedToForm = () => {
    navigate('/appointment/form', {
      state: {
        doctorId: activeDoctor?.id,
        doctorName: activeDoctor?.name,
        date: selectedDate,
        time: selectedSlot,
      },
    });
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
            <Link to="/login" className="appt-back-btn">
              <Icon name="arrowLeft" size={16} />
              <span>Sign In / Staff Portal</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="appt-container">
        {/* Page Title & Breadcrumbs */}
        <div className="appt-hero">
          <div className="appt-badge">Public Medical Services</div>
          <h1 className="appt-title">Book a Doctor's Appointment</h1>
          <p className="appt-subtitle">
            View clinical schedules, select an available date and time slot, and proceed to the patient form.
          </p>
        </div>

        {/* Stepper Header */}
        <div className="appt-stepper">
          <div className="appt-step is-active">
            <span className="appt-step__number">1</span>
            <span className="appt-step__label">Select Schedule</span>
          </div>
          <div className="appt-step__line" />
          <div className="appt-step">
            <span className="appt-step__number">2</span>
            <span className="appt-step__label">Fill Patient Form</span>
          </div>
          <div className="appt-step__line" />
          <div className="appt-step">
            <span className="appt-step__number">3</span>
            <span className="appt-step__label">Confirmation</span>
          </div>
        </div>

        {loading ? (
          <div className="appt-loading">
            <span className="spinner" />
            <span>Loading doctors schedule...</span>
          </div>
        ) : (
          <div className="appt-schedule-grid">
            {/* Left Column: Doctor Selection Cards */}
            <div className="appt-doctors-panel">
              <h2 className="appt-section-title">
                <Icon name="stethoscope" size={20} />
                <span>Available Doctors</span>
              </h2>

              <div className="appt-doctors-list">
                {doctors.map((doc) => {
                  const isSelected = doc.id === activeDoctor?.id;
                  return (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      className={`appt-doc-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleDoctorSelect(doc)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDoctorSelect(doc)}
                    >
                      <Avatar name={doc.avatarText} size={50} />
                      <div className="appt-doc-card__info">
                        <div className="appt-doc-card__head">
                          <h3 className="appt-doc-card__name">{doc.name}</h3>
                          {isSelected && (
                            <span className="appt-doc-card__check">
                              <Icon name="checkCircle" size={16} />
                            </span>
                          )}
                        </div>
                        <p className="appt-doc-card__meta">{doc.qualification}</p>
                        <div className="appt-doc-card__footer">
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Date & Slot Selection & Preview Banner */}
            <div className="appt-booking-panel card">
              {activeDoctor && (
                <>
                  <div className="appt-selected-doc-header">
                    <Avatar name={activeDoctor.avatarText} size={64} />
                    <div>
                      <h3 className="appt-selected-doc__name">{activeDoctor.name}</h3>
                      <span className="appt-selected-doc__loc">{activeDoctor.cabin}</span>
                    </div>
                  </div>

                  {/* Choose Date */}
                  <div className="appt-slot-section">
                    <label className="field__label">
                      <Icon name="calendar" size={16} />
                      <span>1. Select Appointment Date</span>
                    </label>
                    <div className="appt-dates-row">
                      {activeDoctor.availableDates.map((dateStr) => {
                        const isDateActive = dateStr === selectedDate;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            className={`appt-date-chip${isDateActive ? ' is-active' : ''}`}
                            onClick={() => setSelectedDate(dateStr)}
                          >
                            <span className="appt-date-chip__text">
                              {formatDate(dateStr)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Choose Time Slot */}
                  <div className="appt-slot-section">
                    <label className="field__label">
                      <Icon name="hourglass" size={16} />
                      <span>2. Select Time Slot</span>
                    </label>
                    <div className="appt-slots-grid">
                      {activeDoctor.slots.map((slot) => {
                        const isSlotActive = slot === selectedSlot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`appt-slot-btn${isSlotActive ? ' is-active' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule Image / Visual Card Preview */}
                  <div className="appt-preview-banner">
                    <div className="appt-preview-badge">Appointment Preview</div>
                    <div className="appt-preview-details">
                      <div className="appt-preview-item">
                        <span className="appt-preview-item__label">Doctor</span>
                        <span className="appt-preview-item__val">{activeDoctor.name}</span>
                      </div>
                      <div className="appt-preview-item">
                        <span className="appt-preview-item__label">Consultation Date</span>
                        <span className="appt-preview-item__val">
                          {selectedDate ? formatDate(selectedDate) : 'Not selected'}
                        </span>
                      </div>
                      <div className="appt-preview-item">
                        <span className="appt-preview-item__label">Selected Time</span>
                        <span className="appt-preview-item__val">
                          {selectedSlot || 'Not selected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Button to click for form */}
                  <div className="appt-action-box">
                    <Button
                      size="lg"
                      className="appt-proceed-btn"
                      onClick={handleProceedToForm}
                      disabled={!selectedDate || !selectedSlot}
                    >
                      <span>Proceed to Appointment Form</span>
                      <Icon name="arrowLeft" size={18} style={{ transform: 'rotate(180deg)' }} />
                    </Button>
                    <p className="appt-action-hint">
                      Click the button above to enter patient details and complete the booking.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
