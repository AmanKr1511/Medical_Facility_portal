import { useState } from 'react';
import { Button, Modal } from '../../../core/ui';

export default function SaveTemplateModal({ currentMedicines = [], defaultCondition = '', onSave, onClose }) {
  const [name, setName] = useState('');
  const [condition, setCondition] = useState(defaultCondition);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (!condition.trim()) {
      setError('Condition / Use case is required.');
      return;
    }

    onSave({
      name: name.trim(),
      condition: condition.trim(),
      medicines: currentMedicines,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal title="Save as Prescription Template" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div className="login-error-msg" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label className="field__label">Template Name *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Acute Pharyngitis"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            required
          />
        </div>

        <div className="field">
          <label className="field__label">Condition / Use Case *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Throat infection with mild fever"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              setError('');
            }}
            required
          />
        </div>

        <div className="field">
          <label className="field__label">Medicines to Include ({currentMedicines.length})</label>
          <div
            className="card"
            style={{
              maxHeight: 120,
              overflowY: 'auto',
              padding: '8px 12px',
              fontSize: 13,
              background: 'var(--c-surface-alt)',
            }}
          >
            {currentMedicines.length === 0 ? (
              <span style={{ color: 'var(--c-muted)' }}>No medicines currently added.</span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {currentMedicines.map((m, i) => (
                  <li key={i}>
                    {m.name} {m.strength} ({m.dose || '1'} tab, {m.timesPerDay}x/day for {m.days} days)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field__label">Additional Notes (Optional)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Dietary instructions, steam inhalation, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Template</Button>
        </div>
      </form>
    </Modal>
  );
}
