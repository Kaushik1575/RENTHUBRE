const supabase = require('../config/supabase');
const { uploadToSupabase } = require('../utils/supabaseStorage');

// Public: Get all active offers
exports.getActiveOffers = async (req, res) => {
    try {
        const today = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .or(`valid_until.gte.${today},valid_until.is.null`)
            .order('valid_from', { ascending: true, nullsFirst: true });

        if (error) throw error;
        res.json({ success: true, offers: data });
    } catch (err) {
        console.error('getActiveOffers error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch offers' });
    }
};

// Admin: Get all offers
exports.getAllOffers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, offers: data });
    } catch (err) {
        console.error('getAllOffers error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch offers' });
    }
};

console.log('Offer Controller Loaded: ' + new Date().toISOString());

const { sendNewOfferEmail } = require('../config/emailService');

// Admin: Create new offer
exports.createOffer = async (req, res) => {
    try {
        console.log('--- Create Offer Attempt ---');
        console.log('Raw Payload:', JSON.stringify(req.body, null, 2));

        const { 
            title, description, code, offer_type, 
            discount_percentage, flat_discount, 
            min_booking_amount, min_duration, 
            min_monthly_bookings, target_category,
            max_discount, usage_limit_per_user,
            valid_until, valid_from, image_url,
            valid_from_hour, valid_to_hour, valid_days,
            target_month
        } = req.body;
        
        if (!title || !code) {
            return res.status(400).json({ success: false, error: 'Title and Code are required' });
        }

        // --- PREVENT PAST EXPIRY DATE ---
        if (valid_until) {
            const expiry = new Date(valid_until);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expiry < today) {
                return res.status(400).json({ success: false, error: 'Expiry date cannot be in the past' });
            }
        }

        // Defensive conversion for Numeric/Integer fields
        const toNum = (val, def = null) => {
            if (val === '' || val === undefined || val === null) return def;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? def : parsed;
        };

        const toInt = (val, def = null) => {
            if (val === '' || val === undefined || val === null) return def;
            const parsed = parseInt(val);
            return isNaN(parsed) ? def : parsed;
        };

        // Handle valid_days (Database expects TEXT, e.g., "0,6")
        let validDaysStr = valid_days;
        if (Array.isArray(valid_days)) {
            validDaysStr = valid_days.join(',');
        } else if (valid_days === undefined || valid_days === null) {
            validDaysStr = null;
        }

        const insertData = {
            title,
            description,
            code: code.trim().toUpperCase(),
            offer_type: offer_type || 'GENERAL',
            discount_percentage: toNum(discount_percentage),
            flat_discount: toNum(flat_discount),
            min_booking_amount: toNum(min_booking_amount, 0),
            min_duration: toNum(min_duration, 0),
            min_monthly_bookings: toInt(min_monthly_bookings, 0),
            target_category: target_category || 'ALL',
            max_discount: toNum(max_discount),
            usage_limit_per_user: toInt(usage_limit_per_user, 1),
            valid_until: valid_until === '' ? null : valid_until,
            valid_from: valid_from === '' ? null : valid_from,
            valid_from_hour: toInt(valid_from_hour),
            valid_to_hour: toInt(valid_to_hour),
            valid_days: validDaysStr,
            target_month: toInt(target_month),
            image_url,
            is_active: true,
            launch_email_sent: valid_from === '' || !valid_from ? true : false
        };

        console.log('Sanitized Data for DB:', JSON.stringify(insertData, null, 2));

        const { data, error } = await supabase
            .from('offers')
            .insert([insertData])
            .select();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        // --- BROADCAST EMAIL TO ALL USERS ---
        if (req.body.broadcast) {
            (async () => {
                try {
                // 1. Fetch all user emails
                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('email, full_name');
                
                if (userError) throw userError;

                if (users && users.length > 0) {
                    console.log(`🚀 Broadcasting new offer to ${users.length} users...`);
                    
                    // 2. Send emails (with small delay to avoid rate limits)
                    for (const user of users) {
                        if (user.email) {
                            try {
                                await sendNewOfferEmail(user.email, user.full_name, insertData);
                                // Add 100ms delay between emails to be safe
                                await new Promise(resolve => setTimeout(resolve, 100));
                            } catch (e) {
                                console.error(`Failed to send offer email to ${user.email}:`, e.message);
                            }
                        }
                    }
                    console.log('✅ Broadcast complete!');
                }
            } catch (broadcastErr) {
                console.error('❌ Email Broadcast Error:', broadcastErr);
            }
            })();
        }

        res.json({ success: true, message: 'Offer created and notification blast started!', offer: data });
    } catch (err) {
        console.error('createOffer Catch Block:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to create offer' });
    }
};

