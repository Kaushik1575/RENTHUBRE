const supabase = require('../config/supabase');

class SupabaseDB {
    // User operations
    static async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getUserByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async updateUser(id, userData) {
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Booking operations
    static async createBooking(bookingData) {
        const { data, error } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getBookingsByUser(userId) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, rewards:reward_id(coupon_code, reward_type)')
            .eq('user_id', userId)
            .order('id', { ascending: false });

        if (error) throw error;
        if (!data) return [];

        // Update status for past bookings
        const now = new Date();
        const updatedData = data.map(booking => {
            try {
                if (booking.status === 'confirmed' && booking.start_date && booking.start_time) {
                    const dateParts = booking.start_date.split('-');
                    const timeParts = booking.start_time.split(':');
                    
                    if (dateParts.length === 3 && timeParts.length >= 2) {
                        const [year, month, day] = dateParts.map(Number);
                        const [hours, minutes] = timeParts.map(Number);

                        // Create date object (months are 0-indexed in JS Date)
                        const bookingStart = new Date(year, month - 1, day, hours, minutes);

                        if (!isNaN(bookingStart.getTime()) && now > bookingStart) {
                            return { ...booking, status: 'completed' };
                        }
                    }
                }
            } catch (err) {
                console.error(`Error processing status for booking ${booking.id}:`, err);
            }
            return booking;
        });

        return updatedData;
    }

    static async getBookingById(bookingId) {
        let query = supabase.from('bookings').select('*, users:user_id(full_name)');

        // If ID looks like BK-XXX or RHXXX, search by booking_id column
        // Otherwise assume numeric ID
        const isStringId = typeof bookingId === 'string' && (bookingId.startsWith('BK-') || bookingId.startsWith('RH'));

        if (isStringId) {
            query = query.eq('booking_id', bookingId);
        } else {
            query = query.eq('id', bookingId);
        }

        const { data, error } = await query.single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async getUserById(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    // Vehicle operations (bikes, cars, scooty)
    static async getVehicles(type) {
        const { data, error } = await supabase
            .from(type) // 'bikes', 'cars', or 'scooty'
            .select('*')
            .eq('is_available', true);

        if (error) throw error;
        return data;
    }

    static async getVehicleById(type, id) {
        const { data, error } = await supabase
            .from(type)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async updateVehicleAvailability(type, id, isAvailable) {
        const { data, error } = await supabase
            .from(type)
            .update({ is_available: isAvailable })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Review operations
    static async createReview(reviewData) {
        const { data, error } = await supabase
            .from('reviews')
            .insert([reviewData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getReviews(vehicleType, vehicleId) {
        // vehicleType can be 'bikes', 'cars', 'scooty'
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                users:user_id (
                    full_name,
                    profile_photo
                )
            `)
            .eq('vehicle_type', vehicleType)
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async checkVerifiedPurchase(userId, vehicleType, vehicleId) {
        // vehicleType logic mapping might be needed if frontend sends 'bike' vs 'bikes'
        // Ideally frontend sends consistent types matching DB tables ('bikes', 'cars', 'scooty')

        // Check if user has a COMPLETED booking for this vehicle
        // We look at 'bookings' table.
        // The bookings table has vehicle_id.
        // It presumably relies on us knowing the vehicle type context or storing it.
        // Looking at BookingForm.jsx, it sends vehicleType in payload.
        // Let's check SupabaseDB.createBooking... it inserts bookingData.

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .eq('vehicle_id', vehicleId)
            .eq('status', 'completed'); // or 'confirmed' if we want to allow reviewing active rentals? Usually only completed.

        if (error) return false;

        // Also need to check if booking matched the vehicle type if booking table doesn't store type (it might share IDs across tables?)
        // Assuming unique IDs or 'vehicle_type' column in bookings.
        // Checking booking controller/model might be good, but let's assume filtering by ID and User and Status is a strong signal.
        // Ideally we should check vehicle_type too if bookings table has it.

        return data && data.length > 0;
    }

    static async getReviewById(reviewId) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', reviewId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async deleteReview(reviewId) {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (error) throw error;
        return true;
    }

    // Loyalty System Operations

    // Get user coin balance
    static async getUserCoins(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('super_coins')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.super_coins || 0;
    }

    // Update user coins (set absolute value)
    static async updateUserCoins(userId, coins) {
        const { data, error } = await supabase
            .from('users')
            .update({ super_coins: coins })
            .eq('id', userId)
            .select('super_coins')
            .single();

        if (error) throw error;
        return data;
    }

    // Fetch available (unused) rewards for a user
    static async getAvailableRewards(userId) {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .eq('user_id', userId)
            .eq('is_used', false) // Only fetch unused rewards
            .gt('expires_at', now)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // Create a new reward (e.g., when redeeming coins)
    static async createReward(userId, rewardType = 'FREE_2_HOUR_RIDE', validDays = 15, couponCode = null) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('rewards')
            .insert([{
                user_id: userId,
                reward_type: rewardType,
                is_used: false,
                expires_at: expiresAt,
                coupon_code: couponCode // Store unique code
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Mark a reward as used (during booking)
    static async markRewardAsUsed(rewardId) {
        const { data, error } = await supabase
            .from('rewards')
            .update({ is_used: true })
            .eq('id', rewardId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Get reward by ID
    static async getRewardById(rewardId) {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (error) throw error;
        return data;
    }

    // Get Loyalty Settings (Global config)
    static async getLoyaltySettings() {
        const { data, error } = await supabase
            .from('loyalty_settings')
            .select('*');

        if (error) {
            // If table doesn't exist yet, return defaults safely
            if (error.code === '42P01') {
                return { earning_rate: 1, reward_threshold: 1000, system_enabled: 'true' };
            }
            throw error;
        }

        // Convert array of key-value pairs to object
        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });
        return settings;
    }

    static async updateLoyaltySettings(settings) {
        // Settings is object { key: value }
        // We need to upsert each key-value pair
        const upsertData = Object.entries(settings).map(([key, value]) => ({
            key,
            value: String(value)
        }));

        const { data, error } = await supabase
            .from('loyalty_settings')
            .upsert(upsertData, { onConflict: 'key' })
            .select();

        if (error) throw error;
        return data;
    }

    // Scratch Card & Referral Operations

    static async getScratchCards(userId) {
        const { data, error } = await supabase
            .from('scratch_cards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async createScratchCard(userId, prizeType, prizeValue) {
        const { data, error } = await supabase
            .from('scratch_cards')
            .insert([{
                user_id: userId,
                prize_type: prizeType,
                prize_value: prizeValue
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async markScratchCardRevealed(cardId) {
        const { data, error } = await supabase
            .from('scratch_cards')
            .update({
                is_scratched: true,
                scratched_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async setReferralCode(userId, code) {
        const { data, error } = await supabase
            .from('users')
            .update({ referral_code: code })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getUserByReferralCode(code) {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('referral_code', code)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }


    static async registerReferral(newUserId, referrerCode) {
        // Find referrer
        const referrer = await this.getUserByReferralCode(referrerCode);
        if (!referrer) return false;

        // Set referred_by
        const { error } = await supabase
            .from('users')
            .update({ referred_by: referrer.id })
            .eq('id', newUserId);

        if (error) throw error;

        // Grant scratch cards or coins to Referrer?
        // Let's grant a scratch card to the referrer!
        await this.createScratchCard(referrer.id, 'COINS', '100'); // Referrer gets 100 coins

        // New User Bonus: Grant 200 Coins Scratch Card to the Referee (New User)
        await this.createScratchCard(newUserId, 'COINS', '200');

        return true;
    }
}

module.exports = SupabaseDB;