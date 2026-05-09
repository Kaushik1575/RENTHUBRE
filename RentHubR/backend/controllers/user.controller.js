const SupabaseDB = require('../models/supabaseDB');

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await SupabaseDB.getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Remove sensitive data if any (though password isn't usually stored in this table if using external auth, but we might have password_hash)
        // Adjust based on your schema. Assuming 'password' field exists.
        const { password, ...userProfile } = user;

        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error fetching profile' });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, phone_number, address, profile_photo, aadhaar_number } = req.body;

        console.log('Update Profile Request:', { userId, body: req.body });

        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (address !== undefined) updateData.address = address;
        if (profile_photo !== undefined) updateData.profile_photo = profile_photo;
        // Optionally allow aadhaar update if not verified? For now, allow it.
        if (aadhaar_number !== undefined) updateData.aadhaar_number = aadhaar_number;

        console.log('Update Data:', updateData);

        const updatedUser = await SupabaseDB.updateUser(userId, updateData);

        console.log('Updated User:', updatedUser);

        const { password, ...userProfile } = updatedUser;

        res.json({ success: true, user: userProfile, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        console.error('Error details:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Server error updating profile', error: error.message });
    }
};

exports.getUserRewards = async (req, res) => {
    try {
        const userId = req.user.id;
        const coins = await SupabaseDB.getUserCoins(userId);
        const rewards = await SupabaseDB.getAvailableRewards(userId);
        const scratchCards = await SupabaseDB.getScratchCards(userId);

        // Referral Code Logic (Lazy Generation)
        let user = await SupabaseDB.getUserById(userId);
        let referralCode = user.referral_code;

        if (!referralCode) {
            // Generate unique code: First 3 letters of name + random
            const prefix = (user.full_name || 'USER').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'RH');
            referralCode = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

            // Save it
            try {
                await SupabaseDB.setReferralCode(userId, referralCode);
            } catch (e) {
                referralCode = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
                await SupabaseDB.setReferralCode(userId, referralCode);
            }
        }

        res.json({ success: true, coins, rewards, scratchCards, referralCode });
    } catch (error) {
        console.error('Error fetching user rewards:', error);
        res.status(500).json({ success: false, message: 'Server error fetching rewards' });
    }
};

exports.redeemReward = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch loyalty settings
        const settings = await SupabaseDB.getLoyaltySettings();
        const cost = parseInt(settings.reward_threshold || 1000);

        // Check balance
        const currentCoins = await SupabaseDB.getUserCoins(userId);
        if (currentCoins < cost) {
            return res.status(400).json({ success: false, error: `Insufficient coins. You need ${cost} coins.` });
        }

        // Deduct coins
        const newBalance = currentCoins - cost;
        await SupabaseDB.updateUserCoins(userId, newBalance);

        // Create Reward Coupon
        // Generate a simple unique code: FREE-RIDE-<RANDOM>
        const code = `FREE-RIDE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const reward = await SupabaseDB.createReward(userId, 'FREE_2_HOUR_RIDE', 15, code);

        res.json({ success: true, reward, newBalance });
    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({ success: false, error: 'Server error redeeming reward' });
    }
};

exports.claimScratchCard = async (req, res) => {
    try {
        const { cardId } = req.body;
        const card = await SupabaseDB.markScratchCardRevealed(cardId);

        if (card.prize_type === 'COINS') {
            const currentCoins = await SupabaseDB.getUserCoins(card.user_id);
            await SupabaseDB.updateUserCoins(card.user_id, currentCoins + parseInt(card.prize_value));
        }

        res.json({ success: true, card });
    } catch (error) {
        console.error('Error claiming scratch card:', error);
        res.status(500).json({ success: false, message: 'Server error claiming card' });
    }
};
