const supabase = require('../config/supabase');

class TrackingWebSocketService {
    constructor() {
        this.activeConnections = new Map(); // Store active user connections
        this.agentTracking = new Map(); // Store agent tracking data in memory
        this.locationHistoryBuffer = new Map(); // Buffer for tracking history
    }

    // Initialize WebSocket connection
    initializeConnection(io) {
        io.on('connection', (socket) => {
            console.log('New WebSocket connection:', socket.id);

            // User starts tracking an agent
            socket.on('track-agent', (data) => {
                const { bookingId, userId, agentId } = data;
                console.log(`User ${userId} tracking agent ${agentId} for booking ${bookingId}`);

                const key = `${userId}:${bookingId}`;
                this.activeConnections.set(key, {
                    socketId: socket.id,
                    userId,
                    bookingId,
                    agentId,
                    connectedAt: new Date()
                });

                socket.join(`booking:${bookingId}`);
                socket.emit('tracking-started', { bookingId, message: 'Tracking started' });
            });

            // Agent sends location update
            socket.on('update-location', async (data) => {
                const { agentId, latitude, longitude, accuracy, speed } = data;
                console.log(`Location update from agent ${agentId}:`, latitude, longitude);

                try {
                    // Store in memory for quick access
                    this.agentTracking.set(agentId, {
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        timestamp: new Date()
                    });

                    // Save to database asynchronously
                    this.saveLocationToDatabase(agentId, latitude, longitude, accuracy, speed);

                    // Broadcast to all users tracking this agent
                    this.broadcastAgentLocation(agentId, { latitude, longitude, accuracy, speed });

                    socket.emit('location-saved', { success: true });
                } catch (error) {
                    console.error('Error updating location:', error);
                    socket.emit('location-error', { error: error.message });
                }
            });

            // User stops tracking
            socket.on('stop-tracking', (data) => {
                const { bookingId, userId } = data;
                const key = `${userId}:${bookingId}`;

                this.activeConnections.delete(key);
                socket.leave(`booking:${bookingId}`);
                console.log(`User ${userId} stopped tracking booking ${bookingId}`);

                socket.emit('tracking-stopped', { bookingId });
            });

            // Agent goes offline
            socket.on('agent-offline', (data) => {
                const { agentId } = data;
                console.log(`Agent ${agentId} going offline`);

                this.agentTracking.delete(agentId);
                // Broadcast to all tracking this agent
                io.to(`agent:${agentId}`).emit('agent-offline', { agentId });
            });

            // Disconnect handler
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                // Clean up connections
                for (const [key, conn] of this.activeConnections.entries()) {
                    if (conn.socketId === socket.id) {
                        this.activeConnections.delete(key);
                    }
                }
            });
        });
    }

    // Broadcast agent location to all tracking users
    broadcastAgentLocation(agentId, locationData) {
        // This will be called by socket.io to broadcast to specific booking rooms
        // Each room represents a booking being tracked
        const io = require('socket.io')(3006, { 
            cors: { origin: '*' }
        });
        io.to(`agent:${agentId}`).emit('agent-location-update', {
            agentId,
            ...locationData,
            timestamp: new Date()
        });
    }

    // Save location to database (asynchronous)
    async saveLocationToDatabase(agentId, latitude, longitude, accuracy, speed) {
        try {
            const { error } = await supabase
                .from('tracking_history')
                .insert({
                    agent_id: agentId,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('Error saving location to DB:', error);
            }
        } catch (error) {
            console.error('Error in saveLocationToDatabase:', error);
        }
    }

    // Get agent's current location from memory (faster than DB query)
    getAgentLocation(agentId) {
        return this.agentTracking.get(agentId) || null;
    }

    // Get all active agents
    getActiveAgents() {
        return Array.from(this.agentTracking.entries()).map(([agentId, location]) => ({
            agentId,
            ...location
        }));
    }
}

module.exports = TrackingWebSocketService;
