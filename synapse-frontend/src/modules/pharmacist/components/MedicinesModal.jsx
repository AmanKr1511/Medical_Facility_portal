import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Modal } from '../../../core/ui';
import { getQueueMedicines } from '../services/pharmacistService';

/** Pop-up opened from "View Medicines": the medicines listed for one queue entry. */
export default function MedicinesModal({ entry, onClose }) {
  const medicines = useAsync(() => getQueueMedicines(entry.id), [entry.id]);

  return (
    <Modal title="List of Medicines Given" onClose={onClose}>
      <p className="modal__subtitle">{entry.studentName}</p>
      <AsyncView loading={medicines.loading} error={medicines.error} onRetry={medicines.reload}>
        {medicines.data?.length ? (
          <ul className="med-list">
            {medicines.data.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="state-msg">No medicines listed.</p>
        )}
      </AsyncView>
    </Modal>
  );
}
