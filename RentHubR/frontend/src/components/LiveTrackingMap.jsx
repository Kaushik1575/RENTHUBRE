import React, { useEffect, useState, useRef } from 'react';
import trackingService from '../services/trackingService';
import './LiveTrackingMap.css';

const SHOP_LOCATION = { lat: 21.492298, lng: 86.902777 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function GoogleMapsTracking({
    bookingId,
    agentId = null,
    pickupLocation = null,
    dropoffLocation = null,
    token = null,
    isAgent = false,
    onLocationUpdate = null
}) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerRef = useRef(null);
    const directionsRendererRef = useRef(null);
    
    const [agentLocation, setAgentLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [distance, setDistance] = useState(null);
    const [duration, setDuration] = useState(null);
    const [speed, setSpeed] = useState(null);

    // Initialize Google Map
    useEffect(() => {
        if (!window.google || !mapRef.current) return;

        const center = dropoffLocation 
            ? { lat: dropoffLocation.lat || dropoffLocation.latitude, lng: dropoffLocation.lng || dropoffLocation.longitude }
            : pickupLocation
            ? { lat: pickupLocation.lat || pickupLocation.latitude, lng: pickupLocation.lng || pickupLocation.longitude }
            : SHOP_LOCATION;

        const map = new window.google.maps.Map(mapRef.current, {
            center: center,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            fullscreenControl: true,
            styles: [
                { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#7c93a3" }] },
                { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }, { lightness: 100 }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#d2d2d2" }] }
            ]
        });

        // Add destination marker
        if (dropoffLocation) {
            new window.google.maps.Marker({
                position: { lat: dropoffLocation.lat || dropoffLocation.latitude, lng: dropoffLocation.lng || dropoffLocation.longitude },
                map: map,
                title: 'Destination',
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });
        }

        // Setup directions renderer
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#2563eb',
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        });

        mapInstance.current = map;
        setLoading(false);
    }, [mapRef]);

    // Setup tracking
    useEffect(() => {
        const initializeTracking = async () => {
            try {
                if (isAgent && token && agentId) {
                    // Agent sharing location
                    await trackingService.connect(token);
                    await trackingService.startLocationSharing(agentId, token);
                } else if (token && bookingId) {
                    // User tracking agent
                    await trackingService.connect(token);
                    const location = await trackingService.getBookingAgentLocation(bookingId, token);
                    if (location) {
                        setAgentLocation(location);
                        updateMapWithAgent(location);
                        const trackedAgentId = location.agent_id || location.agentId || agentId;
                        if (trackedAgentId) {
                            trackingService.startTracking(bookingId, null, trackedAgentId);
                        }
                    }
                }
            } catch (error) {
                console.error('Error initializing tracking:', error);
            }
        };

        initializeTracking();

        // Listen for location updates
        const handleLocationUpdate = (data) => {
            setAgentLocation(data);
            setSpeed(data.speed);
            updateMapWithAgent(data);
            calculateRoute(data);
            onLocationUpdate?.(data);
        };

        trackingService.on('location-update', handleLocationUpdate);

        return () => {
            trackingService.off('location-update', handleLocationUpdate);
        };
    }, [isAgent, token, bookingId]);

    const updateMapWithAgent = (location) => {
        if (!mapInstance.current) return;

        if (!markerRef.current) {
            markerRef.current = new window.google.maps.Marker({
                map: mapInstance.current,
                title: 'Agent Location',
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4F46E5',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2
                }
            });
        }

        markerRef.current.setPosition({
            lat: location.latitude,
            lng: location.longitude
        });

        mapInstance.current.panTo({
            lat: location.latitude,
            lng: location.longitude
        });
    };

    const calculateRoute = (agentLocation) => {
        if (!mapInstance.current || !dropoffLocation) return;

        const directionsService = new window.google.maps.DirectionsService();
        const origin = { lat: agentLocation.latitude, lng: agentLocation.longitude };
        const destination = { lat: dropoffLocation.lat || dropoffLocation.latitude, lng: dropoffLocation.lng || dropoffLocation.longitude };

        directionsService.route(
            {
                origin: origin,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    directionsRendererRef.current.setDirections(result);
                    const route = result.routes[0];
                    setDistance(route.legs[0].distance.text);
                    setDuration(route.legs[0].duration.text);
                } else {
                    console.error('Directions request failed:', status);
                }
            }
        );
    };

    if (loading) {
        return (
            <div className="tracking-loader">
                <div className="spinner"></div>
                <p>Loading map...</p>
            </div>
        );
    }

    return (
        <div className="google-maps-tracking-container">
            <div ref={mapRef} className="google-maps-container"></div>
            
            <div className="tracking-info-panel">
                <div className="info-header">
                    <h2>📍 Live Tracking</h2>
                </div>
                <div className="info-content">
                    {agentLocation && (
                        <>
                            <div className="info-row">
                                <span className="info-label">Agent Location:</span>
                                <span className="info-value">
                                    {agentLocation.latitude.toFixed(5)}, {agentLocation.longitude.toFixed(5)}
                                </span>
                            </div>
                            {speed && (
                                <div className="info-row">
                                    <span className="info-label">Speed:</span>
                                    <span className="info-value">{speed.toFixed(1)} km/h</span>
                                </div>
                            )}
                            {distance && (
                                <div className="info-row">
                                    <span className="info-label">Distance:</span>
                                    <span className="info-value">{distance}</span>
                                </div>
                            )}
                            {duration && (
                                <div className="info-row">
                                    <span className="info-label">ETA:</span>
                                    <span className="info-value">{duration}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

