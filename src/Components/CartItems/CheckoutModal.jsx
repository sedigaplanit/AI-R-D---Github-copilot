import React, { useState, useEffect } from 'react';
import './CheckoutModal.css';
import api from '../../api/apiClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../Context/ToastContext';

const generateOrderNumber = () => `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

const PAYMENT_METHODS = [
  { id: 'card',   label: 'Credit / Debit Card', icon: '💳' },
  { id: 'paypal', label: 'PayPal',               icon: '🅿️' },
  { id: 'cod',    label: 'Cash on Delivery',     icon: '💵' },
];

const CheckoutModal = ({ total, items, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState('method');           // method → form → processing → success
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderNumber] = useState(generateOrderNumber);
  const [cardData, setCardData] = useState({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
  const [codData, setCodData]   = useState({ address: '', city: '', phone: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => { onClose(); navigate('/'); }, 6000);
      return () => clearTimeout(timer);
    }
  }, [step, onClose, navigate]);

  // ── Card field change ────────────────────────────────────────────────────────
  const handleCardChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cardNumber') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    if (name === 'expiry') { value = value.replace(/\D/g, '').slice(0, 4); if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2); }
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 3);
    setCardData((p) => ({ ...p, [name]: value }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (paymentMethod === 'card') {
      if (!cardData.cardName.trim()) e.cardName = 'Required';
      if (cardData.cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Enter a valid 16-digit card number';
      if (cardData.expiry.length < 5) e.expiry = 'Enter MM/YY';
      if (cardData.cvv.length < 3) e.cvv = 'Enter 3-digit CVV';
    }
    if (paymentMethod === 'cod') {
      if (!codData.address.trim()) e.address = 'Required';
      if (!codData.city.trim()) e.city = 'Required';
      if (!codData.phone.trim()) e.phone = 'Required';
    }
    return e;
  };

  // ── Submit payment ───────────────────────────────────────────────────────────
  const handlePay = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep('processing');
    setTimeout(async () => {
      try {
        await api('/api/orders', {
          method: 'POST',
          body: { id: orderNumber, date: new Date().toISOString(), items, total },
        });
      } catch (err) {
        console.error('Failed to save order:', err.message);
      }
      setStep('success');
      onSuccess();
      showToast(`Order ${orderNumber} placed successfully!`, 'success');
    }, 2000);
  };

  return (
    <div className="checkout-overlay" onClick={step === 'success' ? undefined : undefined}>
      <div className="checkout-box" onClick={(e) => e.stopPropagation()}>

        {/* ── Step 1: Choose payment method ── */}
        {step === 'method' && (
          <>
            <div className="checkout-header">
              <h2>Checkout</h2>
              <button className="checkout-close" onClick={onClose}>✕</button>
            </div>
            <p className="checkout-total">Total: <strong>LKR {total.toFixed(2)}</strong></p>
            <p className="checkout-section-label">Select Payment Method</p>
            <div className="checkout-methods">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.id} className={`checkout-method-card ${paymentMethod === m.id ? 'selected' : ''}`}>
                  <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} />
                  <span className="checkout-method-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
            <button className="checkout-pay-btn" onClick={() => setStep('form')}>Continue →</button>
            <button className="checkout-cancel-btn" onClick={onClose}>Cancel</button>
          </>
        )}

        {/* ── Step 2: Payment form ── */}
        {step === 'form' && (
          <>
            <div className="checkout-header">
              <h2>{PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.icon} {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}</h2>
              <button className="checkout-close" onClick={() => setStep('method')}>←</button>
            </div>
            <p className="checkout-total">Amount to pay: <strong>LKR {total.toFixed(2)}</strong></p>

            <form onSubmit={handlePay} className="checkout-form">
              {paymentMethod === 'card' && (
                <>
                  <div className="checkout-field">
                    <label>Cardholder Name</label>
                    <input name="cardName" placeholder="John Doe" value={cardData.cardName} onChange={handleCardChange} />
                    {errors.cardName && <span className="checkout-error">{errors.cardName}</span>}
                  </div>
                  <div className="checkout-field">
                    <label>Card Number</label>
                    <input name="cardNumber" placeholder="1234 5678 9012 3456" value={cardData.cardNumber} onChange={handleCardChange} />
                    {errors.cardNumber && <span className="checkout-error">{errors.cardNumber}</span>}
                  </div>
                  <div className="checkout-row">
                    <div className="checkout-field">
                      <label>Expiry Date</label>
                      <input name="expiry" placeholder="MM/YY" value={cardData.expiry} onChange={handleCardChange} />
                      {errors.expiry && <span className="checkout-error">{errors.expiry}</span>}
                    </div>
                    <div className="checkout-field">
                      <label>CVV</label>
                      <input name="cvv" placeholder="123" value={cardData.cvv} onChange={handleCardChange} />
                      {errors.cvv && <span className="checkout-error">{errors.cvv}</span>}
                    </div>
                  </div>
                </>
              )}

              {paymentMethod === 'paypal' && (
                <div className="checkout-paypal">
                  <p>You will be redirected to PayPal to complete your payment securely.</p>
                  <p className="checkout-paypal-amount">LKR {total.toFixed(2)}</p>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <>
                  <div className="checkout-field">
                    <label>Delivery Address</label>
                    <input name="address" placeholder="No. 12, Main Street" value={codData.address} onChange={(e) => setCodData((p) => ({ ...p, address: e.target.value }))} />
                    {errors.address && <span className="checkout-error">{errors.address}</span>}
                  </div>
                  <div className="checkout-row">
                    <div className="checkout-field">
                      <label>City</label>
                      <input name="city" placeholder="Colombo" value={codData.city} onChange={(e) => setCodData((p) => ({ ...p, city: e.target.value }))} />
                      {errors.city && <span className="checkout-error">{errors.city}</span>}
                    </div>
                    <div className="checkout-field">
                      <label>Phone</label>
                      <input name="phone" placeholder="+94 77 000 0000" value={codData.phone} onChange={(e) => setCodData((p) => ({ ...p, phone: e.target.value }))} />
                      {errors.phone && <span className="checkout-error">{errors.phone}</span>}
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="checkout-pay-btn">
                {paymentMethod === 'card' ? `Pay LKR ${total.toFixed(2)}` : paymentMethod === 'paypal' ? 'Proceed to PayPal' : 'Confirm Order'}
              </button>
              <button type="button" className="checkout-cancel-btn" onClick={() => setStep('method')}>← Back</button>
            </form>
          </>
        )}

        {/* ── Step 3: Processing ── */}
        {step === 'processing' && (
          <div className="checkout-processing">
            <div className="checkout-spinner"></div>
            <p>Processing your payment...</p>
            <small>Please do not close this window</small>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 'success' && (
          <div className="checkout-success">
            <div className="checkout-success-icon">✓</div>
            <h2>Order Placed Successfully!</h2>
            <div className="checkout-order-number">
              <span className="checkout-order-label">Order Number</span>
              <strong className="checkout-order-id">{orderNumber}</strong>
            </div>
            <p>Thank you for shopping with <strong>OneStyle</strong>!</p>
            <p className="checkout-confirmation">This page will redirect in a few seconds...</p>
            <div className="checkout-success-actions">
              <button className="checkout-pay-btn" onClick={() => { onClose(); navigate('/orders'); }}>View My Orders</button>
              <button className="checkout-cancel-btn" onClick={() => { onClose(); navigate('/'); }}>Continue Shopping</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
