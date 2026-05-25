import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

/**
 * Shown on mobile when GPS is not enabled — like Uber/Ola agent apps.
 * Must tap the button (user gesture) to trigger the browser permission dialog.
 */
export default function LocationPermissionBanner({ onEnable, loading, errorMessage }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <Navigation size={32} color="#0284c7" />
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>
          Turn on location
        </h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Customers see your live position on the map — same as Uber or Ola. Your phone will ask
          <strong> Allow location</strong>; tap <strong> Allow</strong> or <strong> While using the app</strong>.
        </p>

        {errorMessage && (
          <p
            style={{
              margin: '0 0 16px',
              padding: 12,
              background: '#fef2f2',
              color: '#b91c1c',
              borderRadius: 10,
              fontSize: '0.8rem',
              textAlign: 'left'
            }}
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={onEnable}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: loading ? '#94a3b8' : '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <MapPin size={20} />
          {loading ? 'Getting GPS…' : 'Enable GPS for live tracking'}
        </button>

        <p style={{ margin: '16px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          iPhone: Settings → Safari → Location → Allow. Android: Site settings → Location → Allow.
        </p>
      </div>
    </div>
  );
}
