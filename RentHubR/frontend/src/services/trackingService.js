import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3005';

class TrackingService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.agentLocations = new Map();
        this.geolocationWatchId = null;
    }

    // Connect to WebSocket
    connect(token) {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(WS_URL, {
                    auth: { token },
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                    transports: ['websocket', 'polling']
                });

                this.socket.on('connect', () => {
                    console.log('WebSocket connected');
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });

                this.socket.on('disconnect', () => {
                    console.log('WebSocket disconnected');
                    this.notifyListeners('disconnected', null);
                });

                // Per-agent broadcasts from server (agent-location-{agentId})
                this.socket.onAny((eventName, data) => {
                    if (eventName.startsWith('agent-location-') && data?.agentId) {
                        this.agentLocations.set(data.agentId, data);
                        this.notifyListeners('location-update', data);
                    }
                });

                this.socket.on('agent-offline', (data) => {
                    this.agentLocations.delete(data.agentId);
                    this.notifyListeners('agent-offline', data);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Disconnect from WebSocket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.geolocationWatchId) {
            navigator.geolocation.clearWatch(this.geolocationWatchId);
        }
    }

    // Start tracking an agent (user watching delivery)
    startTracking(bookingId, userId, agentId) {
        if (this.socket?.connected) {
            this.socket.emit('track-agent', { bookingId, userId, agentId });
        }
    }

    // Stop tracking
    stopTracking(bookingId, userId) {
        if (this.socket?.connected) {
            this.socket.emit('stop-tracking', { bookingId, userId });
        }
    }

    // Share agent location (called by agent app)
    async startLocationSharing(agentId, token) {
        console.log('Starting location sharing for agent:', agentId);

        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }

        // Start continuous location tracking
        this.geolocationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const speed = position.coords.speed || 0;

                // Send via WebSocket for real-time updates
                if (this.socket?.connected) {
                    this.socket.emit('update-location', {
                        agentId,
                        latitude,
                        longitude,
                        accuracy,
                        speed: speed * 3.6 // Convert m/s to km/h
                    });
                } else {
                    // Fallback to HTTP API
                    this.updateLocationViaAPI(agentId, latitude, longitude, accuracy, speed * 3.6, token);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.notifyListeners('geolocation-error', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    // Stop sharing agent location
    stopLocationSharing() {
        if (this.geolocationWatchId) {
            navigator.geolocation.clearWatch(this.geolocationWatchId);
            this.geolocationWatchId = null;
        }

        if (this.socket?.connected) {
            this.socket.emit('agent-offline', {});
        }
    }

    // Update location via REST API (fallback)
    async updateLocationViaAPI(agentId, latitude, longitude, accuracy, speed, token) {
        try {
            const response = await fetch(`${API_URL}/api/tracking/update-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    agentId,
                    latitude,
                    longitude,
                    accuracy,
                    speed
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update location');
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error updating location via API:', error);
        }
    }

    // Get agent's current location
    async getAgentLocation(agentId) {
        try {
            const response = await fetch(`${API_URL}/api/tracking/agent/${agentId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch agent location');
            }
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching agent location:', error);
            return null;
        }
    }

    // Get booking's agent location
    async getBookingAgentLocation(bookingId, token) {
        try {
            const response = await fetch(`${API_URL}/api/tracking/booking/${bookingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch agent location');
            }
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching booking agent location:', error);
            return null;
        }
    }

    // Get active agents nearby
    async getActiveAgents(latitude, longitude, radiusKm = 50) {
        try {
            const params = new URLSearchParams({
                latitude,
                longitude,
                radiusKm
            });
            const response = await fetch(`${API_URL}/api/tracking/active-agents?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch active agents');
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching active agents:', error);
            return [];
        }
    }

    // Get tracking history
    async getTrackingHistory(bookingId, token, limit = 100) {
        try {
            const response = await fetch(
                `${API_URL}/api/tracking/history/${bookingId}?limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (!response.ok) {
                throw new Error('Failed to fetch tracking history');
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching tracking history:', error);
            return [];
        }
    }

    // Register listener for tracking events
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    // Remove listener
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Notify all listeners
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // Calculate distance between two points
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Format distance for display
    formatDistance(distanceKm) {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(2)}km`;
    }
}

export default new TrackingService();
