import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SOSActivate.css';

const SOSActivate = () => {
    const [searchParams] = useSearchParams();
    const sosToken = searchParams.get('token');
    const bookingId = searchParams.get('bookingId');

    const [status, setStatus] = useState('loading'); // loading, ready, activating, success, error
    const [message, setMessage] = useState('');
    const [locationStats, setLocationStats] = useState('');

    useEffect(() => {
        if (!sosToken || !bookingId) {
            setStatus('error');
            setMessage('Invalid link. Missing token or booking ID.');
        } else {
            setStatus('ready');
        }
    }, [sosToken, bookingId]);

    const activateSOS = async () => {
        setStatus('activating');
        setMessage('Requesting location access... Please click "Allow" if prompted.');

        // 1. Try to get GPS with a reasonable timeout
        try {
            if (navigator.geolocation) {
                const getPosition = new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            resolve(position);
                        },
                        (error) => {
                            reject(error);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 0
                        }
                    );
                });

                const safetyTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Location request timed out completely")), 16000)
                );

                const position = await Promise.race([getPosition, safetyTimeout]);

                const gpsLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                setLocationStats(`Location acquired (Accuracy: ${Math.round(position.coords.accuracy)}m)`);
                sendSOS(gpsLocation);

            } else {
                throw new Error("Geolocation not supported by this browser.");
            }
        } catch (e) {
            console.warn("GPS failed", e);
            let errorMsg = "Could not access location.";
            if (e.code === 1) errorMsg = "Location permission was denied.";
            if (e.code === 2) errorMsg = "Location signal unavailable.";
            if (e.code === 3 || (e.message && e.message.includes('time'))) errorMsg = "Location request timed out.";

            setMessage(errorMsg);
            setStatus('location_error');
        }
    };

    const sendSOS = async (gpsLocation) => {
        setStatus('activating');
        setMessage('Sending SOS alert...');
        if (!gpsLocation) {
            setLocationStats("User skipped location check.");
        }

        try {
            const res = await fetch('/api/sos-activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: sosToken,
                    bookingId: bookingId,
                    gpsLocation
                })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus('success');
            } else {
                throw new Error(data.error || 'Failed to activate SOS');
            }
        } catch (err) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="sos-container">
            <div className="sos-card">
                <div className="sos-icon-wrapper">
                    <i className="fas fa-exclamation-triangle sos-icon"></i>
                </div>

                <h1 className="sos-title">SOS Activation</h1>
                <p className="sos-description">
                    Press the button below only in case of an emergency. Help will be dispatched to your location.
                </p>

                {status === 'loading' && (
                    <div className="loading-wrapper">
                        <div className="spinner"></div>
                        <p className="loading-text">Verifying details...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="status-box status-error">
                        <span className="status-title">Error</span>
                        <p>{message}</p>
                    </div>
                )}

                {status === 'location_error' && (
                    <div className="status-box status-warning">
                        <span className="status-title">Location Needed</span>
                        <p>{message}</p>
                        <p style={{ marginTop: '8px', opacity: 0.8 }}>For precise assistance, please enable location.</p>

                        <div className="secondary-actions">
                            <button className="btn-secondary" onClick={activateSOS}>
                                ⟳ Retry Permission
                            </button>
                            <button className="btn-secondary" onClick={() => sendSOS(null)} style={{ background: 'rgba(255,255,255,0.2)' }}>
                                Send Without Location &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {status === 'ready' && (
                    <>
                        {bookingId && (
                            <div className="booking-info">
                                <i className="fas fa-ticket-alt"></i>
                                <span>Booking ID: <strong>{bookingId}</strong></span>
                            </div>
                        )}

                        <div className="status-box status-warning">
                            <span className="status-title">⚠️ Warning</span>
                            <p>This will alert our emergency response team immediately.</p>
                        </div>

                        <button className="sos-button" onClick={activateSOS}>
                            <i className="fas fa-phone-alt"></i> Initiate Emergency Alert
                        </button>
                    </>
                )}

                {status === 'activating' && (
                    <div className="loading-wrapper">
                        <div className="spinner"></div>
                        <p className="loading-text">{message}</p>
                        {locationStats && <small style={{ display: 'block', marginTop: '5px', opacity: 0.6 }}>{locationStats}</small>}
                    </div>
                )}

                {status === 'success' && (
                    <div className="status-box status-success">
                        <span className="status-title">✓ SOS Activated</span>
                        <p>Our team has received your emergency alert. We are contacting you at your registered number now.</p>
                        {locationStats && <small style={{ display: 'block', marginTop: '10px', opacity: 0.7 }}>{locationStats}</small>}

                        <a href="tel:9040757683" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
                            <button className="sos-button" style={{ marginTop: '20px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
                                <i className="fas fa-phone"></i> Call Support Now
                            </button>
                        </a>

                        <button className="btn-outline" onClick={() => window.location.href = '/'}>
                            Return to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SOSActivate;
