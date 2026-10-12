import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Section } from '../../../core/ui';
import CurrentQueue from '../components/CurrentQueue';
import MedicinesModal from '../components/MedicinesModal';
import SearchableTable from '../components/SearchableTable';
import {
  getCurrentQueue,
  getMedicinesGivenToday,
  getStudentsGivenMedicineToday,
} from '../services/pharmacistService';

const studentColumns = [
  { key: 'studentName', header: 'Student Name' },
  { key: 'time', header: 'Time', width: '35%' },
];

const medicineColumns = [
  { key: 'name', header: 'Medicine Name' },
  { key: 'count', header: 'Count', width: '35%' },
];

export default function PharmacistHome() {
  const queue = useAsync(getCurrentQueue);
  const students = useAsync(getStudentsGivenMedicineToday);
  const medicines = useAsync(getMedicinesGivenToday);
  const [selected, setSelected] = useState(null); // queue entry whose medicines are open

  return (
    <>
      <Section title="Current Queue" className="section--first">
        <div className="card queue-card">
          <AsyncView loading={queue.loading} error={queue.error} onRetry={queue.reload}>
            <CurrentQueue entries={queue.data ?? []} onViewMedicines={setSelected} />
          </AsyncView>
        </div>
      </Section>

      <div className="pharma-grid">
        <Section title="Students Given Medicine Today">
          <SearchableTable
            state={students}
            columns={studentColumns}
            searchKey="studentName"
            searchPlaceholder="Student Name"
            emptyMessage="No students have received medicine yet today."
          />
        </Section>
        <Section title="Medicines Given Today">
          <SearchableTable
            state={medicines}
            columns={medicineColumns}
            searchKey="name"
            searchPlaceholder="Medicine Name"
            emptyMessage="No medicines have been given yet today."
          />
        </Section>
      </div>

      {selected && <MedicinesModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
