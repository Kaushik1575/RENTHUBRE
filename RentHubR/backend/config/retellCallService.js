// Retell AI Outbound Call Service
// This service handles automatic outbound calls when bookings are confirmed

let fetch;
try {
    // Try to use node-fetch if available (v2 uses default export)
    fetch = require('node-fetch');
} catch (error) {
    // Fallback to global fetch (Node.js 18+)
    if (typeof globalThis.fetch !== 'undefined') {
        fetch = globalThis.fetch;
    } else {
        throw new Error('node-fetch is required. Please install it with: npm install node-fetch');
    }
}

// Retell AI Configuration
const RETELL_API_KEY = process.env.RETELL_API_KEY || 'key_47254fd3407901e9678eb9f05504';
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID || 'agent_1bafe9ca9c302f33c15826c22b';
const RETELL_FROM_NUMBER = process.env.RETELL_FROM_NUMBER || '+12173933886';
const RETELL_API_URL = 'https://api.retellai.com/v2/create-phone-call';

/**
 * Format phone number to E.164 format (e.g., +918018084672)
 * Automatically adds country code if missing:
 * - 10-digit numbers → assumes India (+91)
 * - Numbers starting with 0 → removes 0 and adds +91
 * - Already has country code → uses as is
 * 
 * @param {string} phoneNumber - Phone number in any format (e.g., "8018084672", "+918018084672", "08018084672")
 * @returns {string|null} - Formatted phone number in E.164 format (e.g., "+918018084672") or null if invalid
 */
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        return null;
    }

    // Convert to string if it's a number (Supabase might return numbers)
    let cleaned = String(phoneNumber).trim();

    // If it already starts with +, remove it temporarily
    const hasPlus = cleaned.startsWith('+');
    if (hasPlus) {
        cleaned = cleaned.substring(1);
    }

    // Remove all non-digit characters
    cleaned = cleaned.replace(/\D/g, '');

    // If empty after cleaning, return null
    if (!cleaned || cleaned.length === 0) {
        return null;
    }

    // If it starts with 0, remove it (common in Indian numbers)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // Handle different scenarios:
    // 1. Already has country code (starts with country code like 91, 1, etc.)
    // 2. 10-digit number (assume Indian number, add +91)
    // 3. Other lengths (assume it already has country code or is invalid)

    if (cleaned.length === 10) {
        // 10-digit number - assume Indian number and add +91
        cleaned = '91' + cleaned;
    } else if (cleaned.length < 10) {
        // Too short, might be invalid
        console.warn(`⚠️ Phone number seems too short: ${phoneNumber} (cleaned: ${cleaned})`);
        // Still try to add +91 if it's 9 digits (might be missing leading digit)
        if (cleaned.length === 9) {
            cleaned = '91' + cleaned;
        }
    }
    // If length > 10, assume it already has country code

    // Add + prefix
    return '+' + cleaned;
}

/**
 * Make an outbound call using Retell AI
 * @param {string} toNumber - Recipient phone number
 * @param {object} callMetadata - Optional metadata to pass to the call
 * @returns {Promise<object>} - Result object with success status and call details
 */
async function makeOutboundCall(toNumber, callMetadata = {}) {
    try {
        // Format the phone number
        const formattedToNumber = formatPhoneNumber(toNumber);

        if (!formattedToNumber) {
            return {
                success: false,
                error: 'Invalid phone number provided'
            };
        }

        // Prepare the payload
        const payload = {
            from_number: RETELL_FROM_NUMBER,
            to_number: formattedToNumber,
            call_type: 'phone_call',
            override_agent_id: RETELL_AGENT_ID
        };

        // Add metadata if provided (for tracking/logging)
        if (Object.keys(callMetadata).length > 0) {
            payload.metadata = callMetadata;

            // IMPORTANT: Add retell_llm_dynamic_variables so the AI agent can access these values during the call
            // This allows the agent to speak the booking details to the customer
            payload.retell_llm_dynamic_variables = {
                booking_id: String(callMetadata.booking_id || ''),
                vehicle_name: String(callMetadata.vehicle_name || callMetadata.vehicleName || ''),
                vehicle_type: String(callMetadata.vehicle_type || callMetadata.vehicleType || ''),
                start_date: String(callMetadata.start_date || callMetadata.startDate || ''),
                start_time: String(callMetadata.start_time || callMetadata.startTime || ''),
                duration: String(callMetadata.duration || ''),
                user_name: String(callMetadata.user_name || callMetadata.userName || ''),
                total_amount: String(callMetadata.total_amount || callMetadata.totalAmount || ''),
                advance_payment: String(callMetadata.advance_payment || callMetadata.advancePayment || ''),
                remaining_amount: String(callMetadata.remaining_amount || callMetadata.remainingAmount || '')
            };
        }

        console.log('Making Retell AI outbound call:', {
            to: formattedToNumber,
            from: RETELL_FROM_NUMBER,
            agent: RETELL_AGENT_ID
        });

        // Make the API call
        const response = await fetch(RETELL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RETELL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('📞 Retell AI outbound call launched successfully!');
            console.log('Call ID:', data.call_id || data.id);
            return {
                success: true,
                callId: data.call_id || data.id,
                data: data
            };
        } else {
            console.error('❌ Retell AI API Error:', data);
            return {
                success: false,
                error: data.error || data.message || 'Unknown API error',
                details: data
            };
        }
    } catch (error) {
        console.error('⚠️ Retell AI Request Failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Make an outbound call for booking confirmation
 * @param {string} userPhoneNumber - User's phone number
 * @param {object} bookingDetails - Booking details to include in call metadata
 * @returns {Promise<object>} - Result object with success status
 */
async function makeBookingConfirmationCall(userPhoneNumber, bookingDetails = {}) {
    try {
        if (!userPhoneNumber) {
            return {
                success: false,
                error: 'User phone number is required'
            };
        }

        // Prepare metadata for the call
        const callMetadata = {
            booking_id: bookingDetails.bookingId || null,
            vehicle_name: bookingDetails.vehicleName || null,
            vehicle_type: bookingDetails.vehicleType || null,
            start_date: bookingDetails.startDate || null,
            start_time: bookingDetails.startTime || null,
            duration: bookingDetails.duration || null,
            user_name: bookingDetails.userName || null
        };

        const result = await makeOutboundCall(userPhoneNumber, callMetadata);

        if (result.success) {
            console.log(`✅ Booking confirmation call initiated for user: ${userPhoneNumber}`);
        } else {
            console.error(`❌ Failed to initiate booking confirmation call: ${result.error}`);
        }

        return result;
    } catch (error) {
        console.error('Error in makeBookingConfirmationCall:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    makeOutboundCall,
    makeBookingConfirmationCall,
    formatPhoneNumber
};

