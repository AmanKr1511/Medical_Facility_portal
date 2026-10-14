import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Button, Modal } from '../../../core/ui';
import { getQueueMedicines } from '../services/pharmacistService';

/** Pop-up opened from "Give medicine": checkbox list with transparency and Done confirmation. */
export default function MedicinesModal({ entry, onClose, onGiven }) {
  const medicines = useAsync(() => getQueueMedicines(entry.id), [entry.id]);
  const [checkedSet, setCheckedSet] = useState(() => new Set());
  const [isDone, setIsDone] = useState(false);

  const toggleMedicine = (name) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      // Check if all medicines in the list are now checkboxed
      if (medicines.data && next.size === medicines.data.length && medicines.data.length > 0) {
        setTimeout(() => {
          setIsDone(true);
        }, 300);
      }
      return next;
    });
  };

  const handleFinish = () => {
    onGiven?.(entry.id);
    onClose();
  };

  return (
    <Modal title="List of Medicines Given" onClose={onClose}>
      <p className="modal__subtitle">Patient: {entry.studentName}</p>

      {isDone ? (
        <div className="med-done-popup" role="status" aria-live="polite">
          <div className="med-done-popup__circle">
            <svg
              className="med-done-popup__tick"
              width="68"
              height="68"
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
          <h3 className="med-done-popup__title">Done</h3>
          <p className="med-done-popup__desc">
            All desired medicines have been marked as given for <strong>{entry.studentName}</strong>.
          </p>
          <div className="med-done-popup__actions">
            <Button onClick={handleFinish} className="med-done-popup__btn">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <AsyncView loading={medicines.loading} error={medicines.error} onRetry={medicines.reload}>
          {medicines.data?.length ? (
            <div className="med-modal-body">
              <p className="med-modal-hint">
                Check the medicines as you dispense them. Items become transparent when selected.
              </p>
              <ul className="med-list">
                {medicines.data.map((name) => {
                  const isChecked = checkedSet.has(name);
                  return (
                    <li
                      key={name}
                      className={`med-item${isChecked ? ' is-transparent' : ''}`}
                      onClick={() => toggleMedicine(name)}
                    >
                      <input
                        type="checkbox"
                        className="med-checkbox"
                        checked={isChecked}
                        onChange={() => toggleMedicine(name)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Mark ${name} as given`}
                      />
                      <span className="med-name">{name}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="med-modal-footer">
                <span className="med-count-indicator">
                  {checkedSet.size} of {medicines.data.length} medicines checked
                </span>
                <Button
                  disabled={checkedSet.size === 0}
                  onClick={() => setIsDone(true)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <p className="state-msg">No medicines listed for this student.</p>
          )}
        </AsyncView>
      )}
    </Modal>
  );
}
