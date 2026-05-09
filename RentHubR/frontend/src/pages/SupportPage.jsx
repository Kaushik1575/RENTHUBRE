import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import './Support.css';

// Using relative paths to be consistent with the rest of the app and leverage Vite proxy
const API_BASE = '/api/support';
const API_BOOKINGS = '/api/bookings';

// ─── Category & Subcategory Map ───────────────────────────────────────────────
const CATEGORIES = {
  'Refund': ['Advance Refund', 'Partial Refund', 'Full Refund', 'Refund Delay', 'Other'],
  'Booking Issue': ['Booking Not Confirmed', 'Wrong Vehicle Assigned', 'Cannot Cancel Booking', 'Booking Time Error', 'Other'],
  'Payment Issue': ['Payment Failed', 'Double Charged', 'Payment Not Reflected', 'Invoice Not Received', 'Other'],
  'Bike Issue': ['Vehicle Breakdown', 'Accident Report', 'Vehicle Condition Poor', 'Helmet Not Provided', 'Other'],
  'Profile Issue': ['Cannot Update Profile', 'Phone Number Change', 'Email Change', 'KYC Issue', 'Other'],
  'Other': ['General Inquiry', 'Feedback', 'Complaint', 'Suggestion', 'Other']
};

const REQUIRES_BOOKING_ID = ['Refund', 'Booking Issue', 'Payment Issue'];


