import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, settingsAPI } from '../services/api';
import ServiceIcon from './ServiceIcon';
import toast from 'react-hot-toast';
import {
  HiX, HiPhone, HiCreditCard, HiCheck, HiExclamation,
  HiClipboardCopy, HiDocumentText, HiArrowRight,
} from 'react-icons/hi';

function formatPrice(price, currency = 'TZS') {
  if (currency === 'TZS') return `TZS ${Number(price).toLocaleString()}`;
  return `$${Number(price).toFixed(2)}`;
}

export default function PaymentModal({ service, onClose, onCancel }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('loading'); // loading, method, ussd_input, ussd_waiting, manual_input, success, failed
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [manualProof, setManualProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsAPI.getPaymentSettings();
      if (data.success) {
        const s = data.data;
        setPaymentSettings(s);
        // If only one method, skip selection
        if (s.ussdPaymentEnabled && !s.manualPaymentEnabled) setStep('ussd_input');
        else if (!s.ussdPaymentEnabled && s.manualPaymentEnabled) setStep('manual_input');
        else setStep('method');
      }
    } catch {
      setStep('method');
      setPaymentSettings({ ussdPaymentEnabled: true, manualPaymentEnabled: false });
    }
  };

  // USSD flow
  const handleUssd = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) return toast.error('Enter a valid phone number');
    setSubmitting(true);
    try {
      const { data } = await ordersAPI.create({
        serviceId: service._id,
        paymentPhone: cleanPhone,
      });
      if (data.success) {
        setOrderId(data.data._id);
        setStep('ussd_waiting');
        startPolling(data.data._id);
        startTimer(data.data._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = useCallback((id) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await ordersAPI.checkPaymentStatus(id);
        if (data.success) {
          const status = data.data.paymentStatus;
          if (status === 'completed') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            setStep('success');
          } else if (status === 'failed') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            setStep('failed');
          }
        }
      } catch {}
    }, 3000);
  }, []);

  const startTimer = useCallback((id) => {
    setTimeLeft(90);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(pollingRef.current);
          ordersAPI.paymentTimeout(id);
          setStep('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Manual flow
  const handleManual = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) return toast.error('Enter the phone you paid from');
    if (!manualProof.trim()) return toast.error('Please paste the payment confirmation message');

    setSubmitting(true);
    try {
      const { data } = await ordersAPI.createManual({
        serviceId: service._id,
        paymentPhone: cleanPhone,
        manualPaymentProof: manualProof.trim(),
      });
      if (data.success) {
        setStep('success');
        toast.success('Payment submitted for verification');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <div className="pm-service">
            <div className="pm-icon" style={{ backgroundColor: (service.color || '#06B6D4') + '20' }}>
              <ServiceIcon type={service.iconType} size={24} color={service.color} iconImage={service.iconImage} />
            </div>
            <div>
              <h3>{service.name}</h3>
              <span>{formatPrice(service.price, service.currency)}</span>
            </div>
          </div>
          <button className="modal-close-btn-sm" onClick={onCancel}><HiX size={18} /></button>
        </div>

        <div className="pm-body">
          {/* Loading */}
          {step === 'loading' && (
            <div className="pm-loading">
              <div className="loader-spinner" />
              <p>Loading payment options...</p>
            </div>
          )}

          {/* Method Selection */}
          {step === 'method' && (
            <div className="pm-methods">
              <h3>Choose Payment Method</h3>
              {paymentSettings?.ussdPaymentEnabled && (
                <button className="method-card" onClick={() => setStep('ussd_input')}>
                  <div className="method-icon ussd"><HiPhone size={24} /></div>
                  <div className="method-info">
                    <strong>USSD Push</strong>
                    <span>Pay via mobile money prompt</span>
                  </div>
                  <HiArrowRight size={18} />
                </button>
              )}
              {paymentSettings?.manualPaymentEnabled && (
                <button className="method-card" onClick={() => setStep('manual_input')}>
                  <div className="method-icon manual"><HiDocumentText size={24} /></div>
                  <div className="method-info">
                    <strong>Manual Payment</strong>
                    <span>Send money & upload proof</span>
                  </div>
                  <HiArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {/* USSD Input */}
          {step === 'ussd_input' && (
            <div className="pm-form">
              <h3>Enter Payment Number</h3>
              <p className="pm-hint">A USSD push prompt will be sent to this number</p>
              <div className="pm-input-group">
                <HiPhone className="pm-input-icon" />
                <input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={13}
                />
              </div>
              <button className="pm-submit-btn" onClick={handleUssd} disabled={submitting}>
                {submitting ? <span className="loader-spinner-sm" /> : `Pay ${formatPrice(service.price, service.currency)}`}
              </button>
            </div>
          )}

          {/* USSD Waiting */}
          {step === 'ussd_waiting' && (
            <div className="pm-waiting">
              <div className="pm-phone-anim">
                <HiPhone size={40} />
              </div>
              <h3>Waiting for Payment</h3>
              <p>Enter your PIN on your phone to confirm the payment</p>
              <div className="pm-timer">
                <div className="pm-timer-bar">
                  <div className="pm-timer-fill" style={{ width: `${(timeLeft / 90) * 100}%` }} />
                </div>
                <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
              </div>
            </div>
          )}

          {/* Manual Input */}
          {step === 'manual_input' && (
            <div className="pm-form">
              <h3>Manual Payment</h3>

              {paymentSettings?.manualPaymentPhone && (
                <div className="pm-payment-details">
                  <p className="pm-detail-label">Send payment to:</p>
                  <div className="pm-detail-row">
                    <div>
                      <strong>{paymentSettings.manualPaymentName}</strong>
                      <span>{paymentSettings.manualPaymentPhone}</span>
                    </div>
                    <button className="pm-copy-btn" onClick={() => copyToClipboard(paymentSettings.manualPaymentPhone)}>
                      <HiClipboardCopy size={16} />
                    </button>
                  </div>
                  <div className="pm-amount-box">
                    Amount: <strong>{formatPrice(service.price, service.currency)}</strong>
                  </div>
                  {paymentSettings.manualPaymentInstructions && (
                    <p className="pm-instructions">{paymentSettings.manualPaymentInstructions}</p>
                  )}
                </div>
              )}

              <div className="pm-input-group">
                <HiPhone className="pm-input-icon" />
                <input
                  type="tel"
                  placeholder="Phone you paid from"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="pm-textarea-group">
                <label>Payment Confirmation Message</label>
                <textarea
                  rows={4}
                  placeholder="Paste the M-Pesa/Airtel Money confirmation message..."
                  value={manualProof}
                  onChange={(e) => setManualProof(e.target.value)}
                />
              </div>

              <button className="pm-submit-btn" onClick={handleManual} disabled={submitting}>
                {submitting ? <span className="loader-spinner-sm" /> : 'Submit for Verification'}
              </button>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="pm-result pm-success">
              <div className="pm-result-icon success">
                <HiCheck size={40} />
              </div>
              <h3>Payment Successful!</h3>
              <p>Your order has been placed and will be processed shortly.</p>
              <button className="pm-submit-btn" onClick={() => { onClose(); navigate('/orders'); }}>
                View My Orders
              </button>
            </div>
          )}

          {/* Failed */}
          {step === 'failed' && (
            <div className="pm-result pm-failed">
              <div className="pm-result-icon failed">
                <HiExclamation size={40} />
              </div>
              <h3>Payment Failed</h3>
              <p>The payment was not completed. Please try again.</p>
              <div className="pm-result-actions">
                <button className="pm-submit-btn" onClick={() => { setStep('ussd_input'); setPhone(''); }}>
                  Try Again
                </button>
                <button className="pm-cancel-btn" onClick={onCancel}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
