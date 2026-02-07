import { useState, useRef, useCallback, useEffect } from 'react';
import { adultVideosAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiX, HiPhone, HiCheck, HiExclamation, HiLockClosed } from 'react-icons/hi';

function formatPrice(price) {
  return `TZS ${Number(price || 0).toLocaleString()}`;
}

export default function AdultVideoPaymentModal({ video, onClose, onSuccess }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('input'); // input, waiting, success, failed
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePay = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) return toast.error('Enter a valid phone number');

    setSubmitting(true);
    try {
      const { data } = await adultVideosAPI.initiatePayment({
        videoId: video._id,
        phoneNumber: cleanPhone,
        name: name.trim() || undefined,
      });
      if (data.success) {
        const purchaseId = data.data?.purchaseId;
        if (purchaseId) {
          setStep('waiting');
          startPolling(purchaseId);
          startTimer();
        } else {
          setStep('success');
        }
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('Already purchased')) {
        setStep('success');
      } else {
        toast.error(err.response?.data?.message || 'Payment failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = useCallback((purchaseId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await adultVideosAPI.checkPaymentStatus(purchaseId);
        if (data.success) {
          const status = data.data?.status || data.data?.payment_status;
          if (status === 'completed' || status === 'COMPLETE') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            setStep('success');
          } else if (status === 'failed' || status === 'FAILED') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            setStep('failed');
          }
        }
      } catch {}
    }, 3000);
  }, []);

  const startTimer = useCallback(() => {
    setTimeLeft(90);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(pollingRef.current);
          setStep('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <div className="pm-service">
            <div className="pm-icon" style={{ backgroundColor: '#EF444420' }}>
              <HiLockClosed size={24} color="#EF4444" />
            </div>
            <div>
              <h3>{video.title}</h3>
              <span>{formatPrice(video.price)}</span>
            </div>
          </div>
          <button className="modal-close-btn-sm" onClick={onClose}><HiX size={18} /></button>
        </div>

        <div className="pm-body">
          {/* Input */}
          {step === 'input' && (
            <div className="pm-form">
              <h3>Unlock Video</h3>
              <p className="pm-hint">Pay {formatPrice(video.price)} to unlock this video</p>
              <div className="pm-input-group">
                <HiPhone className="pm-input-icon" />
                <input
                  type="tel"
                  placeholder="Phone number (e.g. 0695123456)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={13}
                />
              </div>
              <div className="pm-input-group" style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: 16 }}
                />
              </div>
              <button className="pm-submit-btn" onClick={handlePay} disabled={submitting}>
                {submitting ? <span className="loader-spinner-sm" /> : `Pay ${formatPrice(video.price)}`}
              </button>
            </div>
          )}

          {/* Waiting */}
          {step === 'waiting' && (
            <div className="pm-waiting">
              <div className="pm-phone-anim"><HiPhone size={40} /></div>
              <h3>Waiting for Payment</h3>
              <p>Enter your PIN on your phone to confirm</p>
              <div className="pm-timer">
                <div className="pm-timer-bar">
                  <div className="pm-timer-fill" style={{ width: `${(timeLeft / 90) * 100}%` }} />
                </div>
                <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="pm-result pm-success">
              <div className="pm-result-icon success"><HiCheck size={40} /></div>
              <h3>Video Unlocked!</h3>
              <p>You can now watch this video.</p>
              <button className="pm-submit-btn" onClick={() => { onSuccess?.(); onClose(); }}>
                Watch Now
              </button>
            </div>
          )}

          {/* Failed */}
          {step === 'failed' && (
            <div className="pm-result pm-failed">
              <div className="pm-result-icon failed"><HiExclamation size={40} /></div>
              <h3>Payment Failed</h3>
              <p>The payment was not completed. Please try again.</p>
              <div className="pm-result-actions">
                <button className="pm-submit-btn" onClick={() => { setStep('input'); setPhone(''); }}>
                  Try Again
                </button>
                <button className="pm-cancel-btn" onClick={onClose}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
