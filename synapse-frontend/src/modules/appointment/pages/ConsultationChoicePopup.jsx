import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../../core/ui';

/**
 * Full-screen consultation choice popup.
 * Triggered from the login page's "Consult" button.
 * Offers two paths:
   - Consult Now: goes directly to the appointment form (source: 'consult_now')
   - Consult Later: goes to the doctor schedule / booking page (source: 'consult_later')
 * Both eventually reach the same AppointmentForm; the source is carried in
 * route state and appended to the submission payload.
 */
export default function ConsultationChoicePopup({ onClose }) {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const handleConsultNow = () => {
    onClose();
    navigate('/appointment/form', {
      state: {
        doctorId: 'doc-meera',
        doctorName: 'Dr. Meera Iyer',
        date: today,
        time: '10:15 AM',
        consultation_source: 'consult_now',
      },
    });
  };

  const handleConsultLater = () => {
    onClose();
    navigate('/appointment', {
      state: { consultation_source: 'consult_later' },
    });
  };

  return (
    <div className="consultation-popup-overlay" role="dialog" aria-modal="true" aria-label="Consultation options">
      <button
        type="button"
        className="consultation-popup__close"
        onClick={onClose}
        aria-label="Close consultation options"
      >
        <Icon name="close" size={22} />
      </button>
      <div className="consultation-popup">
        <div className="consultation-popup__icon">
          <Icon name="calendarPlus" size={48} />
        </div>
        <h1 className="consultation-popup__title">Consultation</h1>
        <p className="consultation-popup__subtitle">
          Choose how you would like to proceed with your medical consultation.
        </p>
        <div className="consultation-popup__options">
          <Button
            size="lg"
            className="consultation-popup__btn consultation-popup__btn--now"
            onClick={handleConsultNow}
          >
            <Icon name="stethoscope" size={24} className="consultation-popup__btn-icon" />
            <span>Consult Now</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="consultation-popup__btn consultation-popup__btn--later"
            onClick={handleConsultLater}
          >
            <Icon name="calendar" size={24} className="consultation-popup__btn-icon" />
            <span>Consult Later</span>
          </Button>
        </div>
        <p className="consultation-popup__note">
          Both options lead to the same appointment form.{' '}
          <strong>Consult Now</strong> skips doctor selection and opens the form directly.
        </p>
      </div>
    </div>
  );
}