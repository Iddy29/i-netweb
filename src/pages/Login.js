import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiGlobeAlt } from 'react-icons/hi';

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading...</p></div>;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setSubmitting(true);
    try {
      const { data } = await authAPI.login(form);
      if (data.success) {
        login(data.data.user, data.data.token);
        toast.success('Welcome back!');
        navigate('/home');
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requiresVerification) {
        toast('Please verify your email first. A new OTP has been sent.');
        navigate('/verify-otp', { state: { email: form.email } });
      } else {
        toast.error(errData?.message || 'Login failed');
      }
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
        <h2>Welcome to i-net</h2>
        <p>Your digital services marketplace</p>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h1>Sign In</h1>
          <p className="auth-subtitle">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
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
              <HiLockClosed className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="input-eye" onClick={() => setShowPass(!showPass)}>
                {showPass ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? <span className="loader-spinner-sm" /> : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
