import React, { useState, useEffect } from 'react';
import './CheckoutModal.css';
import { saveOrder } from '../../utils/orderStorage';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../Context/ToastContext';

const generateOrderNumber = () => `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

const CheckoutModal = ({ total, items, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState('form');
  const [orderNumber] = useState(generateOrderNumber);
  const [formData, setFormData] = useState({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        onClose();
        navigate('/');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose, navigate]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cardNumber') {
      value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    }
    if (name === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 3);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!formData.cardName.trim()) e.cardName = 'Required';
    if (formData.cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Enter a valid 16-digit card number';
    if (formData.expiry.length < 5) e.expiry = 'Enter MM/YY';
    if (formData.cvv.length < 3) e.cvv = 'Enter 3-digit CVV';
    return e;
  };

  const handlePay = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep('processing');
    setTimeout(() => {
      saveOrder({ id: orderNumber, date: new Date().toISOString(), items, total });
      setStep('success');
      onSuccess();
      showToast('Payment successful! Thank you for your order.', 'success');
    }, 2000);
  };

  return (
    <div className="checkout-overlay" onClick={step === 'success' ? onClose : undefined}>
      <div className="checkout-box" onClick={(e) => e.stopPropagation()}>

        {step === 'form' && (
          <>
            <div className="checkout-header">
              <h2>Secure Checkout</h2>
              <button className="checkout-close" onClick={onClose}>✕</button>
            </div>
            <p className="checkout-total">Amount to pay: <strong>LKR {total.toFixed(2)}</strong></p>
            <form onSubmit={handlePay} className="checkout-form">
              <div className="checkout-field">
                <label>Cardholder Name</label>
                <input name="cardName" placeholder="John Doe" value={formData.cardName} onChange={handleChange} />
                {errors.cardName && <span className="checkout-error">{errors.cardName}</span>}
              </div>
              <div className="checkout-field">
                <label>Card Number</label>
                <input name="cardNumber" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={handleChange} />
                {errors.cardNumber && <span className="checkout-error">{errors.cardNumber}</span>}
              </div>
              <div className="checkout-row">
                <div className="checkout-field">
                  <label>Expiry Date</label>
                  <input name="expiry" placeholder="MM/YY" value={formData.expiry} onChange={handleChange} />
                  {errors.expiry && <span className="checkout-error">{errors.expiry}</span>}
                </div>
                <div className="checkout-field">
                  <label>CVV</label>
                  <input name="cvv" placeholder="123" value={formData.cvv} onChange={handleChange} />
                  {errors.cvv && <span className="checkout-error">{errors.cvv}</span>}
                </div>
              </div>
              <button type="submit" className="checkout-pay-btn">Pay LKR {total.toFixed(2)}</button>
              <button type="button" className="checkout-cancel-btn" onClick={onClose}>Cancel</button>
            </form>
          </>
        )}

        {step === 'processing' && (
          <div className="checkout-processing">
            <div className="checkout-spinner"></div>
            <p>Processing your payment...</p>
            <small>Please do not close this window</small>
          </div>
        )}

        {step === 'success' && (
          <div className="checkout-success">
            <div className="checkout-success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p className="checkout-order">Order <strong>{orderNumber}</strong></p>
            <p>Thank you for shopping with <strong>OneStyle</strong>!</p>
            <p className="checkout-confirmation">Redirecting to home in a moment...</p>
            <button className="checkout-pay-btn" onClick={() => { onClose(); navigate('/'); }}>Continue Shopping</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
