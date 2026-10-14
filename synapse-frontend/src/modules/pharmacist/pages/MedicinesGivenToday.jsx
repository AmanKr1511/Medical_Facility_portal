import { useAsync } from '../../../core/hooks/useAsync';
import { Section } from '../../../core/ui';
import SearchableTable from '../components/SearchableTable';
import {
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

export default function MedicinesGivenToday() {
  const students = useAsync(getStudentsGivenMedicineToday);
  const medicines = useAsync(getMedicinesGivenToday);

  return (
    <div className="pharmacist-page">
      <div className="pharma-grid">
        <Section title="Students Given Medicine Today" className="section--first">
          <SearchableTable
            state={students}
            columns={studentColumns}
            searchKey="studentName"
            searchPlaceholder="Student Name"
            emptyMessage="No students have received medicine yet today."
          />
        </Section>

        <Section title="Medicines Given Today" className="section--first">
          <SearchableTable
            state={medicines}
            columns={medicineColumns}
            searchKey="name"
            searchPlaceholder="Medicine Name"
            emptyMessage="No medicines have been given yet today."
          />
        </Section>
      </div>
    </div>
  );
}