export default function SupportPage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [issueId, setIssueId] = useState('');

  const [form, setForm] = useState({
    category: '',
    sub_category: '',
    booking_id: '',
    description: ''
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = React.useRef(null);
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showStatus = (type, title, message) => {
    setPopup({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserEmail(user.email || '');
        const params = new URLSearchParams(window.location.search);
        const bid = params.get('booking_id');
        if (bid) setForm(f => ({ ...f, booking_id: bid }));
      } catch (e) {}
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      const requiresBid = REQUIRES_BOOKING_ID.includes(value);
      setForm(f => ({ 
        ...f, 
        category: value, 
        sub_category: '',
        booking_id: requiresBid ? f.booking_id : '' 
      }));
      if (!requiresBid) setVerifiedBooking(null);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        showStatus('error', 'File Too Large', 'Maximum image size is 5MB');
        return;
      }
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCategorySelect = (cat) => {
    const requiresBid = REQUIRES_BOOKING_ID.includes(cat);
    setForm(f => ({ 
      ...f, 
      category: cat, 
      sub_category: '',
      booking_id: requiresBid ? f.booking_id : '' 
    }));
    if (!requiresBid) setVerifiedBooking(null);
  };

  const verifyBooking = async () => {
    if (!form.booking_id.trim()) {
      showStatus('error', 'Booking ID Required', 'Please enter a Booking ID first');
      return;
    }
    const token = localStorage.getItem('token');
    setVerifying(true);
    setVerifiedBooking(null);
    try {
      const res = await fetch(`${API_BOOKINGS}/${form.booking_id.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid Booking ID');
      
      setVerifiedBooking(data.booking);
      
      if (form.category === 'Refund') {
        if (data.booking.status === 'cancelled' || data.booking.status === 'rejected') {
          showStatus('success', 'Verification Successful', 'Booking verified and eligible for refund!');
        } else {
          showStatus('error', 'Ineligible for Refund', `This booking is currently "${data.booking.status}". Refunds are only for cancelled bookings.`);
        }
      } else {
        showStatus('success', 'Booking Verified', `Booking verified! Current status: ${data.booking.status}`);
      }
    } catch (err) {
      showStatus('error', 'Verification Failed', err.message);
    } finally {
      setVerifying(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.description.trim()) {
      showStatus('error', 'Missing Fields', 'Please fill all required fields');
      return;
    }
    if (REQUIRES_BOOKING_ID.includes(form.category) && !form.booking_id.trim()) {
      showStatus('error', 'Booking ID Required', `Booking ID is required for ${form.category}s`);
      return;
    }

    if (form.description.trim().length < 15) {
      showStatus('error', 'Description Too Short', 'Description must be at least 15 characters');
      return;
    }
    if (form.category === 'Refund') {
      if (!verifiedBooking) {
        showStatus('error', 'Verification Required', 'Please Verify your Booking ID before requesting a refund.');
        return;
      }
      if (verifiedBooking.status !== 'cancelled' && verifiedBooking.status !== 'rejected') {
        showStatus('error', 'Refund Blocked', `Submission blocked: Refunds are only available for "Cancelled" or "Rejected" bookings. This booking is "${verifiedBooking.status}".`);
        return;
      }
    }


    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('sub_category', form.sub_category);
      formData.append('booking_id', form.booking_id);
      formData.append('description', form.description);
      if (file) {
        formData.append('attachment', file);
      }

      const res = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setIssueId(data.issueId);
      setSubmitted(true);
      showStatus('success', 'Submission Successful', `Issue submitted! Your ID: ${data.issueId}`);
    } catch (err) {
      showStatus('error', 'Submission Failed', err.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm({ category: '', sub_category: '', booking_id: '', description: '' });
    setVerifiedBooking(null);
    setFile(null);
    setFilePreview(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="support-container">
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="glass-card success-card-premium" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔒</div>
          <h2 className="support-title" style={{ fontSize: '32px' }}>Access Locked</h2>
          <p className="support-subtitle" style={{ marginBottom: '32px' }}>
            To ensure your security and allow tracking of your queries, please sign in to your RentHub account.
          </p>
          <button 
            onClick={() => navigate('/login?redirect=/support')} 
            className="btn-premium-submit"
          >
            🔐 Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="support-container">
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="glass-card success-card-premium">
          <div className="success-lottie">🎉</div>
          <h2 className="support-title">Ticket Raised!</h2>
          <p className="support-subtitle">We've received your query and sent a confirmation to <strong>{userEmail}</strong></p>

          <div className="issue-id-container">
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Ticket Reference Number</span>
            <div style={{ fontSize: '36px', fontWeight: '950', color: '#1e1b4b', marginTop: '8px', letterSpacing: '1px' }}>{issueId}</div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', fontSize: '14px' }}>
              📂 <strong>{form.category}</strong>
            </div>
            <div style={{ background: '#f0fdf4', color: '#166534', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>
              ⏳ <strong>Under Review</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate(`/track-issue?id=${issueId}`)} className="btn-premium-submit" style={{ width: 'auto', padding: '16px 40px' }}>
              🔍 Track Status
            </button>
            <button onClick={resetForm} style={{ background: 'transparent', border: '2px solid #e2e8f0', padding: '16px 40px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>
              ➕ New Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-container">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="support-hero">
        <div className="support-hero-icon">🛟</div>
        <h1 className="support-title">E-Query Support</h1>

        <p className="support-subtitle">Experiencing an issue? We're here to help you get back on the road. Submit your query and track it in real-time.</p>
      </div>

      <div className="glass-card support-form-container">
        <div className="form-header-premium">
          <h2>📝 Raise a Ticket</h2>
          <p style={{ opacity: 0.9, fontSize: '14px' }}>Connected as <strong>{userEmail}</strong></p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
          {/* Category Pills */}
          <div className="premium-field">
            <label className="premium-label">Select Issue Category <span style={{ color: '#f43f5e' }}>*</span></label>
            <div className="category-pills">
              {Object.keys(CATEGORIES).map(cat => (
                <div 
                  key={cat} 
                  className={`category-pill ${form.category === cat ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {form.category === cat && <span style={{ fontSize: '14px' }}>✅</span>}
                  {cat}
                </div>
              ))}
            </div>
          </div>

          {/* Subcategory */}
          {form.category && (
            <div className="premium-field" style={{ animation: 'fadeIn 0.3s' }}>
              <label className="premium-label">Details / Sub-category</label>
              <div className="category-pills">
                {CATEGORIES[form.category]?.map(sub => (
                  <div 
                    key={sub} 
                    className={`category-pill ${form.sub_category === sub ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, sub_category: sub }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', padding: '10px' }}
                  >
                    {form.sub_category === sub && <span style={{ fontSize: '12px' }}>✅</span>}
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking ID */}
          {REQUIRES_BOOKING_ID.includes(form.category) && (
            <div className="premium-field" style={{ animation: 'fadeIn 0.3s' }}>
              <label className="premium-label">Booking ID <span style={{ color: '#f43f5e' }}>*</span></label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  name="booking_id"
                  value={form.booking_id}
                  onChange={handleChange}
                  placeholder="e.g. RH2024-001"
                  className="premium-input"
                  style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700 }}
                  required
                />
                <button 
                  type="button" 
                  onClick={verifyBooking} 
                  disabled={verifying}
                  style={{
                    padding: '0 24px',
                    borderRadius: '16px',
                    background: '#1e1b4b',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    cursor: verifying ? 'not-allowed' : 'pointer'
                  }}
                >
                  {verifying ? '...' : 'Verify'}
                </button>
              </div>

              {verifiedBooking && (
                <div style={{
                  marginTop: '16px', padding: '16px', borderRadius: '16px',
                  background: verifiedBooking.status === 'confirmed' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${verifiedBooking.status === 'confirmed' ? '#bbf7d0' : '#fecaca'}`,
                  display: 'flex', alignItems: 'center', gap: '16px', animation: 'slideDown 0.3s'
                }}>
                  <div style={{ fontSize: '24px' }}>{verifiedBooking.status === 'confirmed' ? '✅' : '⚠️'}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
                      Booking Found: <span style={{ color: verifiedBooking.status === 'confirmed' ? '#166534' : '#991b1b' }}>{verifiedBooking.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{verifiedBooking.vehicle_type?.toUpperCase()} | {new Date(verifiedBooking.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="premium-field">
            <label className="premium-label">Describe your issue <span style={{ color: '#f43f5e' }}>*</span></label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Tell us what happened. Be as detailed as possible..."
              className="premium-textarea"
              required
            />
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right', marginTop: '8px', fontWeight: 600 }}>
              {form.description.length}/1000 characters
            </div>
          </div>

          {/* Image Upload */}
          <div className="premium-field">
            <label className="premium-label">Attach Image <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>(Optional, Max 5MB)</span></label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
            />
            
            {!filePreview ? (
              <div 
                onClick={() => fileInputRef.current.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'all 0.3s'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                <div style={{ fontWeight: 700, color: '#475569', fontSize: '14px' }}>Click to upload screenshot</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>PNG, JPG or WEBP</div>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '2px solid #6366f1' }}>
                <img src={filePreview} alt="Preview" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.3s'
                }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0}>
                  <button 
                    type="button" 
                    onClick={removeFile}
                    style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '50px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🗑️ Remove Image
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  ✅ {file?.name.substring(0, 20)}...
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-premium-submit">
            {loading ? (
              <>
                <div className="spinner-small" /> Submitting...
              </>
            ) : (
              <>🚀 Send Request & Get ID</>
            )}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '40px' }}>
        <button onClick={() => navigate('/track-issue')} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '50px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>
          🔍 Track Existing Issue
        </button>
        <button onClick={() => navigate('/my-bookings')} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '50px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>
          📋 My Bookings
        </button>
      </div>

      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .spinner-small {
          width: 20px; height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
