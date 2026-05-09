import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import OTPInput from '../components/OTPInput';

const RegisterUser = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        fullName: searchParams.get('fullName') || '',
        email: searchParams.get('email') || '',
        phoneNumber: searchParams.get('phoneNumber') || '',
        password: '',
        confirmPassword: '',
        otp: '',
        mobileOtp: '',
        referralCode: searchParams.get('ref') || localStorage.getItem('referralCode') || '',
        hearAboutUs: '',
        otherSource: ''
    });
    const [emailVerified, setEmailVerified] = useState(false);
    const [mobileVerified, setMobileVerified] = useState(false);
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [showMobileOtpInput, setShowMobileOtpInput] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Auto-trigger OTPs if data comes from Chatbot
    useEffect(() => {
        const autoEmail = searchParams.get('email');
        const autoPhone = searchParams.get('phoneNumber');
        const autoPass = searchParams.get('password');

        if (autoEmail || autoPhone) {
            // Update password if provided
            if (autoPass) {
                setFormData(prev => ({
                    ...prev,
                    password: autoPass,
                    confirmPassword: autoPass
                }));
            }

            // Trigger Email OTP
            if (autoEmail) {
                const sendAutoEmailOtp = async () => {
                    setIsSendingOtp(true);
                    try {
                        const r = await fetch('/api/register/send-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: autoEmail })
                        });
                        if (r.ok) {
                            setShowOtpInput(true);
                            setPopup({
                                isOpen: true,
                                type: 'success',
                                title: 'Email Verification',
                                message: `OTP sent to ${autoEmail}. Please verify it to proceed to Mobile verification.`
                            });
                        }
                    } catch (e) { console.error(e); }
                    finally { setIsSendingOtp(false); }
                };
                sendAutoEmailOtp();
            }
        }
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSendOtp = async () => {
        setFormData(prev => ({ ...prev, otp: '' }));
        setEmailVerified(false);
        if (!formData.email) return setPopup({ isOpen: true, type: 'error', title: 'Email Required', message: 'Please enter your email first' });
        setIsSendingOtp(true);
        try {
            const r = await fetch('/api/register/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
            });
            const j = await r.json();
            if (r.ok) {
                setShowOtpInput(true);
                setPopup({ isOpen: true, type: 'success', title: 'Email OTP Sent', message: j.message || 'OTP sent to your email' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: j.error || 'Failed to send OTP' });
            }
        } catch (err) {
            setPopup({ isOpen: true, type: 'error', title: 'Network Error', message: 'Could not send OTP, please try again later' });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleSendMobileOtp = async () => {
        setFormData(prev => ({ ...prev, mobileOtp: '' }));
        setMobileVerified(false);
        if (!formData.phoneNumber) return setPopup({ isOpen: true, type: 'error', title: 'Phone Number Required', message: 'Please enter your phone number first' });
        setIsSendingMobileOtp(true);
        try {
            const r = await fetch('/api/register/send-mobile-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formData.phoneNumber })
            });
            const j = await r.json();
            if (r.ok) {
                setShowMobileOtpInput(true);
                setPopup({ isOpen: true, type: 'success', title: 'Mobile OTP Sent', message: j.message || 'OTP sent to your mobile' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: j.error || 'Failed to send OTP' });
            }
        } catch (err) {
            setPopup({ isOpen: true, type: 'error', title: 'Network Error', message: 'Could not send OTP, please try again later' });
        } finally {
            setIsSendingMobileOtp(false);
        }
    };



    const verifyOtp = async (type, otpValue) => {
        const identifier = type === 'email' ? formData.email : formData.phoneNumber;
        try {
            const r = await fetch('/api/register/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, identifier, otp: otpValue })
            });
            const j = await r.json();
            if (r.ok) {
                if (type === 'email') {
                    setEmailVerified(true);
                    setFormData(prev => ({ ...prev, [type === 'email' ? 'otp' : 'mobileOtp']: otpValue }));

                    // Auto-trigger mobile OTP after email success if phone exists
                    if (formData.phoneNumber) {
                        setTimeout(() => handleSendMobileOtp(), 100);
                    }
                }
                else {
                    setMobileVerified(true);
                    setFormData(prev => ({ ...prev, [type === 'email' ? 'otp' : 'mobileOtp']: otpValue }));
                }
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Invalid OTP', message: j.error });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const calculatePasswordStrength = (pwd) => {
        return {
            length: pwd.length >= 8,
            upper: /[A-Z]/.test(pwd),
            lower: /[a-z]/.test(pwd),
            digit: /[0-9]/.test(pwd),
            special: /[!@#\$%\^&\*_\-\?]/.test(pwd),
            nospace: !/\s/.test(pwd),
            notcommon: !['123456', 'password', 'admin', '12345678', 'qwerty', 'letmein', 'welcome', 'password1', '12345', 'passw0rd'].includes(pwd.toLowerCase())
        };
    };

    const passwordChecks = calculatePasswordStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setPopup({ isOpen: true, type: 'error', title: 'Password Mismatch', message: 'Passwords do not match' });
            return;
        }

        const failed = Object.entries(passwordChecks).filter(([k, v]) => !v).map(x => x[0]);
        if (failed.length > 0) {
            setPopup({ isOpen: true, type: 'error', title: 'Weak Password', message: 'Password does not meet complexity requirements.' });
            return;
        }

        if (!formData.otp) {
            setPopup({ isOpen: true, type: 'error', title: 'Email OTP Required', message: 'Please verify your email with OTP before submitting.' });
            return;
        }

        if (!formData.mobileOtp) {
            setPopup({ isOpen: true, type: 'error', title: 'Mobile OTP Required', message: 'Please verify your mobile number with OTP before submitting.' });
            return;
        }

        try {
            const response = await fetch('/api/register/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                // Clear stored referral code
                localStorage.removeItem('referralCode');

                setPopup({
                    isOpen: true,
                    type: 'success',
                    title: 'Registration Successful',
                    message: 'User registration successful! Redirecting to login...'
                });
            } else {
                if (data && data.error && data.details && Array.isArray(data.details)) {
                    setPopup({ isOpen: true, type: 'error', title: 'Registration Failed', message: data.error + '\n' + data.details.join('\n') });
                } else {
                    setPopup({ isOpen: true, type: 'error', title: 'Registration Failed', message: data.error || 'Registration failed' });
                }
            }
        } catch (error) {
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'An error occurred during registration.' });
        }
    };

    return (
        <div className="auth-page" style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div className="auth-container" style={{
                maxWidth: '850px',
                width: '100%',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                textAlign: 'left'
            }}>
                <div className="auth-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '28px', color: '#2c3e50', fontWeight: 'bold', margin: '0 0 8px 0' }}>Create Account</h2>
                    <p style={{ color: '#7f8c8d', margin: 0 }}>Join RentHub today</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* Full Name: Full Width */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="fullName" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Full Name</label>
                        <input type="text" id="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" required
                            style={{
                                width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                    </div>

                    {/* Email Group */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Email Address</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" required
                                style={{ flex: 1, padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none' }}
                            />
                            <button type="button" onClick={handleSendOtp} disabled={isSendingOtp} className="btn-verify"
                                style={{
                                    padding: '0 16px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                                    opacity: isSendingOtp ? 0.7 : 1, whiteSpace: 'nowrap'
                                }}>
                                {isSendingOtp ? '...' : 'Send'}
                            </button>
                        </div>
                        {showOtpInput && (
                            <div style={{ marginTop: '12px' }}>
                                {emailVerified ? (
                                    <div style={{ color: '#27ae60', fontSize: '13px', fontWeight: '500' }}>✓ Email Verified</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <OTPInput length={6} value={formData.otp} onChange={(val) => setFormData(prev => ({ ...prev, otp: val }))} onComplete={(val) => verifyOtp('email', val)} />
                                        <small style={{ color: '#95a5a6', fontSize: '11px' }}>Check your email inbox</small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Phone Group */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Phone Number</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="tel" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Mobile Number" required
                                style={{ flex: 1, padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none' }}
                            />
                            <button type="button" onClick={handleSendMobileOtp} disabled={isSendingMobileOtp} className="btn-verify"
                                style={{
                                    padding: '0 16px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                                    opacity: isSendingMobileOtp ? 0.7 : 1, whiteSpace: 'nowrap'
                                }}>
                                {isSendingMobileOtp ? '...' : 'Send'}
                            </button>
                        </div>
                        {showMobileOtpInput && (
                            <div style={{ marginTop: '12px' }}>
                                {mobileVerified ? (
                                    <div style={{ color: '#27ae60', fontSize: '13px', fontWeight: '500' }}>✓ Mobile Verified</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <OTPInput length={6} value={formData.mobileOtp} onChange={(val) => setFormData(prev => ({ ...prev, mobileOtp: val }))} onComplete={(val) => verifyOtp('mobile', val)} />
                                        <small style={{ color: '#95a5a6', fontSize: '11px' }}>Check your mobile for OTP</small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Passwords */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPassword ? 'text' : 'password'} id="password" value={formData.password} onChange={handleChange} placeholder="Password" required
                                style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none' }}
                            />
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#bdc3c7' }}></i>
                        </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" required
                                style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none' }}
                            />
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#bdc3c7' }}></i>
                        </div>
                    </div>

                    {/* Referral Code (Optional) */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="referralCode" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>Referral Code (Optional)</label>
                        <input type="text" id="referralCode" value={formData.referralCode} onChange={handleChange} placeholder="Have a referral code?"
                            style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none', textTransform: 'uppercase' }}
                        />
                    </div>

                    {/* How did you hear about us? */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="hearAboutUs" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>
                            How did you hear about us? <span style={{ color: '#e74c3c' }}>*</span>
                        </label>
                        <select
                            id="hearAboutUs"
                            value={formData.hearAboutUs}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '500',
                                outline: 'none',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        >
                            <option value="">Select an option</option>
                            <option value="Google Search">🔍 Google Search</option>
                            <option value="Social Media">📱 Social Media (Facebook / Instagram / X)</option>
                            <option value="Friend Referral">👥 Friend / Family Referral</option>
                            <option value="WhatsApp/Telegram">💬 WhatsApp / Telegram Group</option>
                            <option value="Online Advertisement">📢 Advertisement (Online Ads)</option>
                            <option value="YouTube">📺 YouTube</option>
                            <option value="Blog/Article">📝 Blog / Article</option>
                            <option value="Already Knew">✨ Already knew about it</option>
                            <option value="Other">🔖 Other</option>
                        </select>
                    </div>

                    {/* Other Source (Conditional) */}
                    {formData.hearAboutUs === 'Other' && (
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="otherSource" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>
                                Please specify <span style={{ color: '#e74c3c' }}>*</span>
                            </label>
                            <input
                                type="text"
                                id="otherSource"
                                value={formData.otherSource}
                                onChange={handleChange}
                                placeholder="Tell us how you found us..."
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>
                    )}

                    {/* Password Rules - Compact Horizontal */}
                    <div style={{ gridColumn: '1 / -1', background: '#f8f9fa', padding: '12px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#7f8c8d' }}>
                        <span style={{ color: passwordChecks.length ? '#27ae60' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.length ? '✓' : '○'} 8+ Chars
                        </span>
                        <span style={{ color: passwordChecks.upper ? '#27ae60' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.upper ? '✓' : '○'} Uppercase
                        </span>
                        <span style={{ color: passwordChecks.lower ? '#27ae60' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.lower ? '✓' : '○'} Lowercase
                        </span>
                        <span style={{ color: passwordChecks.digit ? '#27ae60' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.digit ? '✓' : '○'} Number
                        </span>
                        <span style={{ color: passwordChecks.special ? '#27ae60' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.special ? '✓' : '○'} Symbol
                        </span>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn btn-primary"
                        disabled={!emailVerified || !mobileVerified}
                        style={{
                            gridColumn: '1 / -1', width: '100%', padding: '14px',
                            background: (!emailVerified || !mobileVerified) ? '#95a5a6' : '#2ecc71',
                            color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600',
                            cursor: (!emailVerified || !mobileVerified) ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            boxShadow: (!emailVerified || !mobileVerified) ? 'none' : '0 4px 12px rgba(46, 204, 113, 0.25)',
                            opacity: (!emailVerified || !mobileVerified) ? 0.7 : 1,
                            transition: 'all 0.3s'
                        }}>
                        Create Account
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px', color: '#7f8c8d' }}>
                    Already have an account? <Link to="/login" style={{ color: '#2ecc71', fontWeight: '600', textDecoration: 'none', marginLeft: '4px' }}>Login</Link>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <Link to="/register-admin" style={{ color: '#95a5a6', textDecoration: 'none' }}>Register as Admin</Link>
                </div>
            </div>

            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => {
                    setPopup({ ...popup, isOpen: false });
                    if (popup.type === 'success' && popup.title === 'Registration Successful') {
                        navigate('/login');
                    }
                }}
                type={popup.type}
                title={popup.title}
                message={popup.message}
            />
            <style>{`
                @media (max-width: 768px) {
                    .auth-container { padding: 24px !important; }
                    form { grid-template-columns: 1fr !important; gap: 16px !important; }
                    .form-group { grid-column: span 1 !important; }
                }
            `}</style>
        </div >
    );
};

export default RegisterUser;
