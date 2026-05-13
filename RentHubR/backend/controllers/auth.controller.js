const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SupabaseDB = require('../models/supabaseDB');
const supabase = require('../config/supabase');
const { sendRegistrationOTP, sendPasswordResetOTP, generateOTP } = require('../config/emailService');
const { validatePassword } = require('../utils/validation');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { sendSMS } = require('../config/twilioService');

const registerSendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Check ONLY the Delivery Agent table as requested
        const { data: existingAgent } = await supabase
            .from('delivery_agents')
            .select('id')
            .eq('email', email)
            .single();

        if (existingAgent) {
            return res.status(400).json({ 
                error: 'This email is already registered as a Delivery Agent.',
                isAlreadyRegistered: true 
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Remove any previous OTPs for this email and insert the new OTP
        await supabase.from('password_reset_otps').delete().eq('email', email);
        const { error: otpError } = await supabase.from('password_reset_otps').insert({
            user_id: null,
            email: email,
            otp: otp,
            expires_at: otpExpiry,
            created_at: new Date().toISOString()
        });

        if (otpError) {
            console.error('Error storing registration OTP:', otpError);
            return res.status(500).json({ error: 'Error generating OTP' });
        }

        // Send OTP email
        const emailResult = await sendRegistrationOTP(email, '', otp);
        if (!emailResult.success) {
            console.error('Failed to send registration OTP:', emailResult.error);
            return res.status(500).json({ error: 'Failed to send OTP email' });
        }

        res.json({ message: 'OTP sent successfully to your email' });
    } catch (error) {
        console.error('Error in /api/register/send-otp:', error);
        res.status(500).json({ error: 'Error sending OTP' });
    }
};

const registerSendMobileOtp = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

        // Check ONLY the Delivery Agent table as requested
        const { data: existingAgent } = await supabase
            .from('delivery_agents')
            .select('id')
            .eq('mobile', phoneNumber)
            .single();

        if (existingAgent) {
            return res.status(400).json({ error: 'Mobile number already registered as a Delivery Agent.' });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        // Remove any previous OTPs for this phone and insert new one
        await supabase.from('mobile_otps').delete().eq('phone_number', phoneNumber);
        const { error: otpError } = await supabase.from('mobile_otps').insert({
            phone_number: phoneNumber,
            otp: otp,
            expires_at: otpExpiry,
            created_at: new Date().toISOString()
        });

        if (otpError) {
            console.error('Error storing mobile OTP:', otpError);
            return res.status(500).json({ error: 'Error generating OTP' });
        }

        // Send SMS
        const smsResult = await sendSMS(phoneNumber, `Your RentHub verification code is: ${otp}. Valid for 5 minutes.`);

        if (!smsResult.success) {
            console.error('Failed to send mobile OTP:', smsResult.error);
            return res.status(500).json({ error: 'Failed to send OTP via SMS. Please check the number.' });
        }

        res.json({ message: 'OTP sent successfully to your mobile number' });
    } catch (error) {
        console.error('Error in /api/register/send-mobile-otp:', error);
        res.status(500).json({ error: 'Error sending mobile OTP' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { type, identifier, otp } = req.body;

        if (!identifier || !otp) return res.status(400).json({ error: 'Missing details' });

        const table = type === 'email' ? 'password_reset_otps' : 'mobile_otps';
        const column = type === 'email' ? 'email' : 'phone_number';

        const { data: record, error } = await supabase
            .from(table)
            .select('*')
            .eq(column, identifier)
            .eq('otp', otp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (error || !record) return res.status(400).json({ error: 'Invalid or expired OTP' });

        res.json({ message: 'Verified', success: true });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const registerUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, confirmPassword, otp } = req.body;

        // Check if user exists
        const existingUser = await SupabaseDB.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Verify OTP exists and not expired
        // Verify OTPs exists and not expired
        if (!otp) {
            return res.status(400).json({ error: 'Email OTP required to complete registration' });
        }

        // Check Mobile OTP (assuming passed as mobileOtp in body)
        const { mobileOtp } = req.body;
        if (!mobileOtp) {
            return res.status(400).json({ error: 'Mobile OTP required to complete registration' });
        }

        const { data: otpRecord, error: otpError } = await supabase
            .from('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (otpError || !otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired Email OTP' });
        }

        // Verify Mobile OTP
        const { data: mobileOtpRecord, error: mobileOtpError } = await supabase
            .from('mobile_otps')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('otp', mobileOtp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (mobileOtpError || !mobileOtpRecord) {
            return res.status(400).json({ error: 'Invalid or expired Mobile OTP' });
        }

        // Validate passwords
        if (!confirmPassword) return res.status(400).json({ error: 'Please confirm your password' });
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        const { valid, errors } = validatePassword(password);
        if (!valid) return res.status(400).json({ error: 'Password validation failed', details: errors });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Get marketing source fields
        const { hearAboutUs, otherSource } = req.body;

        const newUser = {
            full_name: fullName,
            email,
            phone_number: phoneNumber,
            password: hashedPassword,
            is_admin: false,
            hear_about_us: hearAboutUs || null,
            other_source: (hearAboutUs === 'Other' ? otherSource : null)
        };

        const created = await SupabaseDB.createUser(newUser);

        // Handle Referral if code provided
        const { referralCode } = req.body;
        if (referralCode) {
            try {
                console.log(`Processing referral for New User ${created.id} with Code ${referralCode}`);
                await SupabaseDB.registerReferral(created.id, referralCode);
                console.log('Referral processed successfully');
            } catch (refError) {
                console.error('Error processing referral:', refError);
                // Don't fail registration if referral fails
            }
        }

        // Delete used OTP records
        await supabase.from('password_reset_otps').delete().eq('id', otpRecord.id);
        await supabase.from('mobile_otps').delete().eq('id', mobileOtpRecord.id);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

const registerAdmin = async (req, res) => {
    try {
        const { adminName, email, adminId, password, confirmPassword, securityCode, otp } = req.body;

        if (securityCode !== '1575') {
            return res.status(403).json({ error: 'Invalid Security Code. You are not authorized to register as admin.' });
        }

        const existingUser = await SupabaseDB.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Verify OTP exists and not expired
        if (!otp) {
            return res.status(400).json({ error: 'OTP required to complete registration' });
        }

        const { data: otpRecord, error: otpError } = await supabase
            .from('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (otpError || !otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Validate passwords
        if (!confirmPassword) return res.status(400).json({ error: 'Please confirm your password' });
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        const { valid, errors } = validatePassword(password);
        if (!valid) return res.status(400).json({ error: 'Password validation failed', details: errors });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = {
            admin_name: adminName,
            email,
            admin_id: adminId,
            password: hashedPassword,
            is_admin: true
        };

        const created = await SupabaseDB.createUser(newAdmin);

        // Delete used OTP record
        await supabase.from('password_reset_otps').delete().eq('id', otpRecord.id);
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'Error registering admin' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔍 Login attempt for email:', email);

        const user = await SupabaseDB.getUserByEmail(email);
        console.log('📊 Raw user data from Supabase:', user);

        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Prevent admin from logging in as user
        if (user.is_admin) {
            console.log('❌ Admin tried to login as user');
            return res.status(403).json({ error: 'Admins must login via Admin Portal' });
        }

        // Check if user is blocked
        if (user.is_blocked) {
            console.log('❌ Blocked user login attempt:', email);
            return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('❌ Invalid password');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                isAdmin: user.is_admin
            },
            JWT_SECRET
        );

        // Map snake_case to camelCase for frontend compatibility
        const userResponse = {
            id: user.id,
            fullName: user.full_name,
            adminName: user.admin_name,
            email: user.email,
            phoneNumber: user.phone_number,
            profilePhoto: user.profile_photo,
            isAdmin: user.is_admin || false
        };

        console.log('🎯 Mapped user response:', userResponse);
        console.log('✅ Login successful for:', userResponse.fullName || userResponse.adminName || userResponse.email);

        res.json({ token, user: userResponse });
    } catch (error) {
        console.error('❌ Error during login:', error);
        res.status(500).json({ error: 'Error during login' });
    }
};

const loginAdmin = async (req, res) => {
    try {
        console.log('🔐 Admin login attempt started');
        const { email, password, adminId } = req.body;

        console.log('📧 Email:', email);
        console.log('🆔 Admin ID:', adminId);

        if (!email || !password || !adminId) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'Email, password, and admin ID are required' });
        }

        // Find the admin by email
        console.log('🔍 Fetching admin from database...');
        const admin = await SupabaseDB.getUserByEmail(email);
        console.log('📊 Admin data retrieved:', admin ? 'Found' : 'Not found');

        if (!admin) {
            console.log('❌ No user found with email:', email);
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        console.log('👤 User found - is_admin:', admin.is_admin);
        console.log('🆔 Stored admin_id:', admin.admin_id);

        if (!admin.is_admin) {
            console.log('❌ User is not an admin');
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        if (admin.admin_id !== adminId) {
            console.log('❌ Admin ID mismatch. Expected:', admin.admin_id, 'Got:', adminId);
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        console.log('🔑 Verifying password...');
        const validPassword = await bcrypt.compare(password, admin.password);

        if (!validPassword) {
            console.log('❌ Invalid password');
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        console.log('✅ Password verified');
        console.log('🎫 Generating JWT token...');

        const token = jwt.sign(
            { id: admin.id, email: admin.email, isAdmin: admin.is_admin },
            JWT_SECRET
        );

        // Map snake_case to camelCase for frontend compatibility
        const adminResponse = {
            id: admin.id,
            fullName: admin.full_name,
            adminName: admin.admin_name,
            email: admin.email,
            phoneNumber: admin.phone_number,
            adminId: admin.admin_id,
            isAdmin: admin.is_admin || false
        };

        console.log('✅ Admin login successful for:', admin.email);
        res.json({ token, admin: adminResponse });
    } catch (error) {
        console.error('❌ Error during admin login:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Error during admin login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found with this email' });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Store OTP in database (you might want to create a separate table for this)
        const { error: otpError } = await supabase
            .from('password_reset_otps')
            .upsert({
                user_id: user.id,
                email: user.email,
                otp: otp,
                expires_at: otpExpiry.toISOString(),
                created_at: new Date().toISOString()
            });

        if (otpError) {
            console.error('Error storing OTP:', otpError);
            return res.status(500).json({ error: 'Error generating OTP' });
        }

        // Send OTP email
        const emailResult = await sendPasswordResetOTP(user.email, user.full_name, otp);

        if (emailResult.success) {
            res.json({ message: 'OTP sent successfully to your email' });
        } else {
            console.error('Failed to send OTP email:', emailResult.error);
            res.status(500).json({ error: 'Failed to send OTP email' });
        }

    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ error: 'Error processing forgot password request' });
    }
};

const adminForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Normalize email
        const normalized = String(email).trim().toLowerCase();

        // First check if there's an 'admins' table (preferred) — if not fall back to 'users' with is_admin flag
        let { data: adminRow, error: adminErr } = await supabase
            .from('admins')
            .select('id, email, full_name')
            .eq('email', normalized)
            .maybeSingle();

        if (adminErr && adminErr.code !== 'PGRST116') {
            // PGRST116 sometimes indicates no such table — ignore and fall back
            console.error('Error while checking admins table:', adminErr);
            // continue to fallback check
            adminRow = null;
        }

        if (!adminRow) {
            // fallback: check users table for is_admin=true
            const { data: userRow, error: userErr } = await supabase
                .from('users')
                .select('id, email, full_name, is_admin')
                .eq('email', normalized)
                .single();

            if (userErr || !userRow || !userRow.is_admin) {
                return res.status(404).json({ error: 'This email is not registered as admin' });
            }
            adminRow = userRow; // treat as admin
        }

        // At this point, we have an adminRow — generate OTP and persist to password_reset_otps
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Upsert OTP record, associate user_id when available
        const { error: otpError } = await supabase.from('password_reset_otps').upsert({
            user_id: adminRow.id || null,
            email: adminRow.email,
            otp: otp,
            expires_at: otpExpiry,
            created_at: new Date().toISOString()
        });

        if (otpError) {
            console.error('Error storing admin OTP:', otpError);
            return res.status(500).json({ error: 'Error generating OTP for admin' });
        }

        // Send OTP email to admin
        const emailResult = await sendPasswordResetOTP(adminRow.email, adminRow.full_name || 'Admin', otp);
        if (emailResult.success) {
            return res.json({ message: 'OTP sent successfully to admin email' });
        } else {
            console.error('Failed to send admin OTP email:', emailResult.error);
            return res.status(500).json({ error: 'Failed to send OTP email to admin' });
        }
    } catch (err) {
        console.error('Unhandled error in /api/admin/forgot-password:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Verify OTP
        const { data: otpRecord, error: otpError } = await supabase
            .from('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (otpError || !otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // If no new password provided, just verify OTP
        if (!newPassword) {
            res.json({ message: 'OTP verified successfully' });
            return;
        }

        // Fetch user to check existing password (by user_id if available, else by email)
        let userRow = null;
        if (otpRecord.user_id) {
            const { data, error } = await supabase.from('users').select('id, password').eq('id', otpRecord.user_id).single();
            if (!error) userRow = data;
        } else {
            const { data, error } = await supabase.from('users').select('id, password').eq('email', email).single();
            if (!error) userRow = data;
        }

        // If user found, check that newPassword != old password
        if (userRow && userRow.password) {
            const isSame = await bcrypt.compare(newPassword, userRow.password);
            if (isSame) {
                return res.status(400).json({ error: 'This is your old password — please choose a different password' });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        let updateResult;
        if (otpRecord.user_id) {
            updateResult = await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('id', otpRecord.user_id);
        } else {
            // fallback: update by email if user_id was not stored
            updateResult = await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('email', email);
        }

        if (updateResult.error) {
            console.error('Error updating password:', updateResult.error);
            return res.status(500).json({ error: 'Error updating password' });
        }

        // Delete used OTP
        await supabase
            .from('password_reset_otps')
            .delete()
            .eq('id', otpRecord.id);

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
};

const debugUser = async (req, res) => {
    try {
        const { email } = req.params;
        console.log('🔍 Debug: Checking user data for email:', email);

        const user = await SupabaseDB.getUserByEmail(email);
        console.log('📊 Debug: Raw user data:', user);

        if (!user) {
            return res.json({ error: 'User not found', email });
        }

        // Show both raw and mapped data
        const mappedUser = {
            id: user.id,
            fullName: user.full_name,
            adminName: user.admin_name,
            email: user.email,
            phoneNumber: user.phone_number,
            isAdmin: user.is_admin || false
        };

        res.json({
            raw: user,
            mapped: mappedUser,
            fields: {
                hasFullName: !!user.full_name,
                hasAdminName: !!user.admin_name,
                hasEmail: !!user.email,
                isAdmin: user.is_admin
            }
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).json({ error: 'Debug endpoint error', details: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        // Just send success response, as we are using JWT (client should just delete token)
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout error' });
    }
};

module.exports = {
    registerSendOtp,
    registerSendMobileOtp,
    verifyOtp,
    registerUser,
    registerAdmin,
    loginUser,
    loginAdmin,
    forgotPassword,
    adminForgotPassword,
    resetPassword,
    logoutUser,
    debugUser
};
