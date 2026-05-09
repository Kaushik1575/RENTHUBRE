const supabase = require('../config/supabase');
const { sendNewOfferEmail } = require('../config/emailService');

/**
 * Background service to check for scheduled offers that have reached their valid_from time
 * and broadcast the "Live Now" email to all users.
 */
const checkAndLaunchOffers = async () => {
    try {
        const now = new Date();
        const todayISO = now.toISOString();
        
        console.log(`[${now.toLocaleTimeString()}] 🔍 Checking Offer Launches... (Server UTC: ${todayISO})`);

        // 1. Find all active offers that haven't sent their launch email yet
        const { data: allPending, error: fetchError } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .eq('launch_email_sent', false);

        if (fetchError) {
            if (fetchError.code === '42703') {
                console.error('❌ CRITICAL ERROR: Database column "launch_email_sent" is missing! Please run the SQL command provided.');
            } else {
                console.error('❌ Fetch Error:', fetchError);
            }
            return;
        }

        if (!allPending || allPending.length === 0) {
            console.log('✅ No pending launches found in database.');
            return;
        }

        // 2. Separate offers into "Ready to Launch" and "Still Waiting"
        const toLaunch = allPending.filter(o => !o.valid_from || new Date(o.valid_from) <= now);
        const waiting = allPending.filter(o => o.valid_from && new Date(o.valid_from) > now);

        if (waiting.length > 0) {
            console.log(`⏳ Waiting for ${waiting.length} future offers to reach their launch time...`);
            waiting.forEach(o => {
                console.log(`   -> "${o.title}" (Code: ${o.code}) is scheduled for ${o.valid_from}`);
            });
        }

        if (toLaunch.length === 0) {
            return;
        }

        console.log(`🎯 Found ${toLaunch.length} offer(s) ready to go LIVE right now!`);

        // 3. Fetch all users for broadcast
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('email, full_name');

        if (userError) {
            console.error('❌ Failed to fetch users for broadcast:', userError);
            return;
        }

        if (!users || users.length === 0) {
            console.log('⚠️ No users found in database to notify.');
            return;
        }

        // 4. Process each launch
        for (const offer of toLaunch) {
            console.log(`🚀 BROADCASTING: "${offer.title}" to ${users.length} users...`);

            // Mark as sent IMMEDIATELY in DB to prevent duplicate triggers if the loop is slow
            const { error: updateError } = await supabase
                .from('offers')
                .update({ launch_email_sent: true })
                .eq('id', offer.id);

            if (updateError) {
                console.error(`❌ Failed to update launch_email_sent for ${offer.code}:`, updateError);
                continue; // Skip sending if we can't mark it as sent (safety first)
            }

            // Send emails to all users
            let sentCount = 0;
            for (const user of users) {
                if (user.email) {
                    try {
                        // Pass full offer object to ensure template has all details (desc, image, discount)
                        await sendNewOfferEmail(user.email, user.full_name, offer);
                        sentCount++;
                        
                        // Small delay to be gentle on the Resend API
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (emailErr) {
                        console.error(`   - Failed for ${user.email}:`, emailErr.message);
                    }
                }
            }
            console.log(`✅ SUCCESSFULLY launched "${offer.code}". ${sentCount}/${users.length} emails delivered.`);
        }

    } catch (err) {
        console.error('❌ Unexpected error in checkAndLaunchOffers:', err);
    }
};

module.exports = { checkAndLaunchOffers };
