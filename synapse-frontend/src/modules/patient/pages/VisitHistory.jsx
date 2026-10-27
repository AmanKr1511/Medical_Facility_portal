import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Button } from '../../../core/ui';
import { useOpdSlipViewer } from '../components/OpdSlipViewer';
import VisitCard from '../components/VisitCard';
import { getVisits, getPatientProfile } from '../services/patientService';

const EMPTY_FILTERS = { date: '', doctor: '', medicine: '' };

export default function VisitHistory() {
  const [form, setForm] = useState(EMPTY_FILTERS); // what the user is typing
  const [applied, setApplied] = useState(EMPTY_FILTERS); // what the last Search submitted

  const visits = useAsync(() => getVisits(applied), [applied]);
  const PatientProfile = useAsync(() => getPatientProfile(), []);

  const { openSlip, slipViewer } = useOpdSlipViewer(visits.data, PatientProfile.data);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <h1 className="page-title">Visit History</h1>

      <form
        className="card filter-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...form, doctor: form.doctor.trim(), medicine: form.medicine.trim() });
        }}
      >
        <label className="field">
          <span className="field__label">Date</span>
          <input className="input" type="date" value={form.date} onChange={update('date')} />
        </label>
        <label className="field">
          <span className="field__label">Doctor Name</span>
          <input
            className="input"
            type="text"
            placeholder="Search by doctor"
            value={form.doctor}
            onChange={update('doctor')}
          />
        </label>
        <label className="field">
          <span className="field__label">Prescribed Medicine</span>
          <input
            className="input"
            type="text"
            placeholder="Search by medicine"
            value={form.medicine}
            onChange={update('medicine')}
          />
        </label>
        <Button type="submit" className="filter-bar__submit">
          Search
        </Button>
      </form>

      <AsyncView loading={visits.loading} error={visits.error} onRetry={visits.reload}>
        {visits.data?.length ? (
          <ul className="timeline">
            {visits.data.map((v) => (
              <VisitCard key={v.id} visit={v} onViewSlip={openSlip} />
            ))}
          </ul>
        ) : (
          <div className="state-msg">No visits match your search.</div>
        )}
      </AsyncView>

      {slipViewer}
    </>
  );
}
