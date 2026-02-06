import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiMail, HiGlobeAlt } from 'react-icons/hi';

export default function VerifyOtp() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  if (isLoading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading...</p></div>;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  if (!email) return <Navigate to="/register" replace />;

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) {
      verifyCode(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  };

  const verifyCode = async (code) => {
    setSubmitting(true);
    try {
      const { data } = await authAPI.verifyOtp({ email, otp: code });
      if (data.success) {
        login(data.data.user, data.data.token);
        toast.success('Email verified successfully!');
        navigate('/home');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendOtp({ email });
      toast.success('New OTP sent!');
      setResendTimer(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <HiGlobeAlt size={32} />
          <span>i-net</span>
        </div>
        <h2>Verify Your Email</h2>
        <p>We need to confirm your identity</p>
      </div>
      <div className="auth-right">
        <div className="auth-card otp-card">
          <div className="otp-icon">
            <HiMail size={40} />
          </div>
          <h1>Enter OTP</h1>
          <p className="auth-subtitle">We sent a 6-digit code to <strong>{email}</strong></p>

          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`otp-input ${digit ? 'filled' : ''}`}
                disabled={submitting}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {submitting && (
            <div className="otp-verifying">
              <span className="loader-spinner-sm" /> Verifying...
            </div>
          )}

          <p className="otp-resend">
            {resendTimer > 0 ? (
              <>Resend code in <strong>{resendTimer}s</strong></>
            ) : (
              <button type="button" className="link-btn" onClick={handleResend}>Resend OTP</button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
