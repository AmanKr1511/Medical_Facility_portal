import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Button, Modal } from '../../../core/ui';
import { getQueueMedicines } from '../services/pharmacistService';

const STATUS_GIVEN = 'given';
const STATUS_UNAVAILABLE = 'unavailable';

/** Pop-up opened from "Give medicine": Given / Not available per item, then Done. */
export default function MedicinesModal({ entry, onClose, onGiven }) {
  const medicines = useAsync(() => getQueueMedicines(entry.id), [entry.id]);
  const [statusByName, setStatusByName] = useState(() => ({}));
  const [isDone, setIsDone] = useState(false);

  const setStatus = (name, status) => {
    setStatusByName((prev) => {
      const next = { ...prev };
      if (prev[name] === status) {
        delete next[name];
      } else {
        next[name] = status;
      }
      return next;
    });
  };

  const handleFinish = () => {
    onGiven?.(entry.id);
    onClose();
  };

  const givenCount = Object.values(statusByName).filter((s) => s === STATUS_GIVEN).length;
  const unavailableCount = Object.values(statusByName).filter((s) => s === STATUS_UNAVAILABLE).length;
  const resolvedCount = givenCount + unavailableCount;

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
            Medicines have been recorded for <strong>{entry.studentName}</strong>
            {unavailableCount > 0
              ? ` (${givenCount} given, ${unavailableCount} not available).`
              : '.'}
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
                Mark each medicine as given, or select <strong>Not available</strong> if it cannot be dispensed.
              </p>
              <ul className="med-list">
                {medicines.data.map((name) => {
                  const status = statusByName[name];
                  const isGiven = status === STATUS_GIVEN;
                  const isUnavailable = status === STATUS_UNAVAILABLE;
                  return (
                    <li
                      key={name}
                      className={`med-item${isGiven ? ' is-given' : ''}${isUnavailable ? ' is-unavailable' : ''}`}
                    >
                      <span className="med-name">{name}</span>
                      <div className="med-status-group" role="group" aria-label={`${name} status`}>
                        <label className={`med-status${isGiven ? ' is-active' : ''}`}>
                          <input
                            type="checkbox"
                            className="med-checkbox"
                            checked={isGiven}
                            onChange={() => setStatus(name, STATUS_GIVEN)}
                            aria-label={`Mark ${name} as given`}
                          />
                          Given
                        </label>
                        <label className={`med-status med-status--unavailable${isUnavailable ? ' is-active' : ''}`}>
                          <input
                            type="checkbox"
                            className="med-checkbox"
                            checked={isUnavailable}
                            onChange={() => setStatus(name, STATUS_UNAVAILABLE)}
                            aria-label={`Mark ${name} as not available`}
                          />
                          Not available
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="med-modal-footer">
                <span className="med-count-indicator">
                  {resolvedCount} of {medicines.data.length} marked
                  {resolvedCount > 0 ? ` · ${givenCount} given, ${unavailableCount} not available` : ''}
                </span>
                <Button
                  disabled={resolvedCount === 0}
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
