import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const Admin = () => {
  const { error, setError, showToast, pushNotification } = useGlobalContext();
  const [users, setUsers] = useState([]);
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedPreset, setSeedPreset] = useState('medium');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, loginsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/logins')
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setLogins(Array.isArray(loginsRes.data) ? loginsRes.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      setError(null);
      await api.post('/admin/users', {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      showToast('User created', { type: 'success' });
      pushNotification('Admin created a new user', { type: 'success' });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to create user');
    }
  };

  const removeUser = async (id) => {
    const confirmed = window.confirm('Delete this user?');
    if (!confirmed) return;
    try {
      setError(null);
      await api.delete(`/admin/users/${id}`);
      showToast('User deleted', { type: 'warning' });
      pushNotification('Admin deleted a user account', { type: 'warning' });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete user');
    }
  };

  const addRandomEntries = async () => {
    const presetConfig = {
      small: { expenseCount: 20, incomeCount: 6 },
      medium: { expenseCount: 45, incomeCount: 16 },
      large: { expenseCount: 120, incomeCount: 35 }
    };
    const selected = presetConfig[seedPreset] || presetConfig.medium;
    const previewTotal = Number(selected.expenseCount || 0) + Number(selected.incomeCount || 0);
    const confirmed = window.confirm('Add random test expenses and incomes to this admin account?');
    if (!confirmed) return;
    try {
      setSeeding(true);
      setError(null);
      const res = await api.post('/admin/seed-random-entries', selected);
      const total = Number(res?.data?.totalAdded || 0);
      showToast(`Added ${total} random entries`, { type: 'success' });
      pushNotification(`Admin seeded ${total || previewTotal} random test entries`, { type: 'info' });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to add random entries');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AppShell
      title="Admin Panel"
      subtitle="Manage users and monitor login activity"
    >
      {loading ? <div className="inline-loading">Loading admin data...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card fade-in gap-bottom">
        <div className="section-head-row">
          <h3>Create User</h3>
          <div className="stack-row">
            <select
              className="admin-seed-select"
              value={seedPreset}
              onChange={(e) => setSeedPreset(e.target.value)}
              disabled={seeding}
            >
              <option value="small">Small (26)</option>
              <option value="medium">Medium (61)</option>
              <option value="large">Large (155)</option>
            </select>
            <button className="btn-secondary" onClick={addRandomEntries} disabled={seeding}>
              {seeding ? 'Adding test data...' : 'Add Random Entries'}
            </button>
          </div>
        </div>

        <form className="form-grid cols-4" onSubmit={createUser}>
          <div className="form-field">
            <label>Name</label>
            <input value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={newUser.role} onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <button className="btn-primary" type="submit">Create User</button>
          </div>
        </form>
      </section>

      <section className="ui-card fade-in gap-bottom">
        <h3 className="section-heading">Users</h3>
        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((item, index) => (
                <tr key={item._id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.role}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>{item.email}</td>
                  <td>
                    <button className="btn-danger" onClick={() => removeUser(item._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card fade-in">
        <h3 className="section-heading">Login Activity</h3>
        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((item) => (
                <tr key={item._id}>
                  <td>{item.email}</td>
                  <td>{item.success ? 'Success' : 'Failed'}</td>
                  <td>{item.role}</td>
                  <td>{item.ip || '-'}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
};

export default Admin;
