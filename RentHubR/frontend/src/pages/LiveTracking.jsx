import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useLiveAgentTracking } from '../hooks/useLiveAgentTracking';

const SHOP_FALLBACK = { lat: 21.492298, lng: 86.902777 };

const STATUS_LABELS = {
    accepted: 'Agent is preparing your delivery',
    picked_up: 'Agent picked up your vehicle',
    out_for_delivery: 'Agent is on the way',
    returning: 'Agent is returning to shop',
    delivered: 'Delivered',
    assigned: 'Agent assigned — waiting for acceptance',
    pending: 'Waiting for agent'
};

const LiveTracking = () => {
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [booking, setBooking] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [waitingForGps, setWaitingForGps] = useState(false);
    const [eta, setEta] = useState({ duration: '--', distance: '--' });
    const [agentInfo, setAgentInfo] = useState({ full_name: 'Delivery Partner', mobile: '' });

    const markerRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    const destination = booking
        ? {
            lat: parseFloat(booking.lat) || SHOP_FALLBACK.lat,
            lng: parseFloat(booking.lng) || SHOP_FALLBACK.lng
        }
        : null;

    const fetchBookingDetails = useCallback(async () => {
        if (!bookingId) {
            setLoading(false);
            setError('No booking ID in the link. Open tracking from My Bookings or your email.');
            return;
        }
        try {
            const res = await fetch(`/api/trackBooking?id=${encodeURIComponent(bookingId)}`);
            const data = await res.json();

            if (!data.success || !data.booking) {
                setError(data.message || 'Booking not found');
                return;
            }

            setBooking(data.booking);

            if (data.agent) {
                setAgentInfo({
                    full_name: data.agent.full_name || 'Delivery Partner',
                    mobile: data.agent.mobile || ''
                });
                if (data.agent.current_lat != null) {
                    setAgentLocation({
                        lat: Number(data.agent.current_lat),
                        lng: Number(data.agent.current_lng)
                    });
                }
            }

            if (!data.booking.agent_id && data.booking.delivery_status?.startsWith('manual:')) {
                const parts = data.booking.delivery_status.split(':');
                setAgentInfo({
                    full_name: parts[1] || 'Manual Agent',
                    mobile: parts[2] || ''
                });
            } else if (!data.booking.agent_id) {
                setError('No delivery agent assigned yet. You will get a tracking link when an agent accepts.');
            } else if (!data.agent?.current_lat) {
                setWaitingForGps(true);
            }
        } catch {
            setError('Could not load booking. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        fetchBookingDetails();
    }, [fetchBookingDetails]);

    const animateMarker = useCallback((newPos) => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (!markerRef.current) {
            markerRef.current = new window.google.maps.Marker({
                position: newPos,
                map,
                icon: {
                    url: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
                    scaledSize: new window.google.maps.Size(45, 45),
                    anchor: new window.google.maps.Point(22, 22)
                },
                zIndex: 1000
            });
            return;
        }

        const startPos = markerRef.current.getPosition();
        const lat1 = startPos.lat() * (Math.PI / 180);
        const lon1 = startPos.lng() * (Math.PI / 180);
        const lat2 = newPos.lat * (Math.PI / 180);
        const lon2 = newPos.lng * (Math.PI / 180);
        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const heading = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
        const icon = markerRef.current.getIcon();
        icon.rotation = heading;
        markerRef.current.setIcon(icon);

        const frames = 45;
        let frame = 0;
        const deltaLat = (newPos.lat - startPos.lat()) / frames;
        const deltaLng = (newPos.lng - startPos.lng()) / frames;

        const step = () => {
            frame++;
            if (frame <= frames) {
                markerRef.current.setPosition(
                    new window.google.maps.LatLng(
                        startPos.lat() + deltaLat * frame,
                        startPos.lng() + deltaLng * frame
                    )
                );
                requestAnimationFrame(step);
            }
        };
        step();
    }, []);

    const updateRoute = useCallback((origin) => {
        if (!mapInstanceRef.current || !origin || !booking || !window.google) return;
        const dest = destination || SHOP_FALLBACK;
        const service = new window.google.maps.DirectionsService();
        service.route(
            { origin, destination: dest, travelMode: 'DRIVING' },
            (result, status) => {
                if (status === 'OK' && directionsRendererRef.current) {
                    directionsRendererRef.current.setDirections(result);
                    const leg = result.routes[0].legs[0];
                    setEta({ duration: leg.duration.text, distance: leg.distance.text });
                }
            }
        );
    }, [booking, destination]);

    useLiveAgentTracking(booking?.agent_id, {
        enabled: Boolean(booking?.agent_id && mapReady),
        onLocation: (loc) => {
            setWaitingForGps(false);
            setAgentLocation(loc);
            if (mapInstanceRef.current) {
                animateMarker(loc);
                updateRoute(loc);
            }
        },
        onAgentInfo: setAgentInfo
    });

    useEffect(() => {
        if (!booking || !window.google?.maps) return;

        const waitForMapEl = setInterval(() => {
            const el = document.getElementById('live-map');
            if (!el || mapInstanceRef.current) return;

            clearInterval(waitForMapEl);
            const dest = destination || SHOP_FALLBACK;

            const map = new window.google.maps.Map(el, {
                center: dest,
                zoom: 15,
                disableDefaultUI: true,
                styles: [
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] }
                ]
            });

            new window.google.maps.Marker({
                position: dest,
                map,
                title: 'Your location',
                icon: {
                    url: 'https://cdn-icons-png.flaticon.com/512/1239/1239525.png',
                    scaledSize: new window.google.maps.Size(40, 40)
                }
            });

            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#2563eb', strokeWeight: 6, strokeOpacity: 0.9 }
            });

            mapInstanceRef.current = map;
            setMapReady(true);

            if (agentLocation) {
                animateMarker(agentLocation);
                updateRoute(agentLocation);
            }
        }, 100);

        return () => clearInterval(waitForMapEl);
    }, [booking, destination, agentLocation, animateMarker, updateRoute]);

    const statusText = STATUS_LABELS[booking?.delivery_status] || 'Tracking your delivery';
    const badgeLabel = (booking?.delivery_status || 'active').replace(/_/g, ' ').toUpperCase();

    if (loading) {
        return (
            <div style={centerScreen}>
                <div className="loader" />
                <p style={{ marginTop: 20, fontWeight: 600, color: '#666' }}>Loading live tracking...</p>
            </div>
        );
    }

    if (error && !booking?.agent_id) {
        return (
            <div style={{ ...centerScreen, padding: 24 }}>
                <p style={{ color: '#b91c1c', fontWeight: 600, textAlign: 'center', maxWidth: 400 }}>{error}</p>
                <button type="button" onClick={() => window.history.back()} style={backBtnStyle}>Go back</button>
            </div>
        );
    }

    if (!supabase && booking?.agent_id) {
        return (
            <div style={{ ...centerScreen, padding: 24 }}>
                <p style={{ color: '#b91c1c', fontWeight: 600, textAlign: 'center' }}>
                    Live tracking needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the frontend .env file.
                </p>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', background: '#f0f0f0' }}>
            <div id="live-map" style={{ height: '100%', width: '100%' }} />

            <button type="button" onClick={() => window.history.back()} style={{ ...backBtnStyle, position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                ←
            </button>

            <div style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.85)', color: 'white', padding: '12px 25px', borderRadius: 50,
                display: 'flex', alignItems: 'center', gap: 12, zIndex: 10, maxWidth: '90%', textAlign: 'center'
            }}>
                <div className="pulse-dot" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {waitingForGps
                        ? 'Waiting for agent GPS — ask them to go Online in the agent app'
                        : eta.duration !== '--'
                            ? `Arriving in ${eta.duration}`
                            : statusText}
                </span>
            </div>

            {booking?.delivery_address && (
                <div style={{
                    position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
                    background: 'white', padding: '8px 16px', borderRadius: 12, fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxWidth: '85%', textAlign: 'center'
                }}>
                    📍 {booking.delivery_address}
                </div>
            )}

            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                width: '90%', maxWidth: 450, background: 'white', borderRadius: 24,
                padding: 25, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                            {eta.duration !== '--' ? eta.duration : 'On the way'}
                        </h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            {eta.distance !== '--' ? `${eta.distance} away` : statusText}
                        </p>
                    </div>
                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700 }}>
                        {badgeLabel}
                    </span>
                </div>

                <div style={{ height: 1, background: '#eee', marginBottom: 20 }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 55, height: 55, background: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="" style={{ width: '80%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>{agentInfo.full_name}</h4>
                        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.85rem' }}>Verified delivery partner</p>
                    </div>
                    {agentInfo.mobile && (
                        <a href={`tel:${agentInfo.mobile}`} style={{
                            width: 45, height: 45, background: '#000', color: 'white', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
                        }}>📞</a>
                    )}
                </div>

                {booking?.booking_id && (
                    <p style={{ marginTop: 16, fontSize: '0.75rem', color: '#999', textAlign: 'center' }}>
                        Booking {booking.booking_id}
                    </p>
                )}
            </div>

            <style>{`
                .pulse-dot { width: 10px; height: 10px; background: #2ecc71; border-radius: 50%; animation: pulse 2s infinite; flex-shrink: 0; }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(46,204,113,0.4); } 70% { box-shadow: 0 0 0 10px rgba(46,204,113,0); } 100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } }
                .loader { border: 4px solid #f3f3f3; border-top: 4px solid #000; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const centerScreen = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' };
const backBtnStyle = { width: 45, height: 45, borderRadius: '50%', background: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', fontWeight: 'bold' };

export default LiveTracking;
