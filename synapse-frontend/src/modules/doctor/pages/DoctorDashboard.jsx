import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../../core/ui';
import {
  getAppointments,
  getDoctorStats,
  updateAppointmentStatus,
} from '../services/doctorStore';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalAppointments: 12,
    consulting: 5,
    waiting: 3,
    completed: 4,
  });
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const list = getAppointments();
    setAppointments(list);
    setStats(getDoctorStats(list));

    // Live clock: update every second
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = (id, newStatus) => {
    const updated = updateAppointmentStatus(id, newStatus);
    setAppointments(updated);
    setStats(getDoctorStats(updated));
  };

  const handleView = (aptId) => {
    navigate(`/doctor/consultation/${aptId}`);
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'Waiting':
        return 'doc-status-badge is-waiting';
      case 'Reschedule':
        return 'doc-status-badge is-reschedule';
      case 'Completed':
        return 'doc-status-badge is-completed';
      case 'Cancelled':
        return 'doc-status-badge is-cancelled';
      default:
        return 'doc-status-badge';
    }
  };

  return (
    <div className="doc-page">
      {/* Page Header */}
      <div className="doc-page-head">
        <h1 className="doc-page-title">Doctor Dashboard</h1>
        <div className="doc-date-badge">
          <Icon name="calendar" size={16} />
          <span>
            {currentDateTime.toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' '}
            • {currentDateTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards Grid (4 Cards from Image 1) */}
      <div className="doc-stats-grid">
        {/* Total Appointments */}
        <div className="doc-stat-card card-total">
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-blue">
              <Icon name="calendar" size={20} />
            </span>
            <span className="doc-stat-number">{stats.totalAppointments}</span>
          </div>
          <div className="doc-stat-label">Total Appointments</div>
        </div>

        {/* Consulting */}
        <div className="doc-stat-card card-consulting">
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-green">
              <Icon name="stethoscope" size={20} />
            </span>
            <span className="doc-stat-number">{stats.consulting}</span>
          </div>
          <div className="doc-stat-label">Consulting</div>
        </div>

        {/* Waiting */}
        <div className="doc-stat-card card-waiting">
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-orange">
              <Icon name="hourglass" size={20} />
            </span>
            <span className="doc-stat-number">{stats.waiting}</span>
          </div>
          <div className="doc-stat-label">Waiting</div>
        </div>

        {/* Completed */}
        <div className="doc-stat-card card-completed">
          <div className="doc-stat-top">
            <span className="doc-stat-icon-wrap icon-purple">
              <Icon name="checkCircle" size={20} />
            </span>
            <span className="doc-stat-number">{stats.completed}</span>
          </div>
          <div className="doc-stat-label">Completed</div>
        </div>
      </div>

      {/* Today's Appointments Section */}
      <div className="doc-section-card">
        <div className="doc-table-header">
          <h2 className="doc-table-title">Today's Appointments</h2>
        </div>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>S.No.</th>
                <th style={{ width: '52%' }}>Patient</th>
                <th style={{ width: '24%' }}>Status</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td className="doc-sno">{apt.sNo}</td>
                  <td>
                    <div className="doc-patient-cell">
                      <span className="doc-patient-name">{apt.patientName}</span>
                      <span className="doc-patient-sub">{apt.detailsSub}</span>
                    </div>
                  </td>
                  <td>
                    <div className="doc-status-select-wrap">
                      <select
                        className={statusBadgeClass(apt.status)}
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                        aria-label={`Status for ${apt.patientName}`}
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="Reschedule">Reschedule</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="doc-view-btn"
                      onClick={() => handleView(apt.id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
