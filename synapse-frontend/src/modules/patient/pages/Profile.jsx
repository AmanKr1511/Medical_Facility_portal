import { useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth';
import { Avatar, Button, Icon, Modal } from '../../../core/ui';
import {
  changePatientPassword,
  getPatientProfile,
  updatePatientProfile,
} from '../services/patientService';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: user?.name || 'Aarav Sharma',
    age: 21,
    gender: 'Male',
    email: 'aarav.sharma@example.com',
    contact: '+91 98765 43210',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getPatientProfile().then((data) => {
      if (active && data) {
        setProfile({
          ...data,
          name: user?.name || data.name,
        });
        setEditForm({
          ...data,
          name: user?.name || data.name,
        });
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  const handleEditChange = (field) => (e) => {
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updated = await updatePatientProfile(editForm);
    setProfile(updated);
    setIsEditing(false);
    setLoading(false);
    setProfileSuccess('Profile details saved successfully.');
    setTimeout(() => setProfileSuccess(''), 4000);
  };

  const handleCancelEdit = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePatientPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1800);
    } catch {
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="patient-profile">
      <div className="profile-header">
        <h1 className="page-title">Patient Profile</h1>
        <p className="page-subtitle">Manage personal information and account settings</p>
      </div>

      {profileSuccess && (
        <div className="profile-alert profile-alert--success" role="alert">
          <Icon name="checkCircle" size={18} />
          <span>{profileSuccess}</span>
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className="card profile-card">
        <div className="profile-hero">
          <Avatar name={profile.name} size={64} />
          <div className="profile-hero__meta">
            <h2 className="profile-hero__name">{profile.name}</h2>
            <div className="profile-hero__tags">
              <span className="profile-tag">Patient ID: {user?.id || 'p-101'}</span>
              <span className="profile-tag profile-tag--accent">Active Student</span>
            </div>
          </div>
          <div className="profile-hero__actions">
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Icon name="edit" size={16} />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="profile-grid">
              <label className="field">
                <span className="field__label">Full Name</span>
                <input
                  type="text"
                  className="input"
                  value={editForm.name}
                  onChange={handleEditChange('name')}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Age</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="input"
                  value={editForm.age}
                  onChange={handleEditChange('age')}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Gender</span>
                <select
                  className="input profile-select"
                  value={editForm.gender}
                  onChange={handleEditChange('gender')}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="field">
                <span className="field__label">Email</span>
                <input
                  type="email"
                  className="input"
                  value={editForm.email}
                  onChange={handleEditChange('email')}
                  required
                />
              </label>

              <label className="field profile-grid--full">
                <span className="field__label">Contact Number</span>
                <input
                  type="tel"
                  className="input"
                  value={editForm.contact}
                  onChange={handleEditChange('contact')}
                  required
                />
              </label>
            </div>

            <div className="profile-form__footer">
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <dl className="profile-details-grid">
            <div className="profile-item">
              <dt className="profile-item__label">Full Name</dt>
              <dd className="profile-item__value">{profile.name}</dd>
            </div>

            <div className="profile-item">
              <dt className="profile-item__label">Age</dt>
              <dd className="profile-item__value">{profile.age} years</dd>
            </div>

            <div className="profile-item">
              <dt className="profile-item__label">Gender</dt>
              <dd className="profile-item__value">{profile.gender}</dd>
            </div>

            <div className="profile-item">
              <dt className="profile-item__label">Email</dt>
              <dd className="profile-item__value">{profile.email}</dd>
            </div>

            <div className="profile-item profile-grid--full">
              <dt className="profile-item__label">Contact Number</dt>
              <dd className="profile-item__value">{profile.contact}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Account Security / Change Password Section */}
      <div className="card profile-security-card">
        <div className="security-info">
          <div className="security-icon">
            <Icon name="settings" size={24} />
          </div>
          <div>
            <h3 className="security-title">Account Security</h3>
            <p className="security-desc">
              Manage your password to protect your account and medical history.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowPasswordModal(true)}>
          Change Password
        </Button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <Modal
          title="Change Password"
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordError('');
            setPasswordSuccess('');
          }}
        >
          {passwordSuccess ? (
            <div className="password-success-view">
              <div className="password-success-icon">
                <Icon name="checkCircle" size={48} />
              </div>
              <h3>Password Updated</h3>
              <p>{passwordSuccess}</p>
            </div>
          ) : (
            <form className="password-form" onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <div className="profile-alert profile-alert--error" role="alert">
                  {passwordError}
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="curr-pass">
                  Current Password
                </label>
                <div className="password-input-wrap">
                  <input
                    id="curr-pass"
                    type={showPasswords.current ? 'text' : 'password'}
                    className="input"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() =>
                      setShowPasswords((s) => ({ ...s, current: !s.current }))
                    }
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showPasswords.current ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="new-pass">
                  New Password
                </label>
                <div className="password-input-wrap">
                  <input
                    id="new-pass"
                    type={showPasswords.new ? 'text' : 'password'}
                    className="input"
                    placeholder="At least 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() =>
                      setShowPasswords((s) => ({ ...s, new: !s.new }))
                    }
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showPasswords.new ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="conf-pass">
                  Confirm New Password
                </label>
                <div className="password-input-wrap">
                  <input
                    id="conf-pass"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="input"
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() =>
                      setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))
                    }
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showPasswords.confirm ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              <div className="password-form__actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordSubmitting}>
                  {passwordSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
