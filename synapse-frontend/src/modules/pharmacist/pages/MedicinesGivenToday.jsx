import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { Button, Modal, Section } from '../../../core/ui';
import SearchableTable from '../components/SearchableTable';
import {
  getMedicinesGivenToday,
  getStudentsGivenMedicineToday,
  getStudentMedicines,
} from '../services/pharmacistService';

export default function MedicinesGivenToday() {
  const students = useAsync(getStudentsGivenMedicineToday);
  const medicines = useAsync(getMedicinesGivenToday);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentMedicines, setStudentMedicines] = useState([]);

  const studentColumns = [
    { key: 'studentName', header: 'Student Name' },
    { key: 'time', header: 'Time', width: '35%' },
    {
      key: 'viewMedicines',
      header: 'Medicines',
      width: '20%',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => openMedicinesPopup(row)}>
          View Medicines
        </Button>
      ),
    },
  ];

  const medicineColumns = [
    { key: 'name', header: 'Medicine Name' },
    { key: 'count', header: 'Count', width: '35%' },
  ];

  const openMedicinesPopup = async (row) => {
    setSelectedStudent(row);
    const meds = await getStudentMedicines(row.id);
    setStudentMedicines(meds);
  };

  const closeMedicinesPopup = () => {
    setSelectedStudent(null);
    setStudentMedicines([]);
  };

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

      {selectedStudent && (
        <Modal title="Medicines Given" onClose={closeMedicinesPopup}>
          <p className="modal__subtitle">
            Student: <strong>{selectedStudent.studentName}</strong>
          </p>
          {studentMedicines.length ? (
            <ul className="med-list">
              {studentMedicines.map((m, idx) => (
                <li key={idx} className="med-item">
                  <span className="med-name">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="state-msg">No medicines listed for this student.</p>
          )}
          <div className="med-modal-footer">
            <Button onClick={closeMedicinesPopup}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
