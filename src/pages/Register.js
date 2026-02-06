import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiUser, HiPhone, HiGlobeAlt } from 'react-icons/hi';

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading...</p></div>;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      return toast.error('Please fill all fields');
    }
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');

    setSubmitting(true);
    try {
      const { data } = await authAPI.register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      if (data.success) {
        toast.success('OTP sent to your email!');
        navigate('/verify-otp', { state: { email: form.email } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <HiGlobeAlt size={32} />
          <span>i-net</span>
        </div>
        <h2>Join i-net</h2>
        <p>Create your account and start exploring digital services</p>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h1>Create Account</h1>
          <p className="auth-subtitle">Fill in your details to get started</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <HiUser className="input-icon" />
              <input
                type="text"
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <HiMail className="input-icon" />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <HiPhone className="input-icon" />
              <input
                type="tel"
                placeholder="Phone number (e.g. 0712345678)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <HiLockClosed className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="input-eye" onClick={() => setShowPass(!showPass)}>
                {showPass ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>

            <div className="input-group">
              <HiLockClosed className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? <span className="loader-spinner-sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
