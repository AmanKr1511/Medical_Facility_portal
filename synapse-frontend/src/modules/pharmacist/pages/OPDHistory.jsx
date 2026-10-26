import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Section, SearchBar } from '../../../core/ui';
import SearchableTable from '../components/SearchableTable';
import { getOPDHistory } from '../services/pharmacistService';

const EMPTY_OPD_NUMBER = '';

export default function OPDHistory() {
  const [opdNumber, setOPDNumber] = useState(EMPTY_OPD_NUMBER);
  const opdHistory = useAsync(() => getOPDHistory(opdNumber), [opdNumber]);

  const opdColumns = [
    { key: 'opdNumber', header: 'OPD Number', width: '25%' },
    { key: 'patientName', header: 'Patient Name', width: '35%' },
    { key: 'doctorName', header: 'Doctor', width: '20%' },
    { key: 'visitTime', header: 'Visit Time', width: '20%' },
  ];

  return (
    <div className="pharmacist-page">
      <Section title="OPD History" className="section--first">
        <SearchBar
          placeholder="Search by OPD Number"
          onSearch={(value) => {
            setOPDNumber(value);
          }}
        />
        <AsyncView
          loading={opdHistory.loading}
          error={opdHistory.error}
          onRetry={opdHistory.reload}
        >
          {opdHistory.data?.length ? (
            <SearchableTable
              state={opdHistory}
              columns={opdColumns}
              searchKey="opdNumber"
              searchPlaceholder="OPD Number"
              emptyMessage="No OPD records match your search."
            />
          ) : (
            <div className="state-msg">
              {opdNumber
                ? 'No OPD records found for OPD number: ' + opdNumber
                : 'No OPD records available.'}
            </div>
          )}
        </AsyncView>
      </Section>
    </div>
  );
}