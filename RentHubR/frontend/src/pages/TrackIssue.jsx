import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import './Support.css';

// Use relative paths to leverage Vite proxy and stay consistent
const API_BASE = '/api/support';

const STATUS_STEPS = ['Pending', 'In Progress', 'Resolved'];
const STATUS_CONFIG = {
  'Pending': { icon: '⏳', color: '#854d0e', bg: '#fefce8' },
  'In Progress': { icon: '🔄', color: '#1e40af', bg: '#eff6ff' },
  'Resolved': { icon: '✅', color: '#166534', bg: '#f0fdf4' }
};

export default function TrackIssue() {
  const navigate = useNavigate();
  const [inputId, setInputId] = useState('');
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
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
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setInputId(id);
      fetchIssue(id);
    }
  }, []);

  const fetchIssue = async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setError('');
    setIssue(null);
    try {
      const res = await fetch(`${API_BASE}/track/${id.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Issue not found');
      setIssue(data.issue);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputId.trim()) {
      showStatus('error', 'Issue ID Required', 'Please enter an Issue ID');
      return;
    }
    fetchIssue(inputId);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const currentStepIndex = issue ? STATUS_STEPS.indexOf(issue.status) : 0;

  return (
    <div className="support-container">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Hero */}
      <div className="support-hero">
        <div className="support-hero-icon">🔍</div>
        <h1 className="support-title">E-Query Tracker</h1>

        <p className="support-subtitle">Get real-time updates on your support request. Enter your unique Ticket ID below.</p>
      </div>

      {/* Search Box */}
      <div className="track-search-container">
        <form onSubmit={handleSearch} className="track-input-group">
          <input
            type="text"
            value={inputId}
            onChange={e => setInputId(e.target.value.toUpperCase())}
            placeholder="RH1702456..."
            className="track-input"
            maxLength={20}
          />
          <button type="submit" disabled={loading} className="btn-track-go">
            {loading ? '...' : 'Track'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto 40px', padding: '32px', textAlign: 'center', background: '#fff5f5' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>😔</div>
          <h3 style={{ margin: '0 0 8px', color: '#991b1b', fontWeight: 800 }}>Ticket Not Found</h3>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Issue Details */}
      {issue && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Ticket ID</span>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e1b4b' }}>{issue.issue_id}</div>
              </div>
              <div style={{ background: STATUS_CONFIG[issue.status]?.bg, color: STATUS_CONFIG[issue.status]?.color, padding: '10px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '14px' }}>
                {STATUS_CONFIG[issue.status]?.icon} {issue.status}
              </div>
            </div>
          </div>

          <div style={{ padding: '40px' }}>
            {/* Professional Stepper */}
            <div className="status-stepper">
              {STATUS_STEPS.map((step, i) => {
                const isActive = i === currentStepIndex;
                const isCompleted = i < currentStepIndex;
                return (
                  <div key={step} className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="step-circle">
                      {isCompleted ? '✓' : i + 1}
                    </div>
                    <div className="step-label">{step}</div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className="step-line">
                        <div className="step-line-fill" style={{ width: isCompleted ? '100%' : '0%' }}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div style={detailBoxStyle}>
                <span style={detailLabelStyle}>📂 Category</span>
                <div style={detailValueStyle}>{issue.category}</div>
              </div>
              <div style={detailBoxStyle}>
                <span style={detailLabelStyle}>📅 Submitted</span>
                <div style={detailValueStyle}>{formatDate(issue.created_at)}</div>
              </div>
              {issue.booking_id && (
                <div style={detailBoxStyle}>
                  <span style={detailLabelStyle}>🎟️ Booking ID</span>
                  <div style={detailValueStyle}>{issue.booking_id}</div>
                </div>
              )}
            </div>

            {/* Message Thread */}
            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '30px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '24px' }}>
                <span style={detailLabelStyle}>Your Query</span>
                <p style={{ margin: '8px 0 0', color: '#1e293b', lineHeight: 1.6 }}>{issue.description}</p>
                
                {issue.attachment_url && (
                  <div style={{ marginTop: '16px' }}>
                    <span style={detailLabelStyle}>📎 Attachment</span>
                    <a 
                      href={issue.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-block', marginTop: '8px', position: 'relative',
                        borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1'
                      }}
                    >
                      <img 
                        src={issue.attachment_url} 
                        alt="Attachment" 
                        style={{ maxWidth: '200px', maxHeight: '150px', display: 'block', objectFit: 'cover' }} 
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, 
                        background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px',
                        textAlign: 'center', padding: '4px', fontWeight: 700
                      }}>Click to View Full</div>
                    </a>
                  </div>
                )}
              </div>

              {issue.admin_reply ? (
                <div style={{ marginTop: '24px', padding: '24px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>🛡️</div>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#1e1b4b' }}>Support Response</span>
                  </div>
                  <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>{issue.admin_reply}</p>
                </div>
              ) : (
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center', color: '#92400e', background: '#fffbeb', padding: '16px', borderRadius: '12px' }}>
                  <span>⏳</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>We are reviewing your request. Please check back in 24 hours.</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => navigate('/support')} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>
              + New Support Ticket
            </button>
            <button onClick={() => { setIssue(null); setInputId(''); }} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 20px', borderRadius: '50px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
              Track Another
            </button>
          </div>
        </div>
      )}

      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />
    </div>
  );
}

const detailBoxStyle = {
  background: 'white',
  padding: '16px 20px',
  borderRadius: '16px',
  border: '1px solid #e2e8f0'
};

const detailLabelStyle = {
  fontSize: '11px',
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  display: 'block',
  marginBottom: '4px'
};

const detailValueStyle = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#1e293b'
};
