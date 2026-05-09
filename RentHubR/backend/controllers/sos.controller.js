const supabase = require('../config/supabase');
const { sendSOSAlertEmail } = require('../config/emailService');
const ADMIN_EMAILS = ['jyoti2006@gmail.com'];

const activateSOS = async (req, res) => {
    try {
        const { token, bookingId, gpsLocation } = req.body;

        // Basic validation
        if (!bookingId) {
            return res.status(400).json({ error: 'Booking ID is required' });
        }

        // Fetch booking details with user info


        // Handle formatted booking ID (RH...) or numeric ID
        let query = supabase.from('bookings').select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone_number
                )
            `);

        if (bookingId.toString().startsWith('RH')) {
            query = query.eq('booking_id', bookingId);
        } else {
            query = query.eq('id', bookingId);
        }

        const { data: booking, error: bookingError } = await query.single();

        if (bookingError || !booking) {
            console.error('Error fetching booking for SOS:', bookingError);
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Get vehicle details
        let vehicleName = 'Unknown Vehicle';

        console.log(`SOS Processing - ID: ${booking.id}, RH-ID: ${booking.booking_id}, Type: ${booking.vehicle_type}, VehicleID: ${booking.vehicle_id}`);

        // First, try to get vehicle name directly from booking if it exists
        if (booking.vehicle_name) {
            vehicleName = booking.vehicle_name;
        } else if (booking.vehicle_type && booking.vehicle_id) {
            // Determine correct table name
            let tableName;
            const typeLower = (booking.vehicle_type || '').toLowerCase().trim();

            if (typeLower === 'scooty') {
                tableName = 'scooty';
            } else if (typeLower === 'bike') {
                tableName = 'bikes';
            } else if (typeLower === 'car') {
                tableName = 'cars';
            } else {
                tableName = typeLower + 's';
            }

            const { data: vehicle, error: vehicleError } = await supabase
                .from(tableName)
                .select('name, model')
                .eq('id', booking.vehicle_id)
                .single();

            if (vehicleError) {
                // Try alternative table name if first attempt fails
                if (tableName === 'scooty') {
                    const { data: altVehicle } = await supabase
                        .from('scooties')
                        .select('name, model')
                        .eq('id', booking.vehicle_id)
                        .single();
                    if (altVehicle) {
                        vehicleName = altVehicle.name || altVehicle.model || 'Unknown Vehicle';
                    }
                }
            } else if (vehicle) {
                vehicleName = vehicle.name || vehicle.model || 'Unknown Vehicle';
            }
        }

        // Prepare SOS data
        let gpsString = 'Not Provided';
        let googleMapsLink = null;

        if (gpsLocation && typeof gpsLocation === 'object') {
            const { latitude, longitude, accuracy } = gpsLocation;
            gpsString = `Lat: ${latitude}, Lng: ${longitude} (Accuracy: ${accuracy}m)`;
            googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        } else if (typeof gpsLocation === 'string') {
            gpsString = gpsLocation;
        }

        const sosData = {
            bookingId: booking.booking_id || booking.id,
            userName: booking.users?.full_name || 'Unknown User',
            userEmail: booking.users?.email || 'Unknown Email',
            phoneNumber: booking.users?.phone_number || 'Unknown Phone',
            bikeModel: vehicleName,
            pickupLocation: booking.pickup_location || 'GITA Autonomous College BBSR',
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            gpsLocation: gpsString,
            googleMapsLink: googleMapsLink
        };

        // Fetch all admins from database
        const { data: admins, error: adminError } = await supabase
            .from('users')
            .select('email')
            .eq('is_admin', true);

        if (adminError) {
            console.error('Error fetching admins:', adminError);
            await sendSOSAlertEmail(ADMIN_EMAILS[0], sosData);
        } else if (admins && admins.length > 0) {
            const emailPromises = admins.map(admin => sendSOSAlertEmail(admin.email, sosData));
            await Promise.all(emailPromises);
        } else {
            console.warn('No admins found in database. Sending to fallback.');
            await sendSOSAlertEmail(ADMIN_EMAILS[0], sosData);
        }

        res.json({ success: true, message: 'SOS alert sent successfully' });

    } catch (error) {
        console.error('Error processing SOS request:', error);
        res.status(500).json({ error: 'Internal server error processing SOS' });
    }
};

module.exports = {
    activateSOS
};
