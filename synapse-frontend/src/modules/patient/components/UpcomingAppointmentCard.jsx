import { Avatar, Button } from '../../../core/ui';
import { formatLongDate } from '../../../core/utils/date';

export default function UpcomingAppointmentCard({ appointment, onViewDetails }) {
  if (!appointment) {
    return (
      <div className="card">
        <p className="page-subtitle" style={{ margin: 0 }}>
          You have no upcoming appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="card appt-card">
      <Avatar name={appointment.doctorName} size={64} />
      <div className="appt-card__info">
        <p className="appt-card__doctor">{appointment.doctorName}</p>
        <p className="appt-card__meta">{appointment.speciality}</p>
        <p className="appt-card__meta">
          {formatLongDate(appointment.date)} at {appointment.time}
        </p>
      </div>
      <Button variant="outline" onClick={onViewDetails}>
        View Details
      </Button>
    </div>
  );
}
