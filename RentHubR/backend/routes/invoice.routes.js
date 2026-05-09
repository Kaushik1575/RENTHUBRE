const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { generateInvoiceBuffer } = require('../utils/invoiceGenerator');
const SupabaseDB = require('../models/supabaseDB');

/**
 * GET /api/bookings/:bookingId/invoice
 * Download invoice PDF for a specific booking
 */
router.get('/:bookingId/invoice', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        // Fetch booking details
        const booking = await SupabaseDB.getBookingById(bookingId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify user owns this booking (or is admin)
        if (booking.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to access this invoice' });
        }

        // Fetch user details
        const user = await SupabaseDB.getUserById(booking.user_id);

        // Fetch vehicle details to get the name
        let vehicleName = `${booking.vehicle_type} #${booking.vehicle_id}`;
        try {
            let type = booking.vehicle_type.toLowerCase();
            if (type === 'car') type = 'cars';
            if (type === 'bike') type = 'bikes';
            if (type === 'scooty') type = 'scooty';

            const vehicle = await SupabaseDB.getVehicleById(type, booking.vehicle_id);
            if (vehicle && vehicle.name) {
                vehicleName = vehicle.name;
            }
        } catch (err) {
            console.warn('Could not fetch vehicle details for invoice:', err);
        }

        // Generate invoice PDF
        const pdfBuffer = await generateInvoiceBuffer(
            booking.booking_id || booking.id,
            user.full_name,
            user.email,
            vehicleName,
            booking.duration,
            `${booking.start_date} ${booking.start_time}`,
            booking.total_amount,
            booking.advance_payment
        );

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${bookingId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            error: 'Failed to generate invoice',
            details: error.message
        });
    }
});

module.exports = router;
