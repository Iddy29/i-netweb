import { useState, useEffect, useRef, useCallback } from 'react';
import { subscriptionAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiX, HiPhone, HiCheck, HiExclamation, HiTicket,
  HiClock, HiShieldCheck,
} from 'react-icons/hi';

function formatPrice(price) {
  return `TZS ${Number(price || 0).toLocaleString()}`;
}

export default function SubscriptionModal({ onClose, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [step, setStep] = useState('plans'); // plans, waiting, success, failed
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchPlans();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await subscriptionAPI.getPlans();
      if (data.success) setPlans(data.data);
    } catch (err) {
      toast.error('Failed to load plans');
    }
  };

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    try {
      const { data } = await subscriptionAPI.validatePromo({
        code: promoCode.trim(),
        planId: selectedPlan?._id,
      });
      if (data.success) {
        setPromoResult({ valid: true, ...data.data });
      } else {
        setPromoResult({ valid: false, error: data.message || 'Invalid promo code' });
      }
    } catch (err) {
      setPromoResult({ valid: false, error: err.response?.data?.message || 'Invalid promo code' });
    } finally {
      setPromoValidating(false);
    }
  };

  const getDiscount = () => {
    if (!selectedPlan || !promoResult?.valid) return { discount: 0, final: selectedPlan?.price || 0 };
    const original = selectedPlan.price || 0;
    let disc = 0;
    if (promoResult.type === 'discount') disc = Math.round(original * (promoResult.discountPercent || 0) / 100);
    else if (promoResult.type === 'fixed') disc = promoResult.fixedAmount || 0;
    else if (promoResult.type === 'free_access') return { discount: original, final: 0, free: true };
    return { discount: disc, final: Math.max(0, original - disc) };
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return toast.error('Please select a plan');
    const isFree = promoResult?.valid && promoResult?.type === 'free_access';
    if (!isFree && !phone.trim()) return toast.error('Enter your phone number');

    setSubmitting(true);
    try {
      const payload = {
        planId: selectedPlan._id,
        phoneNumber: phone.trim(),
        name: name.trim() || undefined,
        promoCode: promoCode.trim() || undefined,
      };
      const { data } = await subscriptionAPI.subscribe(payload);
      if (data.success) {
        if (data.data?.free || data.data?.alreadySubscribed) {
          setStep('success');
          return;
        }
        const subId = data.data?.subscriptionId;
        if (subId) {
          setStep('waiting');
          startPolling(subId);
          startTimer();
        } else {
          setStep('success');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = useCallback((subId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await subscriptionAPI.checkPaymentStatus(subId);
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

  const { discount, final, free } = getDiscount();
  const isFreePromo = promoResult?.valid && promoResult?.type === 'free_access';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sub-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sub-header">
          <div className="sub-header-icon">
            <HiShieldCheck size={28} />
          </div>
          <div>
            <h2>Channel Subscription</h2>
            <p>Subscribe to unlock all live TV channels</p>
          </div>
          <button className="modal-close-btn-sm" onClick={onClose}><HiX size={18} /></button>
        </div>

        <div className="sub-body">
          {/* Plans */}
          {step === 'plans' && (
            <>
              <h4 className="sub-section-title">Choose a Plan</h4>
              {plans.length === 0 ? (
                <div className="sub-loading"><div className="loader-spinner" /></div>
              ) : (
                <div className="sub-plans">
                  {plans.map((plan) => {
                    const active = selectedPlan?._id === plan._id;
                    return (
                      <button
                        key={plan._id}
                        className={`sub-plan-card ${active ? 'active' : ''}`}
                        onClick={() => { setSelectedPlan(plan); setPromoResult(null); }}
                      >
                        <div className={`sub-plan-radio ${active ? 'checked' : ''}`}>
                          {active && <div className="sub-plan-radio-dot" />}
                        </div>
                        <div className="sub-plan-info">
                          <strong>{plan.name}</strong>
                          {plan.description && <span className="sub-plan-desc">{plan.description}</span>}
                          <span className="sub-plan-dur">
                            <HiClock size={12} />
                            {plan.durationType === 'weekly' ? '7 days' : plan.durationType === 'monthly' ? '30 days' : '365 days'}
                          </span>
                        </div>
                        <div className="sub-plan-price">
                          <strong>{formatPrice(plan.price)}</strong>
                          <span>/{plan.durationType?.replace('ly', '')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Promo Code */}
              <h4 className="sub-section-title" style={{ marginTop: 20 }}>Promo Code <span style={{ fontWeight: 400, color: 'var(--gray)' }}>(optional)</span></h4>
              <div className="sub-promo-row">
                <div className="sub-promo-input-wrap">
                  <HiTicket className="sub-promo-icon" />
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                </div>
                <button className="sub-promo-btn" onClick={handleValidatePromo} disabled={promoValidating}>
                  {promoValidating ? <span className="loader-spinner-sm" /> : 'Apply'}
                </button>
              </div>
              {promoResult && (
                <div className={`sub-promo-result ${promoResult.valid ? 'valid' : 'invalid'}`}>
                  {promoResult.valid ? <HiCheck size={16} /> : <HiExclamation size={16} />}
                  <span>
                    {promoResult.valid
                      ? promoResult.type === 'free_access'
                        ? `Free access for ${promoResult.freeAccessDays} days!`
                        : promoResult.type === 'discount'
                          ? `${promoResult.discountPercent}% off${selectedPlan ? ` — Save ${formatPrice(discount)}` : ''}!`
                          : `${formatPrice(promoResult.fixedAmount)} off!`
                      : promoResult.error || 'Invalid promo code'}
                  </span>
                </div>
              )}

              {/* Phone input (hidden if free promo) */}
              {!isFreePromo && (
                <>
                  <h4 className="sub-section-title" style={{ marginTop: 20 }}>Payment Details</h4>
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
                </>
              )}

              {/* Price Summary */}
              {selectedPlan && (
                <div className="sub-summary">
                  <div className="sub-summary-row">
                    <span>Plan</span>
                    <strong>{selectedPlan.name}</strong>
                  </div>
                  <div className="sub-summary-row">
                    <span>Price</span>
                    <strong className={discount > 0 && !free ? 'strikethrough' : ''}>
                      {formatPrice(selectedPlan.price)}
                    </strong>
                  </div>
                  {discount > 0 && !free && (
                    <>
                      <div className="sub-summary-row">
                        <span>Discount</span>
                        <strong className="text-success">
                          {promoResult.type === 'discount'
                            ? `-${promoResult.discountPercent}% (${formatPrice(discount)})`
                            : `-${formatPrice(discount)}`}
                        </strong>
                      </div>
                      <div className="sub-summary-divider" />
                      <div className="sub-summary-row total">
                        <span>Total to Pay</span>
                        <strong>{formatPrice(final)}</strong>
                      </div>
                    </>
                  )}
                  {free && (
                    <div className="sub-summary-row">
                      <span>Promo</span>
                      <strong className="text-success">FREE ({promoResult.freeAccessDays} days)</strong>
                    </div>
                  )}
                </div>
              )}

              <button
                className="pm-submit-btn"
                onClick={handleSubscribe}
                disabled={submitting || !selectedPlan}
                style={{ marginTop: 16 }}
              >
                {submitting ? (
                  <span className="loader-spinner-sm" />
                ) : isFreePromo ? (
                  'Activate Free Access'
                ) : discount > 0 ? (
                  `Pay ${formatPrice(final)}`
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </>
          )}

          {/* Waiting */}
          {step === 'waiting' && (
            <div className="pm-waiting">
              <div className="pm-phone-anim"><HiPhone size={40} /></div>
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

          {/* Success */}
          {step === 'success' && (
            <div className="pm-result pm-success">
              <div className="pm-result-icon success"><HiCheck size={40} /></div>
              <h3>Subscription Activated!</h3>
              <p>You now have access to all live TV channels. Enjoy!</p>
              <button className="pm-submit-btn" onClick={() => { onSuccess?.(); onClose(); }}>
                Start Watching
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
                <button className="pm-submit-btn" onClick={() => { setStep('plans'); setPhone(''); }}>
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
