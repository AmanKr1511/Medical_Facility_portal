import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth';
import { useAsync } from '../../../core/hooks/useAsync';
import { AsyncView, Button, DataTable, Section } from '../../../core/ui';
import { formatDate } from '../../../core/utils/date';
import { useOpdSlipViewer } from '../components/OpdSlipViewer';
import SlotCard from '../components/SlotCard';
import UpcomingAppointmentCard from '../components/UpcomingAppointmentCard';
import { getAvailableSlots, getUpcomingAppointment, getVisits } from '../services/patientService';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openSlip, slipViewer } = useOpdSlipViewer();

  const slots = useAsync(getAvailableSlots);
  const upcoming = useAsync(getUpcomingAppointment);
  const visits = useAsync(() => getVisits({ limit: 3 }));

  const visitColumns = [
    { key: 'date', header: 'Date', width: '30%', render: (v) => formatDate(v.date) },
    { key: 'doctorName', header: 'Doctor' },
    {
      key: 'slip',
      header: 'OPD Slip',
      width: 140,
      render: (v) => (
        <Button variant="outline" size="sm" onClick={() => openSlip(v.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <h1 className="page-title">Welcome</h1>
      <p className="page-subtitle">{user?.name}</p>

      <Section title="Available Time Slots">
        <AsyncView loading={slots.loading} error={slots.error} onRetry={slots.reload}>
          {slots.data?.length ? (
            <div className="slot-grid">
              {slots.data.map((s) => (
                <SlotCard key={s.id} slot={s} />
              ))}
            </div>
          ) : (
            <div className="card">
              <p className="page-subtitle" style={{ margin: 0 }}>
                No time slots are available right now.
              </p>
            </div>
          )}
        </AsyncView>
      </Section>

      <Section
        title="Upcoming Appointment"
        action={
          <Link to="/patient/my-appointments" className="section__link">
            View All
          </Link>
        }
      >
        <AsyncView loading={upcoming.loading} error={upcoming.error} onRetry={upcoming.reload}>
          <UpcomingAppointmentCard
            appointment={upcoming.data}
            onViewDetails={() => navigate('/patient/my-appointments')}
          />
        </AsyncView>
      </Section>

      <Section title="Previous Visits">
        <AsyncView loading={visits.loading} error={visits.error} onRetry={visits.reload}>
          <DataTable columns={visitColumns} rows={visits.data ?? []} emptyMessage="No previous visits yet." />
        </AsyncView>
      </Section>

      {slipViewer}
    </>
  );
}