// Admin: Update offer
exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Sanitize numeric fields in updates
        const numericFields = [
            'discount_percentage', 'flat_discount', 'min_booking_amount', 
            'min_duration', 'min_monthly_bookings', 'max_discount', 
            'usage_limit_per_user', 'valid_from_hour', 'valid_to_hour',
            'target_month'
        ];

        numericFields.forEach(field => {
            if (updates[field] === '') {
                updates[field] = null;
            } else if (updates[field] !== undefined && updates[field] !== null) {
                const num = parseFloat(updates[field]);
                updates[field] = isNaN(num) ? null : num;
            }
        });

        if (updates.valid_until === '') updates.valid_until = null;
        if (updates.valid_from === '') updates.valid_from = null;

        // --- PREVENT PAST EXPIRY DATE ---
        if (updates.valid_until) {
            const expiry = new Date(updates.valid_until);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expiry < today) {
                return res.status(400).json({ success: false, error: 'Expiry date cannot be in the past' });
            }
        }

        if (updates.code) updates.code = updates.code.trim().toUpperCase();

        // Parse valid_days if present
        if (updates.valid_days !== undefined) {
            if (Array.isArray(updates.valid_days)) {
                updates.valid_days = updates.valid_days.join(',');
            } else if (typeof updates.valid_days === 'string') {
                updates.valid_days = updates.valid_days.trim();
            }
        }

        const { data, error } = await supabase
            .from('offers')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        // --- BROADCAST EMAIL TO ALL USERS (on update) ---
        if (req.body.broadcast) {
            (async () => {
                try {
                    const { data: users, error: userError } = await supabase.from('users').select('email, full_name');
                    if (!userError && users && users.length > 0) {
                        console.log(`🚀 Broadcasting updated offer to ${users.length} users...`);
                        for (const user of users) {
                            if (user.email) {
                                try {
                                    await sendNewOfferEmail(user.email, user.full_name, data, true);
                                    await new Promise(resolve => setTimeout(resolve, 100)); // Faster rate
                                } catch (e) {}
                            }
                        }
                    }
                } catch (err) {}
            })();
        }

        res.json({ success: true, message: 'Offer updated and users notified!', offer: data });
    } catch (err) {
        console.error('updateOffer error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update offer' });
    }
};

