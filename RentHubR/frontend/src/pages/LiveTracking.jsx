import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LiveTracking = () => {
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const bookingId = searchParams.get('bookingId');

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

    const [map, setMap] = useState(null);
    const [agentMarker, setAgentMarker] = useState(null);
    const [pathPolyline, setPathPolyline] = useState(null);

    const SHOP_LOCATION = { lat: 21.4919493, lng: 86.9026929 };

    // 1. Initialize Map and Draw Path as soon as Booking is loaded
    useEffect(() => {
        if (booking && window.google && !map) {
            console.log("Initializing Map for Booking:", booking.booking_id);
            
            const destination = { 
                lat: parseFloat(booking.lat) || 21.4433, 
                lng: parseFloat(booking.lng) || 87.0234 
            };

            const mapInstance = new window.google.maps.Map(document.getElementById('live-map'), {
                center: destination,
                zoom: 12,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                ]
            });

            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                map: mapInstance,
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#2563eb', strokeWeight: 6, strokeOpacity: 0.7 }
            });

            directionsService.route({
                origin: SHOP_LOCATION,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING
            }, (result, status) => {
                const bounds = new window.google.maps.LatLngBounds();
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    result.routes[0].overview_path.forEach(p => bounds.extend(p));
                } else {
                    // Fallback Polyline
                    const poly = new window.google.maps.Polyline({
                        path: [SHOP_LOCATION, destination],
                        strokeColor: '#2563eb',
                        strokeOpacity: 0.6,
                        strokeWeight: 5,
                        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }],
                        map: mapInstance
                    });
                    setPathPolyline(poly);
                    bounds.extend(SHOP_LOCATION);
                    bounds.extend(destination);
                }
                mapInstance.fitBounds(bounds);
            });

            // Add Shop Marker
            new window.google.maps.Marker({
                position: SHOP_LOCATION, map: mapInstance, label: { text: 'S', color: 'white' }, title: 'Shop'
            });

            // Add Home Marker
            new window.google.maps.Marker({
                position: destination, map: mapInstance,
                icon: { url: 'https://maps.google.com/mapfiles/kml/pal2/icon10.png', scaledSize: new window.google.maps.Size(35, 35) }
            });

            setMap(mapInstance);
        }
    }, [booking, map]);

    // 2. Add/Update Agent Marker whenever Location arrives
    useEffect(() => {
        if (map && agentLocation && window.google) {
            const pos = { lat: agentLocation.lat, lng: agentLocation.lng };
            
            if (!agentMarker) {
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map: map,
                    zIndex: 999,
                    optimized: false,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/kml/pal2/icon47.png', // Car Icon
                        scaledSize: new window.google.maps.Size(50, 50),
                        anchor: new window.google.maps.Point(25, 25)
                    }
                });
                setAgentMarker(marker);
            } else {
                // Smooth move the marker without refresh
                agentMarker.setPosition(pos);
            }
        }
    }, [map, agentLocation, agentMarker]);

    // Live Agent Tracking Logic
    useEffect(() => {
        if (supabase && booking && booking.agent_id && ['accepted', 'picked_up', 'out_for_delivery'].includes(booking.delivery_status)) {
            
            const fetchInitialLocation = async () => {
                const { data } = await supabase
                    .from('delivery_agents')
                    .select('current_lat, current_lng, last_active, full_name, mobile')
                    .eq('id', booking.agent_id)
                    .single();
                
                if (data && data.current_lat) {
                    setAgentLocation({
                        lat: data.current_lat,
                        lng: data.current_lng,
                        lastUpdated: data.last_active,
                        name: data.full_name,
                        phone: data.mobile
                    });
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
                        setAgentLocation(prev => ({
                            ...prev,
                            lat: payload.new.current_lat,
                            lng: payload.new.current_lng,
                            lastUpdated: payload.new.last_active
                        }));
                    }
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [booking]);

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Initializing Live Tracking...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#e74c3c', marginRight: '10px' }}></i>
                Live Delivery Tracking
            </h2>

            {error && (
                <div style={{ padding: '15px', background: '#fff5f5', color: '#c53030', borderRadius: '8px', border: '1px solid #feb2b2', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {booking && (
                <div style={{ background: 'white', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '20px' }}>
                    {/* Header Info */}
                    <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Booking ID</span>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{booking.booking_id}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ 
                                    padding: '5px 12px', background: '#e3f2fd', color: '#1976d2', 
                                    borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' 
                                }}>
                                    {booking.delivery_status?.toUpperCase().replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Map Section - Google Maps App Style */}
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        {console.log("Rendering Tracking UI with Overlays")}
                        
                        {/* Top Instruction Bar (Google Maps Style) */}
                        <div style={{
                            position: 'absolute', top: '10px', left: '10px', right: '10px',
                            background: '#0d6254', color: 'white', padding: '12px 20px',
                            borderRadius: '12px', zIndex: 999, display: 'flex', alignItems: 'center', gap: '15px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}>
                            <i className="fas fa-arrow-up" style={{ fontSize: '1.4rem' }}></i>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Arriving at your location</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Agent is on the way</div>
                            </div>
                            <div style={{ width: '35px', height: '35px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-microphone"></i>
                            </div>
                        </div>

                        {/* The Actual Map */}
                        <div id="live-map" style={{ height: '450px', background: '#eee' }}>
                            {!window.google && (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    Loading Google Maps...
                                </div>
                            )}
                        </div>

                        {/* Floating Re-centre Button */}
                        <div style={{ position: 'absolute', bottom: '120px', left: '15px', zIndex: 999 }}>
                            <button 
                                onClick={() => map && agentLocation && map.panTo({ lat: agentLocation.lat, lng: agentLocation.lng })}
                                style={{
                                    background: 'white', border: 'none', padding: '8px 15px', borderRadius: '30px',
                                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0d6254',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-location-arrow"></i> Re-centre
                            </button>
                        </div>

                        {/* Bottom Summary Bar (Google Maps Style) */}
                        <div style={{
                            position: 'absolute', bottom: '0', left: '0', right: '0',
                            background: 'white', padding: '15px 20px', zIndex: 999,
                            borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            boxShadow: '0 -4px 15px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e67e22' }}>
                                    {(() => {
                                        const dest = { lat: parseFloat(booking.lat) || 21.4433, lng: parseFloat(booking.lng) || 87.0234 };
                                        const dist = agentLocation ? Math.sqrt(Math.pow(agentLocation.lat - dest.lat, 2) + Math.pow(agentLocation.lng - dest.lng, 2)) * 111 : 0;
                                        const time = Math.round((dist / 30) * 60) + 2;
                                        return time < 1 ? '1' : time;
                                    })()}
                                </span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e67e22' }}>min</span>
                                <span style={{ color: '#666', marginLeft: '10px' }}>
                                    {(() => {
                                        const dest = { lat: parseFloat(booking.lat) || 21.4433, lng: parseFloat(booking.lng) || 87.0234 };
                                        const dist = agentLocation ? Math.sqrt(Math.pow(agentLocation.lat - dest.lat, 2) + Math.pow(agentLocation.lng - dest.lng, 2)) * 111 : 0;
                                        return dist.toFixed(1);
                                    })()} km
                                </span>
                            </div>
                            <div style={{ width: '45px', height: '45px', border: '2px solid #eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-times" style={{ color: '#666' }}></i>
                            </div>
                        </div>
                    </div>

                    {/* Agent Details (Conditional) */}
                    {agentLocation && (
                        <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '50px', height: '50px', background: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-user-tie" style={{ fontSize: '1.5rem' }}></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{agentLocation.name || 'Delivery Partner'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Your assigned delivery expert</div>
                                </div>
                                {agentLocation.phone && (
                                    <a href={`tel:${agentLocation.phone}`} style={{ 
                                        width: '45px', height: '45px', background: '#2ecc71', color: 'white', 
                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        textDecoration: 'none'
                                    }}>
                                        <i className="fas fa-phone-alt"></i>
                                    </a>
                                )}
                            </div>
                            
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#999' }}>
                                    <i className="far fa-clock"></i> Last updated: {new Date(agentLocation.lastUpdated).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!agentLocation && !error && booking && (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '15px' }}>
                    <i className="fas fa-clock" style={{ fontSize: '3rem', color: '#bdc3c7', marginBottom: '20px' }}></i>
                    <h3>Waiting for Agent to Start</h3>
                    <p style={{ color: '#7f8c8d' }}>Once the agent picks up your vehicle, the live map will appear here.</p>
                </div>
            )}

            <style>{`
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #d32f2f;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
                }
            `}</style>
        </div>
    );
};

export default LiveTracking;
