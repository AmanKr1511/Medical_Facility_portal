import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Section } from '../../../core/ui';
import CurrentQueue from '../components/CurrentQueue';
import MedicinesModal from '../components/MedicinesModal';
import { getCurrentQueue } from '../services/pharmacistService';

export default function PharmacistHome() {
  const queue = useAsync(getCurrentQueue);
  const [selected, setSelected] = useState(null); // queue entry whose medicines modal is open
  const [completedIds, setCompletedIds] = useState(() => new Set());

  const handleMedicineGiven = (id) => {
    setCompletedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="pharmacist-page">
      <Section title="Current Queue" className="section--first">
        <div className="card queue-card">
          <AsyncView loading={queue.loading} error={queue.error} onRetry={queue.reload}>
            <CurrentQueue
              entries={queue.data ?? []}
              onGiveMedicine={setSelected}
              completedIds={completedIds}
            />
          </AsyncView>
        </div>
      </Section>

      {selected && (
        <MedicinesModal
          entry={selected}
          onClose={() => setSelected(null)}
          onGiven={handleMedicineGiven}
        />
      )}
    </div>
  );
}
