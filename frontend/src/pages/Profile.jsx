import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const Profile = () => {
  const {
    user,
    error,
    loading,
    getCurrentUser,
    updateProfile,
    updatePassword
  } = useGlobalContext();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [profile, setProfile] = useState({ name: '', email: '', createdAt: '' });
  const [nameInput, setNameInput] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsPageLoading(true);
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setProfile({
          name: result.data.name || '',
          email: result.data.email || '',
          createdAt: result.data.createdAt || ''
        });
        setNameInput(result.data.name || '');
      } else if (user) {
        setProfile({
          name: user.name || '',
          email: user.email || '',
          createdAt: ''
        });
        setNameInput(user.name || '');
      }
      setIsPageLoading(false);
    };

    loadProfile();
  }, [getCurrentUser, user]);

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setLocalError('');
    const cleaned = String(nameInput || '').trim();
    if (!cleaned) return;

    setIsSavingName(true);
    const payload = {
      name: cleaned
    };
    const result = await updateProfile(payload);
    setIsSavingName(false);
    if (!result.success) return;
    setProfile((prev) => ({
      ...prev, name: cleaned
    }));
  };

  const onSavePassword = async (event) => {
    event.preventDefault();
    setLocalError('');
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setLocalError('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('New password and confirm password do not match.');
      return;
    }

    setIsSavingPassword(true);
    const result = await updatePassword({ currentPassword, newPassword });
    setIsSavingPassword(false);
    if (!result.success) return;
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  const profileInitial = String(nameInput || profile.name || user?.name || 'U').trim().charAt(0).toUpperCase() || 'U';

  return (
    <AppShell
      title="Profile"
      subtitle="Manage account details and security settings"
    >
      {(loading || isPageLoading) ? <div className="inline-loading">Loading profile...</div> : null}
      {(error || localError) ? <div className="error-banner">{localError || error}</div> : null}

      <section className="profile-grid">
        <aside className="ui-card profile-side-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{profileInitial}</div>
          </div>
          <h3>{profile.name || 'User'}</h3>
          <p>{profile.email || '-'}</p>
          <small className="muted">
            Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}
          </small>
        </aside>

        <div className="profile-main-stack">
          <article className="ui-card">
            <h3 className="section-heading">Account</h3>
            <form className="form-grid cols-2" onSubmit={onSaveProfile}>
              <div className="form-field">
                <label>Display Name</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input value={profile.email} disabled />
              </div>
              <div>
                <button className="btn-primary" type="submit" disabled={isSavingName}>
                  {isSavingName ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </article>

          <article className="ui-card">
            <h3 className="section-heading">Security</h3>
            <form className="form-grid cols-2" onSubmit={onSavePassword}>
              <div className="form-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="form-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="align-end">
                <button className="btn-primary" type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </AppShell>
  );
};

export default Profile;
