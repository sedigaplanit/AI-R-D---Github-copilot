import React, { useContext, useState } from 'react';
import { AuthContext } from '../Context/AuthContext';
import { useToast } from '../Context/ToastContext';
import api from '../api/apiClient';
import './Css/Profile.css';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name:    user?.name    || '',
    gender:  user?.gender  || '',
    mobile:  user?.mobile  || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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
      </div>
    </div>
  );
};

export default Profile;
