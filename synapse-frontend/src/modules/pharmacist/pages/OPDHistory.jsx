import { useState } from 'react';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, SearchBar, Section } from '../../../core/ui';
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
        <AsyncView
          loading={opdHistory.loading}
          error={opdHistory.error}
          onRetry={opdHistory.reload}
        >
          {opdHistory.data && opdHistory.data.length > 0 ? (
            <SearchableTable
              onSearch={(value) => {
                setOPDNumber(value);
              }}
              state={opdHistory}
              columns={opdColumns}
              searchKey="opdNumber"
              searchPlaceholder="Search by OPD Number"
              emptyMessage="No OPD records available."
            />
          ) : (
            <div className="state-msg">
              {opdHistory.error ? (
                <>
                  <p>Failed to load OPD history.</p>
                  <button
                    onClick={opdHistory.reload}
                    className="btn btn--outline"
                  >
                    Retry
                  </button>
                </>
              ) : (
                <p>No OPD records available.</p>
              )}
            </div>
          )}
        </AsyncView>
      </Section>
    </div>
  );
}