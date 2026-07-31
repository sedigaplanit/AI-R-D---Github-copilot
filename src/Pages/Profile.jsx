import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../Context/AuthContext';
import { useToast } from '../Context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/apiClient';
import './Css/Profile.css';

const Profile = () => {
  const { user, updateUser, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name:    user?.name    || '',
    gender:  user?.gender  || '',
    mobile:  user?.mobile  || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);

  // Admin log download state
  const [logMode, setLogMode] = useState('recent');  // 'recent' | 'custom'
  const [logMinutes, setLogMinutes] = useState(10);
  const [downloading, setDownloading] = useState(false);

  // Helper: UTC datetime string for datetime-local inputs (server stores logs in UTC)
  const toUTCDT = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  };
  const [fromDateTime, setFromDateTime] = useState(() => toUTCDT(new Date(Date.now() - 60 * 60 * 1000)));
  const [toDateTime,   setToDateTime]   = useState(() => toUTCDT(new Date()));

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch fresh profile data from DB on mount (fixes stale JWT / old accounts)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api('/api/auth/me');
        updateUser(data.user);
        setForm({
          name:    data.user.name    || '',
          gender:  data.user.gender  || '',
          mobile:  data.user.mobile  || '',
          address: data.user.address || '',
        });
      } catch {
        // fall back to cached user data already in form
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast('Please enter your password to confirm.', 'error');
      return;
    }
    setDeleting(true);
    try {
      await api('/api/auth/account', { method: 'DELETE', body: { password: deletePassword } });
      showToast('Your account has been deleted.');
      await logout();
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadLogs = async () => {
    setDownloading(true);
    try {
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('jwt_token');
      let url, filename;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (logMode === 'recent') {
        url      = `${BASE}/api/admin/logs/download?minutes=${logMinutes}`;
        filename = `app-logs-last-${logMinutes}min-${ts}.logs`;
      } else {
        if (!fromDateTime || !toDateTime) {
          showToast('Please select both From and To date/time.', 'error');
          setDownloading(false);
          return;
        }
        const from = fromDateTime + ':00Z';  // picker values are UTC, append Z
        const to   = toDateTime   + ':00Z';
        url      = `${BASE}/api/admin/logs/download?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        filename = `app-logs-${fromDateTime.replace(/[T:]/g, '-')}_to_${toDateTime.replace(/[T:]/g, '-')}.logs`;
      }

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${response.status})`);
      }
      const blob    = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href        = blobUrl;
      a.download    = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast(logMode === 'recent'
        ? `Downloaded logs for the last ${logMinutes} minute(s).`
        : 'Downloaded logs for the selected range.');
    } catch (err) {
      showToast(err.message || 'Failed to download logs.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 3) {
      showToast('Name must be at least 3 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = await api('/api/auth/profile', { method: 'PUT', body: form });
      updateUser(data.user, data.token);
      // Sync form with the saved values returned from server
      setForm({
        name:    data.user.name    || '',
        gender:  data.user.gender  || '',
        mobile:  data.user.mobile  || '',
        address: data.user.address || '',
      });
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Profile</h1>
        <div className="profile-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
        <p className="profile-email">{user?.email}</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Loading profile...</p>
        ) : (
        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-field">
            <label>Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="profile-field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </div>
          <div className="profile-field">
            <label>Mobile Number</label>
            <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="+94 77 000 0000" />
          </div>
          <div className="profile-field">
            <label>Address <span className="profile-optional">(optional)</span></label>
            <textarea name="address" value={form.address} onChange={handleChange} rows={3} placeholder="Your delivery address" />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        )}

        {/* Admin Panel — visible to admin users only */}
        {user?.is_admin && (
          <div className="profile-admin-panel">
            <h3>Admin — Download Logs</h3>

            {/* Mode radio buttons */}
            <div className="admin-radio-group">
              <label className="admin-radio-label">
                <input
                  type="radio" name="logMode" value="recent"
                  checked={logMode === 'recent'}
                  onChange={() => setLogMode('recent')}
                />
                Last N minutes
              </label>
              <label className="admin-radio-label">
                <input
                  type="radio" name="logMode" value="custom"
                  checked={logMode === 'custom'}
                  onChange={() => setLogMode('custom')}
                />
                Custom range
              </label>
            </div>

            {logMode === 'recent' ? (
              <>
                <p>Download log entries from the last N minutes.</p>
                <div className="profile-admin-stepper">
                  <button
                    type="button" className="stepper-btn"
                    onClick={() => setLogMinutes((m) => Math.max(1, m - 10))}
                    disabled={logMinutes <= 1}
                  >−</button>
                  <span className="stepper-value">{logMinutes} min</span>
                  <button
                    type="button" className="stepper-btn"
                    onClick={() => setLogMinutes((m) => Math.min(1440, m + 10))}
                    disabled={logMinutes >= 1440}
                  >+</button>
                </div>
              </>
            ) : (
              <>
                <p>Select a date/time range <span className="profile-optional">(UTC — server time)</span>.</p>
                <div className="admin-datetime-group">
                  <label className="admin-datetime-label">From</label>
                  <input
                    type="datetime-local"
                    className="admin-datetime-input"
                    value={fromDateTime}
                    max={toDateTime}
                    onChange={(e) => setFromDateTime(e.target.value)}
                  />
                  <label className="admin-datetime-label">To</label>
                  <input
                    type="datetime-local"
                    className="admin-datetime-input"
                    value={toDateTime}
                    min={fromDateTime}
                    onChange={(e) => setToDateTime(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              type="button"
              className="profile-download-btn"
              onClick={handleDownloadLogs}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : logMode === 'recent' ? `Download Last ${logMinutes} min` : 'Download Range'}
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className="profile-danger-zone">
          <h3>Danger Zone</h3>
          <p>Permanently delete your account and all associated data. This cannot be undone.</p>
          <button className="profile-delete-btn" onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Account</h2>
            <p>This will permanently delete your account, orders, cart, wishlist and reviews. Enter your password to confirm.</p>
            <input
              type="password"
              className="delete-modal-input"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
              autoFocus
            />
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
                Cancel
              </button>
              <button className="delete-modal-confirm" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
