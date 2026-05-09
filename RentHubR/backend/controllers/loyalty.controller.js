const SupabaseDB = require('../models/supabaseDB');

// Get User Coin Balance
exports.getUserCoins = async (req, res) => {
    try {
        const coins = await SupabaseDB.getUserCoins(req.user.id);
        res.json({ coins });
    } catch (error) {
        console.error('Error fetching coins:', error);
        res.status(500).json({ error: 'Failed to fetch coin balance' });
    }
};

// Get Available Rewards
exports.getRewards = async (req, res) => {
    try {
        const rewards = await SupabaseDB.getAvailableRewards(req.user.id);
        res.json({ rewards });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};

// Redeem Coins for Reward
exports.redeemReward = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get Settings
        const settings = await SupabaseDB.getLoyaltySettings();
        if (settings.system_enabled !== 'true') {
            return res.status(400).json({ error: 'Loyalty system is currently disabled' });
        }

        const threshold = parseInt(settings.reward_threshold) || 1000;

        // 2. Check Balance
        const currentCoins = await SupabaseDB.getUserCoins(userId);
        if (currentCoins < threshold) {
            return res.status(400).json({ error: `Insufficient coins. You need ${threshold} coins.` });
        }

        // 3. Deduct Coins & Create Reward (Transactional ideally, but separate calls for now)
        // Deduct
        const newBalance = currentCoins - threshold;
        await SupabaseDB.updateUserCoins(userId, newBalance);

        // Create Reward with Unique Code
        const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 char random string
        const couponCode = `RH-${uniqueSuffix}`; // Format: RH-XXXXXX

        const reward = await SupabaseDB.createReward(userId, 'FREE_2_HOUR_RIDE', 15, couponCode);

        res.json({
            success: true,
            message: 'Reward redeemed successfully!',
            newBalance,
            reward
        });

    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({ error: 'Failed to redeem reward' });
    }
};

// Admin: Get Settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await SupabaseDB.getLoyaltySettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Admin: Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body;
        await SupabaseDB.updateLoyaltySettings(settings);
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
