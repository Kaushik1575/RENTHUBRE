const supabase = require('../config/supabase');
const { sendEmail } = require('../config/emailService');

// ──────────────────────────────────────────────
// Helper: generate RH + timestamp ID
// ──────────────────────────────────────────────
function generateIssueId() {
    return 'RH' + Date.now();
}

// ──────────────────────────────────────────────
// Email: Issue Submitted (to user)
// ──────────────────────────────────────────────
async function sendIssueSubmittedEmail(email, issueId, category, description) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Issue Registered</title></head>
    <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:30px 0;">
          <table align="center" width="600" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 20px;">
                <div style="font-size:52px;margin-bottom:12px;">🎫</div>
                <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">Issue Registered!</h1>
                <p style="color:rgba(255,255,255,0.9);margin:12px 0 0;font-size:16px;">Your support request has been received</p>
              </td>
            </tr>
            <!-- Issue ID Badge -->
            <tr>
              <td style="padding:40px 35px 20px;">
                <div style="text-align:center;margin-bottom:30px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                              color:white;padding:14px 30px;border-radius:10px;font-size:20px;
                              font-weight:bold;box-shadow:0 6px 15px rgba(102,126,234,0.4);letter-spacing:1px;">
                    🆔 Issue ID: ${issueId}
                  </div>
                </div>
                <!-- Details Table -->
                <table width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:30px;">
                  <tr style="background:#f7fafc;">
                    <td colspan="2" style="padding:14px 18px;color:#2d3748;font-weight:800;border-bottom:1px solid #e2e8f0;font-size:16px;">
                      📋 Issue Details
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:13px 18px;color:#718096;border-bottom:1px solid #edf2f7;width:35%;">Issue ID</td>
                    <td style="padding:13px 18px;color:#2d3748;border-bottom:1px solid #edf2f7;font-weight:700;">${issueId}</td>
                  </tr>
                  <tr>
                    <td style="padding:13px 18px;color:#718096;border-bottom:1px solid #edf2f7;">Category</td>
                    <td style="padding:13px 18px;color:#2d3748;border-bottom:1px solid #edf2f7;font-weight:600;">${category}</td>
                  </tr>
                  <tr>
                    <td style="padding:13px 18px;color:#718096;border-bottom:1px solid #edf2f7;">Description</td>
                    <td style="padding:13px 18px;color:#2d3748;border-bottom:1px solid #edf2f7;">${description.substring(0, 120)}${description.length > 120 ? '...' : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:13px 18px;color:#718096;">Status</td>
                    <td style="padding:13px 18px;">
                      <span style="background:#fefce8;color:#854d0e;padding:4px 12px;border-radius:50px;font-weight:700;font-size:13px;border:1px solid #fde047;">
                        ⏳ Pending
                      </span>
                    </td>
                  </tr>
                </table>
                <!-- Notice -->
                <div style="background:#eff6ff;border-radius:10px;padding:20px 24px;border:1px solid #bfdbfe;margin-bottom:30px;">
                  <p style="margin:0;color:#1e40af;font-size:15px;line-height:1.6;">
                    <strong>📌 What happens next?</strong><br>
                    Our support team will review your issue within <strong>24-48 hours</strong>.
                    You can track your issue status anytime using your Issue ID on our <strong>Track Issue</strong> page.
                  </p>
                </div>
                <!-- Track Button -->
                <div style="text-align:center;margin-bottom:10px;">
                  <a href="https://rent-hub-r.vercel.app/track-issue"
                     style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);
                            color:white;padding:14px 32px;border-radius:50px;text-decoration:none;
                            font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(102,126,234,0.4);">
                    🔍 Track Your Issue
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="background:#1a202c;padding:32px 20px;">
                <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:6px;">RentHub Support</div>
                <p style="color:#a0aec0;margin:0;font-size:13px;">We're here to help you 24/7</p>
                <p style="color:#4a5568;margin:12px 0 0;font-size:11px;text-transform:uppercase;">© 2026 RentHub. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    return sendEmail({
        to: email,
        subject: `Issue Registered – ${issueId} | RentHub Support`,
        html
    });
}

