import { Button } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';

/** One entry of the Visit History timeline. */
export default function VisitCard({ visit, onViewSlip }) {
  return (
    <li className="timeline__item">
      <span className="timeline__dot" aria-hidden="true" />
      <div className="card visit-card">
        <dl className="visit-card__main">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(visit.date)}</dd>
          </div>
          <div>
            <dt>Doctor</dt>
            <dd>{visit.doctorName}</dd>
          </div>
        </dl>
        <dl className="visit-card__complaint">
          <dt>Complaint</dt>
          <dd>{visit.complaint}</dd>
        </dl>
        <Button variant="outline" onClick={() => onViewSlip(visit.id)}>
          View OPD Slip
        </Button>
      </div>
    </li>
  );
}
