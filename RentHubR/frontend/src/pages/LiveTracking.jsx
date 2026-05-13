import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LiveTracking = () => {
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [eta, setEta] = useState({ duration: '--', distance: '--' });
    const [agentInfo, setAgentInfo] = useState({ full_name: 'Delivery Partner', mobile: '' });

    const bookingId = searchParams.get('bookingId');
    const markerRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        } else {
            setLoading(false);
            setError('No Booking ID provided');
        }
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        try {
            const res = await fetch(`/api/trackBooking?id=${encodeURIComponent(bookingId)}`);
            const data = await res.json();

            if (data.success && data.booking) {
                setBooking(data.booking);
                if (!data.booking.agent_id) {
                    setError('No delivery agent assigned to this booking yet.');
                }
            } else {
                setError('Booking not found');
            }
        } catch (err) {
            setError('Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    };

    // 1. Initialize Map
    useEffect(() => {
        if (booking && window.google && !mapInstance) {
            const destination = { 
                lat: parseFloat(booking.lat) || 21.492298, 
                lng: parseFloat(booking.lng) || 86.902777 
            };

            const map = new window.google.maps.Map(document.getElementById('live-map'), {
                center: destination,
                zoom: 15,
                disableDefaultUI: true,
                styles: [
                    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }] },
                    { "featureType": "administrative.country", "elementType": "geometry", "stylers": [{ "visibility": "on" }] },
                    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
                    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#d2d2d2" }] }
                ]
            });

            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#2563eb', // Uber/Ola Blue
                    strokeWeight: 6,
                    strokeOpacity: 0.9
                }
            });

            // Home Marker
            new window.google.maps.Marker({
                position: destination,
                map: map,
                icon: {
                    url: 'https://cdn-icons-png.flaticon.com/512/1239/1239525.png',
                    scaledSize: new window.google.maps.Size(40, 40)
                }
            });

            setMapInstance(map);
        }
    }, [booking, mapInstance]);

    // 2. Real-time Subscription and Smooth Movement
    useEffect(() => {
        if (supabase && booking && booking.agent_id && mapInstance) {
            
            const fetchInitialLocation = async () => {
                const { data } = await supabase
                    .from('delivery_agents')
                    .select('current_lat, current_lng, last_active, full_name, mobile')
                    .eq('id', booking.agent_id)
                    .single();
                
                if (data) {
                    if (data.current_lat) {
                        const newLoc = { lat: data.current_lat, lng: data.current_lng };
                        setAgentLocation(newLoc);
                        animateMarker(newLoc);
                        updateRoute(newLoc);
                    }
                    setAgentInfo({ full_name: data.full_name, mobile: data.mobile });
                }
            };
            fetchInitialLocation();

            const channel = supabase
                .channel(`live_tracking_${booking.agent_id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'delivery_agents',
                    filter: `id=eq.${booking.agent_id}`
                }, (payload) => {
                    if (payload.new && payload.new.current_lat) {
                        const newLoc = { lat: payload.new.current_lat, lng: payload.new.current_lng };
                        animateMarker(newLoc);
                        setAgentLocation(newLoc);
                        updateRoute(newLoc);
                    }
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [booking, mapInstance]);

    const calculateHeading = (start, end) => {
        if (!start || !end) return 0;
        const lat1 = start.lat() * (Math.PI / 180);
        const lon1 = start.lng() * (Math.PI / 180);
        const lat2 = end.lat * (Math.PI / 180);
        const lon2 = end.lng * (Math.PI / 180);

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        
        let brng = Math.atan2(y, x) * (180 / Math.PI);
        return (brng + 360) % 360;
    };

    const animateMarker = (newPos) => {
        if (!markerRef.current) {
            markerRef.current = new window.google.maps.Marker({
                position: newPos,
                map: mapInstance,
                icon: {
                    url: 'https://cdn-icons-png.flaticon.com/512/744/744465.png', 
                    scaledSize: new window.google.maps.Size(45, 45),
                    anchor: new window.google.maps.Point(22, 22),
                    rotation: 0
                },
                zIndex: 1000
            });
            return;
        }

        const startPos = markerRef.current.getPosition();
        const heading = calculateHeading(startPos, newPos);
        
        // Update rotation instantly
        const icon = markerRef.current.getIcon();
        icon.rotation = heading;
        markerRef.current.setIcon(icon);

        const frames = 60;
        let frame = 0;

        const deltaLat = (newPos.lat - startPos.lat()) / frames;
        const deltaLng = (newPos.lng - startPos.lng()) / frames;

        const animate = () => {
            frame++;
            if (frame <= frames) {
                const nextPos = new window.google.maps.LatLng(
                    startPos.lat() + deltaLat * frame,
                    startPos.lng() + deltaLng * frame
                );
                markerRef.current.setPosition(nextPos);
                requestAnimationFrame(animate);
            }
        };
        animate();
    };

    const updateRoute = (origin) => {
        if (!mapInstance || !origin || !window.google) return;

        const destination = { 
            lat: parseFloat(booking.lat) || 21.492298, 
            lng: parseFloat(booking.lng) || 86.902777 
        };

        const service = new window.google.maps.DirectionsService();
        service.route({
            origin,
            destination,
            travelMode: 'DRIVING'
        }, (result, status) => {
            console.log('🗺️ Directions API Status:', status);
            if (status === 'OK') {
                directionsRendererRef.current.setDirections(result);
                const leg = result.routes[0].legs[0];
                setEta({
                    duration: leg.duration.text,
                    distance: leg.distance.text
                });
            } else {
                console.error('❌ Directions Request Failed:', status);
            }
        });
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <div className="loader"></div>
            <p style={{ marginTop: '20px', fontWeight: '600', color: '#666' }}>Initializing Secure Tracking...</p>
        </div>
    );

    return (
        <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', background: '#f0f0f0' }}>
            {/* The Fullscreen Map */}
            <div id="live-map" style={{ height: '100%', width: '100%' }}></div>

            {/* Back Button */}
            <button 
                onClick={() => window.history.back()}
                style={{
                    position: 'absolute', top: '20px', left: '20px', zIndex: 10,
                    width: '45px', height: '45px', borderRadius: '50%', background: 'white',
                    border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer'
                }}
            >
                <i className="fas fa-arrow-left"></i>
            </button>

            {/* Status Overlay (Top) */}
            <div style={{
                position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.85)', color: 'white', padding: '12px 25px', borderRadius: '50px',
                display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, backdropFilter: 'blur(5px)'
            }}>
                <div className="pulse-dot"></div>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Agent is arriving in {eta.duration}</span>
            </div>

            {/* Bottom Card (Uber Style) */}
            <div style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                width: '90%', maxWidth: '450px', background: 'white', borderRadius: '24px',
                padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>{eta.duration}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{eta.distance} away from you</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                            OUT FOR DELIVERY
                        </span>
                    </div>
                </div>

                <div style={{ height: '1px', background: '#eee', marginBottom: '20px' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '55px', height: '55px', background: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Agent" style={{ width: '80%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{agentInfo.full_name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f39c12', fontSize: '0.85rem' }}>
                            <i className="fas fa-star"></i> 4.9 • Verified
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a href={`tel:${agentInfo.mobile}`} style={{
                            width: '45px', height: '45px', background: '#000', color: 'white',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
                        }}>
                            <i className="fas fa-phone-alt"></i>
                        </a>
                        <button style={{
                            width: '45px', height: '45px', background: '#f0f0f0', color: '#333',
                            borderRadius: '50%', border: 'none', cursor: 'pointer'
                        }}>
                            <i className="fas fa-comment"></i>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .pulse-dot {
                    width: 10px; height: 10px; background: #2ecc71; border-radius: 50%;
                    box-shadow: 0 0 0 rgba(46, 204, 113, 0.4); animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
                }
                .loader {
                    border: 4px solid #f3f3f3; border-top: 4px solid #000;
                    border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default LiveTracking;
