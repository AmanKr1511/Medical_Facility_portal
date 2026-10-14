import { Button, Icon } from '../../../core/ui';

/** Queue rows; the first entry is the one currently being served and is highlighted. */
export default function CurrentQueue({
  entries,
  onGiveMedicine,
  onViewMedicines,
  completedIds = new Set(),
}) {
  const handleAction = onGiveMedicine || onViewMedicines;

  if (!entries.length) {
    return <div className="state-msg">The queue is empty.</div>;
  }

  return (
    <ul className="queue">
      {entries.map((entry, index) => {
        const isDone = completedIds.has(entry.id);
        return (
          <li
            key={entry.id}
            className={`queue__row${index === 0 ? ' is-current' : ''}${isDone ? ' is-completed' : ''}`}
          >
            <div className="queue__student-info">
              <span className="queue__name">{entry.studentName}</span>
              {isDone && (
                <span className="queue__badge queue__badge--done">
                  <Icon name="checkCircle" size={14} />
                  <span>Given</span>
                </span>
              )}
            </div>
            <span className="queue__time">{entry.time}</span>
            <Button
              size="sm"
              variant={isDone ? 'outline' : 'primary'}
              onClick={() => handleAction?.(entry)}
            >
              Give medicine
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
