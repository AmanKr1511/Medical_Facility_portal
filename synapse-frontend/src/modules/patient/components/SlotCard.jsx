import { Avatar } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';

export default function SlotCard({ slot }) {
  return (
    <div className="card slot-card">
      <Avatar name={slot.doctorName} size={64} />
      <dl className="slot-card__details">
        <div>
          <dt>Time Slot</dt>
          <dd>
            {formatDate(slot.date)}, {slot.time}
          </dd>
        </div>
        <div>
          <dt>Doctor Name</dt>
          <dd>{slot.doctorName}</dd>
        </div>
      </dl>
    </div>
  );
}
