require('dotenv').config({ path: '../.env' });
const { sendEmail } = require('../config/emailService');

async function test() {
    console.log('Testing email service...');
    console.log('Sender:', process.env.SENDER_EMAIL);
    const result = await sendEmail({
        to: 'dask6@gmail.com', // Using a generic recipient for testing, replace with user email if known
        subject: 'Test Email from RentHub',
        html: '<h1>Test</h1><p>If you see this, email service is working.</p>'
    });
    console.log('Result:', result);
}

test();
