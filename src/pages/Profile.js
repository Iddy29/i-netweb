import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiUser, HiMail, HiPhone, HiCamera, HiLockClosed,
  HiEye, HiEyeOff, HiCheck, HiShieldCheck,
} from 'react-icons/hi';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassSection, setShowPassSection] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const fileRef = useRef(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      if (data.success) {
        await refreshUser();
        toast.success('Profile updated');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');

    setUploading(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const { data } = await authAPI.uploadProfilePicture({ image: base64 });
      if (data.success) {
        await refreshUser();
        toast.success('Profile picture updated');
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passForm.current || !passForm.newPass) return toast.error('Fill all fields');
    if (passForm.newPass.length < 6) return toast.error('Min 6 characters');
    if (passForm.newPass !== passForm.confirm) return toast.error('Passwords don\'t match');

    setChangingPass(true);
    try {
      const { data } = await authAPI.changePassword({
        currentPassword: passForm.current,
        newPassword: passForm.newPass,
      });
      if (data.success) {
        toast.success('Password changed');
        setPassForm({ current: '', newPass: '', confirm: '' });
        setShowPassSection(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="profile-page">
      <h1><HiUser size={24} /> Profile Settings</h1>

      {/* Avatar section */}
      <div className="profile-avatar-section">
        <div className="profile-avatar-wrap">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">
              <HiUser size={40} />
            </div>
          )}
          <button
            className="profile-avatar-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <span className="loader-spinner-xs" /> : <HiCamera size={16} />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePictureUpload}
            style={{ display: 'none' }}
          />
        </div>
        <div>
          <h2>{user?.fullName}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      {/* Profile form */}
      <form className="profile-form" onSubmit={handleSaveProfile}>
        <h3>Personal Information</h3>

        <div className="pf-group">
          <label>Full Name</label>
          <div className="pf-input-wrap">
            <HiUser className="pf-icon" />
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="pf-group">
          <label>Email <span className="verified-badge"><HiShieldCheck size={14} /> Verified</span></label>
          <div className="pf-input-wrap disabled">
            <HiMail className="pf-icon" />
            <input type="email" value={user?.email || ''} disabled />
          </div>
        </div>

        <div className="pf-group">
          <label>Phone Number</label>
          <div className="pf-input-wrap">
            <HiPhone className="pf-icon" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <button type="submit" className="pf-save-btn" disabled={saving}>
          {saving ? <span className="loader-spinner-sm" /> : <><HiCheck size={18} /> Save Changes</>}
        </button>
      </form>

      {/* Password section */}
      <div className="profile-form">
        <button
          type="button"
          className="pass-toggle-btn"
          onClick={() => setShowPassSection(!showPassSection)}
        >
          <HiLockClosed size={18} />
          {showPassSection ? 'Hide Password Section' : 'Change Password'}
        </button>

        {showPassSection && (
          <form onSubmit={handleChangePassword} className="pass-form">
            <div className="pf-group">
              <label>Current Password</label>
              <div className="pf-input-wrap">
                <HiLockClosed className="pf-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passForm.current}
                  onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                  required
                />
                <button type="button" className="pf-eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>
            <div className="pf-group">
              <label>New Password</label>
              <div className="pf-input-wrap">
                <HiLockClosed className="pf-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="pf-group">
              <label>Confirm New Password</label>
              <div className="pf-input-wrap">
                <HiLockClosed className="pf-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passForm.confirm}
                  onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="pf-save-btn" disabled={changingPass}>
              {changingPass ? <span className="loader-spinner-sm" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
