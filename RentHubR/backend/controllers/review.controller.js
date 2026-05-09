const SupabaseDB = require('../models/supabaseDB');

const getReviews = async (req, res) => {
    const { type, id } = req.params;
    try {
        const reviews = await SupabaseDB.getReviews(type, id);
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

const createReview = async (req, res) => {
    try {
        const { vehicleId, vehicleType, rating, comment, photos } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if verified purchase
        const isVerified = await SupabaseDB.checkVerifiedPurchase(userId, vehicleType, vehicleId);

        const reviewData = {
            user_id: userId,
            vehicle_id: vehicleId,
            vehicle_type: vehicleType,
            rating,
            comment,
            photos: photos || [],
            is_verified_purchase: isVerified
        };

        const newReview = await SupabaseDB.createReview(reviewData);
        res.status(201).json(newReview);
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};


const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // From verifyToken middleware

        const review = await SupabaseDB.getReviewById(id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        // Check ownership
        // Convert to strings to ensure safe comparison between potential int/string types
        if (String(review.user_id) !== String(userId)) {
            return res.status(403).json({ error: 'You can only delete your own reviews' });
        }

        await SupabaseDB.deleteReview(id);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};

module.exports = {
    getReviews,
    createReview,
    deleteReview
};