// ──────────────────────────────────────────────
// Email: Admin Reply (to user)
// ──────────────────────────────────────────────
async function sendAdminReplyEmail(email, issueId, category, status, adminReply) {
    const statusColors = {
        'Pending': { bg: '#fefce8', color: '#854d0e', border: '#fde047', icon: '⏳' },
        'In Progress': { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd', icon: '🔄' },
        'Resolved': { bg: '#f0fdf4', color: '#166534', border: '#86efac', icon: '✅' }
    };
    const sc = statusColors[status] || statusColors['Pending'];

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Issue Update</title></head>
    <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:30px 0;">
          <table align="center" width="600" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td align="center" style="background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);padding:40px 20px;">
                <div style="font-size:52px;margin-bottom:12px;">📬</div>
                <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">Update on Your Issue</h1>
                <p style="color:rgba(255,255,255,0.9);margin:12px 0 0;font-size:16px;">Our support team has responded</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px 35px 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,#11998e,#38ef7d);
                              color:white;padding:12px 28px;border-radius:10px;font-size:18px;
                              font-weight:bold;box-shadow:0 6px 15px rgba(17,153,142,0.3);">
                    🆔 Issue ID: ${issueId}
                  </div>
                </div>
                <!-- Status Badge -->
                <div style="text-align:center;margin-bottom:28px;">
                  <span style="background:${sc.bg};color:${sc.color};padding:8px 20px;
                               border-radius:50px;font-weight:700;font-size:15px;
                               border:1px solid ${sc.border};">
                    ${sc.icon} Status: ${status}
                  </span>
                </div>
                <!-- Admin Reply Box -->
                <div style="background:#f8fafc;border-left:4px solid #11998e;border-radius:8px;
                            padding:20px 24px;margin-bottom:30px;">
                  <p style="margin:0 0 8px;color:#11998e;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">
                    💬 Admin Response
                  </p>
                  <p style="margin:0;color:#2d3748;font-size:16px;line-height:1.7;">${adminReply}</p>
                </div>
                <!-- Details Table -->
                <table width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:30px;">
                  <tr style="background:#f7fafc;">
                    <td colspan="2" style="padding:13px 18px;color:#2d3748;font-weight:800;border-bottom:1px solid #e2e8f0;">
                      📋 Issue Summary
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px;color:#718096;border-bottom:1px solid #edf2f7;width:35%;">Category</td>
                    <td style="padding:12px 18px;color:#2d3748;border-bottom:1px solid #edf2f7;font-weight:600;">${category}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px;color:#718096;">Current Status</td>
                    <td style="padding:12px 18px;font-weight:700;color:${sc.color};">${sc.icon} ${status}</td>
                  </tr>
                </table>
                ${status === 'Resolved' ? `
                <div style="background:#f0fdf4;border-radius:10px;padding:18px 22px;border:1px solid #86efac;margin-bottom:28px;text-align:center;">
                  <p style="margin:0;color:#166534;font-size:15px;font-weight:600;">
                    🎉 Great news! Your issue has been resolved. We hope your experience is back on track!
                  </p>
                </div>` : ''}
                <div style="text-align:center;">
                  <a href="https://rent-hub-r.vercel.app/track-issue"
                     style="display:inline-block;background:linear-gradient(135deg,#11998e,#38ef7d);
                            color:white;padding:14px 32px;border-radius:50px;text-decoration:none;
                            font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(17,153,142,0.3);">
                    🔍 View Full Issue Status
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="background:#1a202c;padding:32px 20px;">
                <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:6px;">RentHub Support</div>
                <p style="color:#a0aec0;margin:0;font-size:13px;">Dedicated to your satisfaction</p>
                <p style="color:#4a5568;margin:12px 0 0;font-size:11px;text-transform:uppercase;">© 2026 RentHub. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    return sendEmail({
        to: email,
        subject: `Update on Your Issue ${issueId} – Status: ${status} | RentHub`,
        html
    });
}

// ──────────────────────────────────────────────
// CONTROLLER: Submit Issue
// ──────────────────────────────────────────────
const submitIssue = async (req, res) => {
    try {
        const { category, sub_category, booking_id, description } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        if (!category || !description) {
            return res.status(400).json({ error: 'Category and description are required' });
        }

        const REQUIRES_BOOKING_ID = ['Refund', 'Booking Issue', 'Payment Issue'];
        if (REQUIRES_BOOKING_ID.includes(category) && (!booking_id || booking_id.trim() === '')) {
            return res.status(400).json({ error: `Booking ID is required for ${category}` });
        }

        // Additional validation for Refund category: must be cancelled or rejected
        if (category === 'Refund' && booking_id) {
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .select('status')
                .eq('booking_id', booking_id.trim().toUpperCase())
                .single();

            if (fetchError || !booking) {
                return res.status(400).json({ error: 'Valid Booking ID is required for refunds. Please verify your ID.' });
            }

            if (booking.status !== 'cancelled' && booking.status !== 'rejected') {
                return res.status(400).json({ error: `Refunds are only available for cancelled or rejected bookings. Current status: ${booking.status}` });
            }
        }



        const issueId = generateIssueId();
        let attachmentUrl = null;

        if (req.file) {
            attachmentUrl = `/uploads/support/${req.file.filename}`;
        }

        const { data, error } = await supabase
            .from('issues')
            .insert([{
                issue_id: issueId,
                user_id: userId,
                email: userEmail,
                booking_id: booking_id || null,
                category,
                sub_category: sub_category || null,
                description,
                status: 'Pending',
                admin_reply: null,
                attachment_url: attachmentUrl
            }])
            .select()
            .single();

        if (error) {
            console.error('Error inserting issue:', error);
            return res.status(500).json({ error: 'Failed to submit issue', details: error.message });
        }

        // Send confirmation email (non-blocking)
        sendIssueSubmittedEmail(userEmail, issueId, category, description).catch(e =>
            console.error('Failed to send issue email:', e)
        );

        return res.status(201).json({
            success: true,
            message: 'Issue submitted successfully',
            issueId,
            data
        });
    } catch (err) {
        console.error('submitIssue error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ──────────────────────────────────────────────
// CONTROLLER: Track Issue (public, by issueId)
// ──────────────────────────────────────────────
const trackIssue = async (req, res) => {
    try {
        const { issue_id } = req.params;
        if (!issue_id) return res.status(400).json({ error: 'Issue ID required' });

        const { data, error } = await supabase
            .from('issues')
            .select('issue_id, category, sub_category, description, status, admin_reply, created_at, updated_at, booking_id, attachment_url')
            .eq('issue_id', issue_id.trim().toUpperCase())
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Issue not found. Please check the Issue ID.' });
        }

        return res.status(200).json({ success: true, issue: data });
    } catch (err) {
        console.error('trackIssue error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ──────────────────────────────────────────────
// CONTROLLER: Get My Issues (authenticated user)
// ──────────────────────────────────────────────
const getMyIssues = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('issues')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: 'Failed to fetch issues' });

        return res.status(200).json({ success: true, issues: data });
    } catch (err) {
        console.error('getMyIssues error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ──────────────────────────────────────────────
// CONTROLLER: Admin – Get All Issues
// ──────────────────────────────────────────────
const getAllIssues = async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabase
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'All') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) return res.status(500).json({ error: 'Failed to fetch issues' });

        return res.status(200).json({ success: true, issues: data });
    } catch (err) {
        console.error('getAllIssues error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ──────────────────────────────────────────────
// CONTROLLER: Admin – Reply to Issue
// ──────────────────────────────────────────────
const replyToIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_reply, status } = req.body;

        if (!admin_reply || !status) {
            return res.status(400).json({ error: 'Reply and status are required' });
        }

        const validStatuses = ['Pending', 'In Progress', 'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Fetch issue first to get email / issueId / category
        const { data: issue, error: fetchError } = await supabase
            .from('issues')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        const { data, error } = await supabase
            .from('issues')
            .update({
                admin_reply,
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ error: 'Failed to update issue' });

        // Send reply email to user (non-blocking)
        sendAdminReplyEmail(
            issue.email,
            issue.issue_id,
            issue.category,
            status,
            admin_reply
        ).catch(e => console.error('Failed to send reply email:', e));

        return res.status(200).json({ success: true, message: 'Reply sent successfully', data });
    } catch (err) {
        console.error('replyToIssue error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ──────────────────────────────────────────────
// CONTROLLER: Admin – Get Issue Stats
// ──────────────────────────────────────────────
const getIssueStats = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('issues')
            .select('status');

        if (error) return res.status(500).json({ error: 'Failed to fetch stats' });

        const stats = {
            total: data.length,
            pending: data.filter(i => i.status === 'Pending').length,
            inProgress: data.filter(i => i.status === 'In Progress').length,
            resolved: data.filter(i => i.status === 'Resolved').length
        };

        return res.status(200).json({ success: true, stats });
    } catch (err) {
        console.error('getIssueStats error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    submitIssue,
    trackIssue,
    getMyIssues,
    getAllIssues,
    replyToIssue,
    getIssueStats
};