// Public: Validate offer for a specific booking
exports.validateOffer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code, bookingDetails } = req.body;
        // bookingDetails = { duration, vehicleCategory, totalAmount }

        if (!code) {
            return res.status(400).json({ success: false, error: 'Promo code is required' });
        }
        
        if (!bookingDetails) {
            return res.status(400).json({ success: false, error: 'Booking details are required' });
        }

        const { data: offer, error } = await supabase
            .from('offers')
            .select('*')
            .eq('code', code.trim().toUpperCase())
            .eq('is_active', true)
            .maybeSingle(); // Use maybeSingle to avoid errors when not found

        if (error || !offer) {
            return res.status(404).json({ success: false, error: 'Coupon not found in general offers' });
        }

        // 1. Check Validity Date
        if (offer.valid_until && new Date(offer.valid_until) < new Date()) {
            return res.status(400).json({ success: false, error: 'This coupon has expired' });
        }

        // 2. Check Min Amount
        const totalAmt = Number(bookingDetails?.totalAmount) || 0;
        const minAmt = Number(offer.min_booking_amount) || 0;
        if (minAmt > 0 && totalAmt < minAmt) {
            return res.status(400).json({ success: false, error: `Minimum booking amount of ₹${minAmt} required` });
        }

        // 3. Check Category
        const offerCat = (offer.target_category || 'ALL').toUpperCase();
        const bookingCat = (bookingDetails?.vehicleCategory || '').toUpperCase();

        const isBikeMatch = (offerCat === 'BIKES' || offerCat === 'BIKE') && (bookingCat === 'BIKES' || bookingCat === 'BIKE');
        const isScootyMatch = (offerCat === 'SCOOTY' || offerCat === 'SCOOTIES') && (bookingCat === 'SCOOTY' || bookingCat === 'SCOOTIES');
        const isCarMatch = (offerCat === 'CARS' || offerCat === 'CAR') && (bookingCat === 'CARS' || bookingCat === 'CAR');

        if (offerCat !== 'ALL' && !isBikeMatch && !isScootyMatch && !isCarMatch && offerCat !== bookingCat) {
            return res.status(400).json({ success: false, error: `This offer is only valid for ${offer.target_category}` });
        }

        // 4. Check Hourly Requirement
        const duration = Number(bookingDetails?.duration) || 0;
        const minDuration = Number(offer.min_duration) || 0;
        if (minDuration > 0 && duration < minDuration) {
            return res.status(400).json({ success: false, error: `This offer requires a minimum booking of ${minDuration} hours` });
        }

        // 5. Check Time-of-Day
        if (offer.valid_from_hour !== null && offer.valid_to_hour !== null && offer.valid_from_hour !== undefined) {
            try {
                let currentHour;
                if (bookingDetails.startTime) {
                    currentHour = parseInt(bookingDetails.startTime.split(':')[0]);
                } else {
                    currentHour = new Date().getHours();
                }

                const from = Number(offer.valid_from_hour);
                const to = Number(offer.valid_to_hour);
                let isValidTime = false;
                if (from <= to) {
                    isValidTime = currentHour >= from && currentHour <= to;
                } else {
                    isValidTime = currentHour >= from || currentHour <= to;
                }
                if (!isValidTime) {
                    return res.status(400).json({ success: false, error: `This offer is only valid for bookings starting between ${from}:00 and ${to}:00` });
                }
            } catch (timeErr) {
                console.error('Time validation error:', timeErr);
            }
        }

        // 6. Check Day-of-Week
        if (offer.valid_days && typeof offer.valid_days === 'string') {
            try {
                // Use the selected booking date if provided, otherwise fallback to server today
                const bookingDate = bookingDetails.startDate ? new Date(bookingDetails.startDate.replace(/-/g, '/')) : new Date();
                const currentDay = bookingDate.getDay().toString();
                
                const validDaysList = offer.valid_days.split(',').map(d => d.trim());
                if (!validDaysList.includes(currentDay)) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const validDaysNames = validDaysList
                        .map(d => dayNames[parseInt(d)])
                        .filter(name => name)
                        .join(', ');
                        
                    return res.status(400).json({ 
                        success: false, 
                        error: `This offer is not valid for ${bookingDetails.startDate ? 'the selected date' : 'today'}. It is only applicable on: ${validDaysNames}` 
                    });
                }
            } catch (dayErr) {
                console.error('Day validation error:', dayErr);
            }
        }

        // 7. Check Usage Limit per User
        try {
            if (offer.usage_limit_per_user > 0) {
                const { count: usageCount, error: usageError } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('coupon_code', offer.code);

                if (!usageError && usageCount !== null && usageCount >= offer.usage_limit_per_user) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'You have already used this coupon once. This offer is limited to one use per customer.' 
                    });
                }
            }
        } catch (usageErr) {
            console.log('Usage check skipped (column might be missing):', usageErr.message);
        }

        // 8. Check Volume/Loyalty Requirement (Min Monthly Bookings)
        if (offer.min_monthly_bookings > 0) {
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = offer.target_month || (now.getMonth() + 1); // 1-12
                
                // Get start and end dates for the month
                const monthStr = month.toString().padStart(2, '0');
                const startDate = `${year}-${monthStr}-01`;
                const nextMonth = month === 12 ? 1 : month + 1;
                const nextYear = month === 12 ? year + 1 : year;
                const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

                const { count: monthlyCount, error: countError } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .neq('status', 'cancelled')
                    .neq('status', 'rejected')
                    .gte('start_date', startDate)
                    .lt('start_date', endDate);

                if (countError) throw countError;

                if (monthlyCount < offer.min_monthly_bookings) {
                    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                    return res.status(400).json({ 
                        success: false, 
                        error: `This offer requires at least ${offer.min_monthly_bookings} bookings in ${monthName}. You have ${monthlyCount || 0} so far.` 
                    });
                }
            } catch (volErr) {
                console.error('Volume check error:', volErr);
                // Continue if error, or fail? Let's fail for safety if it's a volume offer.
                if (offer.offer_type === 'VOLUME') {
                    return res.status(500).json({ success: false, error: 'Failed to verify booking volume' });
                }
            }
        }

        res.json({ 
            success: true, 
            message: 'Coupon applied successfully!', 
            offer: {
                code: offer.code,
                discount_percentage: offer.discount_percentage,
                flat_discount: offer.flat_discount,
                max_discount: offer.max_discount
            }
        });

    } catch (err) {
        console.error('validateOffer error:', err);
        res.status(500).json({ success: false, error: 'Validation failed' });
    }
};

// Admin: Delete offer
exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('offers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (err) {
        console.error('deleteOffer error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete offer' });
    }
};

// Admin: Upload offer image
exports.uploadOfferImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image provided' });
        }

        console.log('Uploading offer image to Supabase...');
        const publicUrl = await uploadToSupabase(req.file, 'uploads', 'offer-images');
        
        res.json({ success: true, imageUrl: publicUrl });
    } catch (err) {
        console.error('uploadOfferImage error:', err);
        res.status(500).json({ success: false, error: 'Failed to upload image' });
    }
};
