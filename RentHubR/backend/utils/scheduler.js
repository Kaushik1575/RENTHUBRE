const { checkAndSendReminders } = require('../services/reminderService');
const { checkAndCancelNoShows } = require('../services/autoCancelService');
const { checkAndLaunchOffers } = require('../services/offerLaunchService');

const initScheduler = () => {
    // Reminder scheduler - Optional (use only if not using external cron)
    const USE_INTERNAL_CRON = process.env.USE_INTERNAL_CRON === 'true';

    if (USE_INTERNAL_CRON) {
        console.log('🔔 Starting internal scheduler (Reminders, No-Shows & Offer Launch)...');

        // Run immediately on startup
        checkAndSendReminders().catch(err => console.error('Error in initial reminder check:', err));
        checkAndCancelNoShows().catch(err => console.error('Error in initial no-show check:', err));
        checkAndLaunchOffers().catch(err => console.error('Error in initial launch check:', err));

        // Then run every 1 minute to ensure timely delivery
        const CHECK_INTERVAL = 1 * 60 * 1000; // 1 minute in milliseconds
        setInterval(() => {
            console.log('⏰ Running scheduled checks...');
            checkAndSendReminders().catch(err => console.error('Error in scheduled reminder check:', err));
            checkAndCancelNoShows().catch(err => console.error('Error in scheduled no-show check:', err));
            checkAndLaunchOffers().catch(err => console.error('Error in scheduled launch check:', err));
        }, CHECK_INTERVAL);

        console.log(`✅ Internal scheduler active (checking every 5 minutes)`);
    } else {
        console.log('ℹ️  Internal cron disabled. Use external cron job.');
    }
};

module.exports = { initScheduler };
