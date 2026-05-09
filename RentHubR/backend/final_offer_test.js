require('dotenv').config();
const { sendNewOfferEmail } = require('./config/emailService');

async function runTest() {
    console.log('🚀 Sending Premium Offer Email to parhijyotiswarup@gmail.com...');
    
    const testOffer = {
        title: '🌴 Exclusive Summer Getaway Offer',
        description: 'Get ready for the ultimate adventure! Rent any premium vehicle this summer and enjoy a massive 25% discount. Whether it is a mountain ride or a coastal cruise, we have got the perfect wheels for you.',
        code: 'SUMMER2026',
        discount_percentage: 25,
        flat_discount: null,
        image_url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=1200',
        valid_until: '2026-08-31',
        target_category: 'ALL'
    };

    try {
        const result = await sendNewOfferEmail('parhijyotiswarup@gmail.com', 'Jyoti Swarup', testOffer);
        console.log('✅ Final Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Failed:', err);
    }
}

runTest();
