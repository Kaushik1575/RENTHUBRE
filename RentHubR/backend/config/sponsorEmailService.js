const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender - pulled from .env for production/custom domains
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const SENDER_NAME = process.env.SENDER_NAME || 'RentHub';

// Generic function to send email via Resend
async function sendEmail({ to, subject, html, attachments }) {
    try {
        const { data, error } = await resend.emails.send({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            html: html,
            attachments: attachments
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
            // Return structure compatible with existing calls
            return { success: false, error: error.message || error };
        }

        console.log('Email sent successfully via Resend:', data.id);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error('Exception sending email:', error);
        return { success: false, error: error.message };
    }
}

// Send Vehicle Approval Email to Sponsor
async function sendVehicleApprovedEmail(sponsorEmail, sponsorName, vehicleDetails) {
    const { vehicleName, type, price } = vehicleDetails;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
            <h1 style="color: #fff; margin: 0; font-size: 26px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Vehicle Approved!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px;">
            <p style="font-size: 16px;">Hello <b>${sponsorName}</b>,</p>
            <p style="font-size: 16px;">Great news! Your vehicle listing has been approved by our admin team and is now <b>LIVE</b> on RentHub.</p>
            
            <div style="background: #f8fbff; padding: 20px; border-radius: 8px; border: 1px solid #e1e8f0; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #0f4c81; border-bottom: 1px solid #e1e8f0; padding-bottom: 10px;">Listing Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Vehicle:</td>
                        <td style="padding: 5px 0; font-weight: bold; text-align: right;">${vehicleName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Type:</td>
                        <td style="padding: 5px 0; font-weight: bold; text-align: right; text-transform: capitalize;">${type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Price:</td>
                        <td style="padding: 5px 0; font-weight: bold; text-align: right;">₹${price} / hr</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Status:</td>
                        <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #28a745;">Active & Public</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 15px; color: #555;">
                Users can now start booking your vehicle. You will receive notifications for new bookings.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="https://rent-hub-r.vercel.app/" style="background-color: #0f4c81; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Listing</a>
            </div>
            
            <p style="font-size: 13px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Thank you for partnering with RentHub!<br>
            </p>
          </div>
        </div>
    `;

    return sendEmail({
        to: sponsorEmail,
        subject: `Start Earning! Your ${vehicleName} is Live - RentHub`,
        html: html
    });
}

// Send Withdrawal Paid Email
async function sendWithdrawalPaidEmail(sponsorEmail, sponsorName, payload) {
    const { amount, transactionReference, date, paymentMethod, bankName, upiId, bankAccountNumber, ifscCode, accountHolderName } = payload;

    const formattedAmount = Number(amount).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR'
    });

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0dcaf0 0%, #0d6efd 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">💸</div>
            <h1 style="color: #fff; margin: 0; font-size: 26px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Withdrawal Processed!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px;">
            <p style="font-size: 16px;">Hello <b>${sponsorName}</b>,</p>
            <p style="font-size: 16px;">We have successfully processed your withdrawal request. The funds have been transferred to your account.</p>
            
            <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; border: 1px solid #bae6fd; margin: 25px 0; text-align: center;">
                <p style="margin: 0; color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                <h2 style="margin: 10px 0 0 0; color: #0284c7; font-size: 32px; font-weight: 800;">${formattedAmount}</h2>
            </div>
            
            <div style="background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 16px;">Transaction Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Reference ID:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-family: monospace; font-size: 14px;">${transactionReference || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${new Date(date).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Method:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; text-transform: capitalize; font-size: 14px;">${paymentMethod}</td>
                    </tr>
                    ${upiId ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">UPI ID:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${upiId}</td>
                    </tr>
                    ` : ''}
                    ${bankName ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Bank Name:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${bankName}</td>
                    </tr>
                    ` : ''}
                    ${bankAccountNumber ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Account No:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${bankAccountNumber}</td>
                    </tr>
                    ` : ''}
                    ${ifscCode ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">IFSC Code:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${ifscCode}</td>
                    </tr>
                    ` : ''}
                    ${accountHolderName ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Account Holder:</td>
                        <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${accountHolderName}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <p style="font-size: 14px; color: #777; line-height: 1.5;">
                Please allow up to 24 hours for the funds to reflect in your account, depending on your bank's processing time.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="https://rent-hub-r.vercel.app/" style="color: #0d6efd; font-weight: bold; text-decoration: none;">Go to Dashboard &rarr;</a>
            </div>
          </div>
          
           <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #e1e8f0;">
             <p style="font-size: 12px; color: #999; margin: 0;">RentHub Finance Team</p>
           </div>
        </div>
    `;

    return sendEmail({
        to: sponsorEmail,
        subject: `Payment Processed: ${formattedAmount} (Ref: ${transactionReference || 'N/A'}) - RentHub`,
        html: html
    });
}

module.exports = {
    sendVehicleApprovedEmail,
    sendWithdrawalPaidEmail
};
