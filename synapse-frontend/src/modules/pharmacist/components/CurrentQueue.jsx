import { Button } from '../../../core/ui';

/** Queue rows; the first entry is the one currently being served and is highlighted. */
export default function CurrentQueue({ entries, onViewMedicines }) {
  if (!entries.length) {
    return <div className="state-msg">The queue is empty.</div>;
  }

  return (
    <ul className="queue">
      {entries.map((entry, index) => (
        <li key={entry.id} className={`queue__row${index === 0 ? ' is-current' : ''}`}>
          <span className="queue__name">{entry.studentName}</span>
          <span className="queue__time">{entry.time}</span>
          <Button size="sm" onClick={() => onViewMedicines(entry)}>
            View Medicines
          </Button>
        </li>
      ))}
    </ul>
  );
}
