import { useEffect, useState } from 'react';
import { Button, Icon, Modal } from '../../../core/ui';
import { AVAILABLE_MEDICINES } from '../services/mock';
import {
  addTemplate,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} from '../services/doctorStore';

const STRENGTH_OPTIONS = ['500 mg', '650 mg', '10 mg', '20 mg', '40 mg', '250 mg', '400 mg', '0.5%', '10 ml', 'Topical'];
const DOSE_OPTIONS = ['1', '2', '5 ml', '10 ml', '1 packet'];
const TIMES_OPTIONS = ['1', '2', '3', '4'];
const INSTRUCTION_OPTIONS = ['After food', 'Before food', 'With water', 'At bedtime', 'External use'];

export default function PrescriptionTemplates() {
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCondition, setFormCondition] = useState('');
  const [formMedicines, setFormMedicines] = useState([]);
  const [formNotes, setFormNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete confirmation modal state
  const [templateToDelete, setTemplateToDelete] = useState(null);

  // Medicine quick search / add state
  const [medSearchInput, setMedSearchInput] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  useEffect(() => {
    const list = getTemplates();
    setTemplates(list);
    if (list.length > 0) {
      loadTemplateIntoForm(list[0]);
    }
  }, []);

  const loadTemplateIntoForm = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setFormName(tpl.name);
    setFormCondition(tpl.condition);
    setFormMedicines(tpl.medicines || []);
    setFormNotes(tpl.notes || '');
    setIsEditing(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAddNewClick = () => {
    setSelectedTemplateId(null);
    setFormName('');
    setFormCondition('');
    setFormMedicines([
      {
        id: `med-${Date.now()}`,
        name: 'Paracetamol',
        strength: '500 mg',
        dose: '1',
        timesPerDay: '3',
        days: 5,
        instructions: 'After food',
      },
    ]);
    setFormNotes('');
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAddMedicineRow = (selectedMed) => {
    let nameToAdd = '';
    let strengthToAdd = '500 mg';
    let instructionsToAdd = 'After food';

    if (selectedMed && typeof selectedMed === 'object' && selectedMed.name) {
      nameToAdd = selectedMed.name;
      strengthToAdd = selectedMed.defaultStrength || '500 mg';
      instructionsToAdd = selectedMed.defaultInstructions || 'After food';
    } else {
      const query = (medSearchInput || '').trim();
      if (!query) return; // Do not auto-add when input is empty!

      const found =
        AVAILABLE_MEDICINES.find((m) => m.name.toLowerCase() === query.toLowerCase()) ||
        AVAILABLE_MEDICINES.find((m) => m.name.toLowerCase().includes(query.toLowerCase()));

      if (found) {
        nameToAdd = found.name;
        strengthToAdd = found.defaultStrength || '500 mg';
        instructionsToAdd = found.defaultInstructions || 'After food';
      } else {
        nameToAdd = query;
      }
    }

    if (!nameToAdd.trim()) return;

    const newMed = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: nameToAdd,
      strength: strengthToAdd,
      dose: '1',
      timesPerDay: '3',
      days: 5,
      instructions: instructionsToAdd,
    };

    setFormMedicines([...formMedicines, newMed]);
    setMedSearchInput('');
    setShowMedDropdown(false);
  };

  const handleAddBlankRow = () => {
    const newMed = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'Paracetamol',
      strength: '500 mg',
      dose: '1',
      timesPerDay: '3',
      days: 5,
      instructions: 'After food',
    };
    setFormMedicines([...formMedicines, newMed]);
  };

  const handleUpdateMedicineField = (index, field, value) => {
    const updated = [...formMedicines];
    updated[index] = { ...updated[index], [field]: value };
    setFormMedicines(updated);
  };

  const handleRemoveMedicineRow = (index) => {
    const updated = formMedicines.filter((_, i) => i !== index);
    setFormMedicines(updated);
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Template Name is required.');
      return;
    }
    if (!formCondition.trim()) {
      setErrorMessage('Condition / Use Case is required.');
      return;
    }

    const templateData = {
      name: formName.trim(),
      condition: formCondition.trim(),
      medicines: formMedicines,
      notes: formNotes.trim(),
    };

    if (selectedTemplateId) {
      // Update existing
      const updatedList = updateTemplate(selectedTemplateId, templateData);
      setTemplates(updatedList);
      setSuccessMessage('Template updated successfully.');
    } else {
      // Add new
      const updatedList = addTemplate(templateData);
      setTemplates(updatedList);
      setSelectedTemplateId(updatedList[0].id);
      setSuccessMessage('New template created successfully.');
    }

    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleConfirmDelete = () => {
    if (!templateToDelete) return;
    const updated = deleteTemplate(templateToDelete.id);
    setTemplates(updated);
    setTemplateToDelete(null);

    if (updated.length > 0) {
      loadTemplateIntoForm(updated[0]);
    } else {
      handleAddNewClick();
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trimmedMedQuery = medSearchInput.trim().toLowerCase();
  const matchedMedicines = trimmedMedQuery
    ? AVAILABLE_MEDICINES.filter((m) => m.name.toLowerCase().includes(trimmedMedQuery))
    : [];

  return (
    <div className="doc-page">
      {/* Page Header */}
      <div className="doc-page-head">
        <div>
          <h1 className="doc-page-title">Prescription Templates</h1>
          <p className="doc-page-sub">
            Create, edit and manage your frequently used prescription templates.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddNewClick}
          className="tpl-add-btn"
        >
          <Icon name="plus" size={16} /> Add Template
        </Button>
      </div>

      {successMessage && (
        <div className="tpl-alert-success" role="status">
          <Icon name="checkCircle" size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="login-error-msg" role="alert" style={{ marginBottom: 16 }}>
          {errorMessage}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="tpl-grid">
        {/* Left Column: Template List */}
        <div className="tpl-list-card">
          <h2 className="tpl-card-heading">Template List</h2>

          {/* Search Box */}
          <div className="tpl-search-wrap">
            <Icon name="search" size={16} />
            <input
              type="text"
              className="tpl-search-input"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Template Cards */}
          <div className="tpl-items-scroll">
            {filteredTemplates.map((t) => {
              const isSelected = t.id === selectedTemplateId;
              return (
                <div
                  key={t.id}
                  className={`tpl-item-row ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => loadTemplateIntoForm(t)}
                >
                  <div className="tpl-item-info">
                    <strong className="tpl-item-name">{t.name}</strong>
                    <span className="tpl-item-condition">{t.condition}</span>
                  </div>

                  <div className="tpl-item-actions">
                    <button
                      type="button"
                      className="tpl-icon-btn is-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTemplateIntoForm(t);
                      }}
                      title="Edit Template"
                      aria-label={`Edit ${t.name}`}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="tpl-icon-btn is-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToDelete(t);
                      }}
                      title="Delete Template"
                      aria-label={`Delete ${t.name}`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Template Details */}
        <div className="tpl-details-card">
          <form onSubmit={handleSaveTemplate}>
            <div className="tpl-details-header">
              <h2 className="tpl-card-heading">Template Details</h2>
              <div className="tpl-header-actions">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (selectedTemplateId) {
                      const tpl = templates.find((t) => t.id === selectedTemplateId);
                      if (tpl) loadTemplateIntoForm(tpl);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Template
                </Button>
              </div>
            </div>

            {/* Template Name & Condition */}
            <div className="tpl-fields-row">
              <div className="field flex-1">
                <label className="field__label">Template Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Common Cold"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="field flex-1">
                <label className="field__label">Condition / Use Case *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Fever, cough, cold"
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Medicines Sub-section */}
            <div className="tpl-med-section">
              <h3 className="tpl-subhead">Medicines</h3>

              <div className="tpl-med-search-bar">
                <div className="tpl-med-input-wrap">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search medicine (name / salt / company)..."
                    value={medSearchInput}
                    onFocus={() => setShowMedDropdown(true)}
                    onChange={(e) => {
                      setMedSearchInput(e.target.value);
                      setShowMedDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (matchedMedicines.length > 0) {
                          handleAddMedicineRow(matchedMedicines[0]);
                        } else {
                          handleAddMedicineRow();
                        }
                      } else if (e.key === 'Escape') {
                        setShowMedDropdown(false);
                      }
                    }}
                  />

                  {showMedDropdown && medSearchInput.trim() && (
                    <div className="med-autocomplete-dropdown">
                      {matchedMedicines.map((m) => (
                        <div
                          key={m.name}
                          className="med-autocomplete-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddMedicineRow(m);
                          }}
                        >
                          <div>
                            <span className="med-autocomplete-name">{m.name}</span>
                            <span className="med-autocomplete-meta" style={{ marginLeft: 8 }}>
                              {m.defaultInstructions}
                            </span>
                          </div>
                          <span className="med-autocomplete-badge">{m.defaultStrength}</span>
                        </div>
                      ))}
                      {!matchedMedicines.some((m) => m.name.toLowerCase() === medSearchInput.trim().toLowerCase()) && (
                        <div
                          className="med-autocomplete-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddMedicineRow();
                          }}
                        >
                          <span className="med-autocomplete-name" style={{ color: '#2563eb' }}>
                            + Add &quot;{medSearchInput.trim()}&quot; as custom medicine
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  type="button"
                  disabled={!medSearchInput.trim()}
                  onClick={() => {
                    if (matchedMedicines.length > 0) {
                      handleAddMedicineRow(matchedMedicines[0]);
                    } else {
                      handleAddMedicineRow();
                    }
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                  title={!medSearchInput.trim() ? 'Type medicine name to add' : 'Add medicine'}
                >
                  <Icon name="plus" size={16} /> Add Medicine
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleAddBlankRow}
                  style={{ whiteSpace: 'nowrap' }}
                  title="Add an empty row to customize"
                >
                  + Blank Row
                </Button>
              </div>

              {/* Medicines Table */}
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%' }}>S.No.</th>
                      <th style={{ width: '24%' }}>Medicine Name</th>
                      <th style={{ width: '15%' }}>Strength</th>
                      <th style={{ width: '11%' }}>Dose</th>
                      <th style={{ width: '11%' }}>Times / Day</th>
                      <th style={{ width: '10%' }}>Days</th>
                      <th style={{ width: '17%' }}>Instructions</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formMedicines.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="doc-empty-table-cell">
                          No medicines in this template yet. Search above to add medicines.
                        </td>
                      </tr>
                    ) : (
                      formMedicines.map((med, idx) => (
                      <tr key={med.id || idx}>
                        <td className="doc-sno">{idx + 1}</td>
                        <td>
                          <select
                            className="input tpl-select"
                            value={med.name}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'name', e.target.value)
                            }
                          >
                            <option value={med.name}>{med.name}</option>
                            {AVAILABLE_MEDICINES.filter((m) => m.name !== med.name).map(
                              (m) => (
                                <option key={m.name} value={m.name}>
                                  {m.name}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input tpl-select"
                            value={med.strength}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'strength', e.target.value)
                            }
                          >
                            {STRENGTH_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input tpl-select"
                            value={med.dose}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'dose', e.target.value)
                            }
                          >
                            {DOSE_OPTIONS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input tpl-select"
                            value={med.timesPerDay}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'timesPerDay', e.target.value)
                            }
                          >
                            {TIMES_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            className="input"
                            value={med.days}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'days', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="input tpl-select"
                            value={med.instructions}
                            onChange={(e) =>
                              handleUpdateMedicineField(idx, 'instructions', e.target.value)
                            }
                          >
                            {INSTRUCTION_OPTIONS.map((ins) => (
                              <option key={ins} value={ins}>
                                {ins}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="tpl-row-del-btn"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            aria-label={`Remove ${med.name}`}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Notes (Optional) */}
            <div className="field" style={{ marginTop: 20 }}>
              <label className="field__label">Additional Notes (Optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Add any additional notes for this template..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <Modal
          title="Confirm Template Deletion"
          onClose={() => setTemplateToDelete(null)}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <p>
              Are you sure you want to delete the template{' '}
              <strong>"{templateToDelete.name}"</strong>? This will remove it from
              your available templates.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="outline" onClick={() => setTemplateToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                style={{ background: 'var(--c-danger)', borderColor: 'var(--c-danger)' }}
              >
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
