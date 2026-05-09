import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Support.css';

export default function EQueryPortal() {
  const navigate = useNavigate();

  return (
    <div className="support-container">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="support-hero" style={{ marginBottom: '80px' }}>
        <div className="support-hero-icon">⚡</div>
        <h1 className="support-title">E-Query System</h1>
        <p className="support-subtitle">
          Welcome to RentHub's Digital Helpdesk. How can we assist you today?
        </p>
      </div>

      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        padding: '0 20px'
      }}>
        {/* Option 1: Support */}
        <div 
          className="glass-card" 
          onClick={() => navigate('/support')}
          style={{ 
            cursor: 'pointer', 
            padding: '40px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid transparent',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.transform = 'translateY(-15px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 40px 80px rgba(99, 102, 241, 0.15)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'var(--support-card-shadow)';
          }}
        >
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
            borderRadius: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '50px',
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)'
          }}>🛟</div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Raise a Ticket</h2>
          <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
            Experiencing an issue with your booking, payment, or vehicle? Submit a query to our support team.
          </p>
          <div style={{ 
            marginTop: '10px',
            padding: '12px 30px',
            background: '#f1f5f9',
            borderRadius: '50px',
            fontWeight: '800',
            color: '#6366f1',
            fontSize: '14px'
          }}>Get Started →</div>
        </div>

        {/* Option 2: Track */}
        <div 
          className="glass-card" 
          onClick={() => navigate('/track-issue')}
          style={{ 
            cursor: 'pointer', 
            padding: '40px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid transparent',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(-15px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 40px 80px rgba(16, 185, 129, 0.15)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'var(--support-card-shadow)';
          }}
        >
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            borderRadius: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '50px',
            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)'
          }}>🔍</div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Track Status</h2>
          <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
            Already have a Ticket ID? Enter it here to see real-time updates and responses from our team.
          </p>
          <div style={{ 
            marginTop: '10px',
            padding: '12px 30px',
            background: '#f0fdf4',
            borderRadius: '50px',
            fontWeight: '800',
            color: '#10b981',
            fontSize: '14px'
          }}>Check Status →</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <p style={{ color: '#94a3b8', fontWeight: '600' }}>
          Need urgent help? Visit our <span style={{ color: '#6366f1', cursor: 'pointer' }} onClick={() => navigate('/contact')}>Contact Page</span>
        </p>
      </div>
    </div>
  );
}
