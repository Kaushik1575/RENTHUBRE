require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { initScheduler } = require('./utils/scheduler');

const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const adminRoutes = require('./routes/admin.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const paymentRoutes = require('./routes/payment.routes');
const sosRoutes = require('./routes/sos.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const userRoutes = require('./routes/user.routes');
const supportRoutes = require('./routes/support.routes');
const trackingRoutes = require('./routes/tracking.routes');
const agentRoutes = require('./routes/agent.routes');

const app = express();
const PORT = process.env.PORT || 3005;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(compression());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes Mounting
app.use('/api', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/bookings', invoiceRoutes); // Invoice download routes
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api', sosRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/agent', agentRoutes);
const reviewRoutes = require('./routes/review.routes');
app.use('/api/reviews', reviewRoutes);
const loyaltyRoutes = require('./routes/loyalty.routes');
app.use('/api', loyaltyRoutes);
app.use('/api/support', supportRoutes);
const offerRoutes = require('./routes/offer.routes');
app.use('/api/offers', offerRoutes);

// Explicitly register cron route to match original path exactly
const adminController = require('./controllers/admin.controller');
app.get('/api/cron/reminders', adminController.cronReminderCheck);

// Restore Dashboard Stats Route (needed for Admin Panel)
const { verifyAdminToken } = require('./middleware/authMiddleware');
app.get('/api/dashboard-stats', verifyAdminToken, adminController.getDashboardStats);

// Restore bookingConfirmation service routes
const bookingConfirmationRouter = require('./services/bookingConfirmation');
app.use('/api', bookingConfirmationRouter);

// Frontend Routes (SPA fallback)
app.get('/sos-activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('*', (req, res) => {
    // Exclude API routes from falling back to index.html (though they should match above)
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
const isProduction = process.env.NODE_ENV === 'production';

// Socket.io event handlers for live tracking
io.on('connection', (socket) => {
    console.log('New WebSocket connection:', socket.id);

    // Agent sends location update
    socket.on('update-location', async (data) => {
        const { agentId, latitude, longitude, accuracy, speed } = data;
        console.log(`Location update from agent ${agentId}:`, latitude, longitude);

        try {
            const supabase = require('./config/supabase');
            const { getISTTimestamp } = require('./utils/dateUtils');

            // Update in database
            // Keep delivery_agents in sync (customer live map reads this table)
            await supabase
                .from('delivery_agents')
                .update({
                    current_lat: latitude,
                    current_lng: longitude,
                    last_active: getISTTimestamp()
                })
                .eq('id', agentId);

            const { error } = await supabase
                .from('agent_tracking')
                .upsert({
                    agent_id: agentId,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    last_updated: getISTTimestamp(),
                    is_active: true
                }, { onConflict: 'agent_id' });

            if (error) {
                console.error('Error updating location:', error);
                socket.emit('location-error', { error: error.message });
            } else {
                // Broadcast to all users tracking this agent
                io.emit(`agent-location-${agentId}`, {
                    agentId,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    timestamp: new Date()
                });
                socket.emit('location-saved', { success: true });
            }
        } catch (error) {
            console.error('Error in location update:', error);
            socket.emit('location-error', { error: error.message });
        }
    });

    // User starts tracking agent
    socket.on('track-agent', (data) => {
        const { bookingId, userId, agentId } = data;
        console.log(`User ${userId} tracking agent ${agentId} for booking ${bookingId}`);
        socket.join(`booking-${bookingId}`);
        socket.emit('tracking-started', { bookingId });
    });

    // Stop tracking
    socket.on('stop-tracking', (data) => {
        const { bookingId } = data;
        socket.leave(`booking-${bookingId}`);
        socket.emit('tracking-stopped', { bookingId });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

if (!isProduction || process.env.RENDER) {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`WebSocket ready for live tracking`);
        initScheduler();
    });
} else {
    // Fallback for serverless environments like Vercel
    initScheduler();
}

// Export for Vercel serverless
module.exports = app;
