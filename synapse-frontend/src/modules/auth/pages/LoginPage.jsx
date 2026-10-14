import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ROLES, homePathForRole, useAuth } from '../../../core/auth';
import { Button, Icon, LogoMark } from '../../../core/ui';
import '../login.css';

const ROLE_OPTIONS = [
  {
    role: ROLES.PATIENT,
    label: 'Patient',
    idLabel: 'Patient ID / Roll Number',
    placeholder: 'e.g. p-101',
    demoId: 'p-101',
    demoName: 'Aarav Sharma',
    icon: 'user',
  },
  {
    role: ROLES.DOCTOR,
    label: 'Doctor',
    idLabel: 'Doctor ID / License Number',
    placeholder: 'e.g. doc-201',
    demoId: 'doc-201',
    demoName: 'Dr. Doom',
    icon: 'stethoscope',
  },
  {
    role: ROLES.PHARMACIST,
    label: 'Pharmacist',
    idLabel: 'Pharmacist ID',
    placeholder: 'e.g. ph-301',
    demoId: 'ph-301',
    demoName: 'Rohan Verma',
    icon: 'pill',
  },
];

const KNOWN_USERS = {
  'p-101': { name: 'Aarav Sharma', role: ROLES.PATIENT },
  'doc-201': { name: 'Dr. Doom', role: ROLES.DOCTOR },
  'ph-301': { name: 'Rohan Verma', role: ROLES.PHARMACIST },
};

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(ROLES.PATIENT);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (isAuthenticated && user?.role) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  const activeConfig =
    ROLE_OPTIONS.find((r) => r.role === selectedRole) ?? ROLE_OPTIONS[0];

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
    setErrorMessage('');
  };

  const handleQuickFill = (opt) => {
    setSelectedRole(opt.role);
    setUserId(opt.demoId);
    setPassword('demo@123');
    setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanId = userId.trim();

    if (!cleanId) {
      setErrorMessage('Please enter your user ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // Determine user display name
    const known = KNOWN_USERS[cleanId];
    const displayName =
      known && known.role === selectedRole
        ? known.name
        : `${activeConfig.label} (${cleanId})`;

    login({
      user: {
        id: cleanId,
        name: displayName,
        role: selectedRole,
      },
      token: `auth-token-${selectedRole}-${cleanId}`,
    });

    navigate(homePathForRole(selectedRole), { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-layout-container">
        {/* Left side: Already present login card */}
        <div className="login-card">
          <div className="login-brand">
            <LogoMark size={32} />
            <span>SYNapse</span>
          </div>
          <p className="login-subtitle">
            Medical Center Facility Portal • Sign in to your account
          </p>

          {errorMessage && (
            <div className="login-error-msg" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate={false}>
            {/* Role selection dropdown */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-role">
                User Type / Role
              </label>
              <div className="login-select-wrapper">
                <select
                  id="login-role"
                  name="role"
                  className="login-select"
                  value={selectedRole}
                  onChange={handleRoleChange}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.role} value={opt.role}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contextual role feedback */}
            <div className="login-role-indicator">
              <Icon name={activeConfig.icon} size={18} />
              <span>
                Signing in as <strong>{activeConfig.label}</strong>
              </span>
            </div>

            {/* User ID field */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-id">
                {activeConfig.idLabel}
              </label>
              <input
                id="login-id"
                name="username"
                type="text"
                className="login-input"
                placeholder={activeConfig.placeholder}
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setErrorMessage('');
                }}
                autoComplete="username"
                required
              />
            </div>

            {/* Password field with Show/Hide toggle */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">
                Password
              </label>
              <div className="login-password-group">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <Button type="submit" className="login-submit-btn">
              Sign In as {activeConfig.label}
            </Button>
          </form>

          {/* Demo Quick-Fill Accounts */}
          <div className="login-demo-section">
            <div className="login-demo-title">Quick Demo Logins</div>
            <div className="login-demo-grid">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  className="login-demo-chip"
                  onClick={() => handleQuickFill(opt)}
                  title={`Autofill as ${opt.label} (${opt.demoName})`}
                >
                  <Icon name={opt.icon} size={16} />
                  <span className="login-demo-chip-role">{opt.label}</span>
                  <span className="login-demo-chip-id">{opt.demoId}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Appointment booking card */}
        <div className="appointment-portal-card">
          <div className="appointment-portal-badge">Public Medical Care</div>

          <div className="appointment-portal-icon">
            <Icon name="calendarPlus" size={32} />
          </div>

          <h2 className="appointment-portal-title">Book an Appointment</h2>

          <p className="appointment-portal-subtitle">
            Need to consult a doctor? Book an outpatient appointment directly without logging in. Open to all students, staff, and campus residents.
          </p>

          <div className="appointment-portal-features">
            <div className="appointment-portal-feature">
              <Icon name="checkCircle" size={18} />
              <span>Direct OPD consultation booking</span>
            </div>
            <div className="appointment-portal-feature">
              <Icon name="checkCircle" size={18} />
              <span>Select doctor, preferred date & time slot</span>
            </div>
            <div className="appointment-portal-feature">
              <Icon name="checkCircle" size={18} />
              <span>Quick clinical intake & instant confirmation</span>
            </div>
          </div>

          <div className="appointment-portal-action">
            <Button
              size="lg"
              className="appointment-book-btn"
              onClick={() => navigate('/appointment')}
            >
              <Icon name="calendarPlus" size={20} />
              <span>Book an Appointment</span>
            </Button>
            <p className="appointment-portal-note">
              Click to view doctors schedule and proceed to the appointment form.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

}
