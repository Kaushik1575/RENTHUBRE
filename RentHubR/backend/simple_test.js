require('dotenv').config();
const { sendEmail } = require('./config/emailService');

async function runTest() {
    console.log('🧪 Starting Simplified Delivery Test...');
    
    try {
        const result = await sendEmail({
            to: 'dask64576@gmail.com',
            subject: 'RentHub Test Connection',
            html: '<h1>Hello!</h1><p>This is a simple test to verify your email connection is working.</p>'
        });
        console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Failed:', err);
    }
}

runTest();
