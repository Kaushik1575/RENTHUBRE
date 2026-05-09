import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import OTPInput from '../components/OTPInput';

const RegisterAdmin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        adminName: '',
        adminId: '',
        email: '',
        securityCode: '',
        password: '',
        confirmPassword: '',
        otp: ''
    });
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSecurityCodeVerified, setIsSecurityCodeVerified] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSendOtp = async () => {
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
                setPopup({ isOpen: true, type: 'success', title: 'OTP Sent', message: j.message || 'OTP sent to your email' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: j.error || 'Failed to send OTP' });
            }
        } catch (err) {
            setPopup({ isOpen: true, type: 'error', title: 'Network Error', message: 'Could not send OTP, please try again later' });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifySecurityCode = () => {
        if (!formData.securityCode) {
            setPopup({ isOpen: true, type: 'error', title: 'Required', message: 'Please enter security code' });
            return;
        }
        if (formData.securityCode === '1575') {
            setIsSecurityCodeVerified(true);
            setPopup({ isOpen: true, type: 'success', title: 'Verified', message: 'Security Code Verified Successfully' });
        } else {
            setIsSecurityCodeVerified(false);
            setPopup({ isOpen: true, type: 'error', title: 'Invalid Code', message: 'Invalid Security Access Code' });
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

        if (!isSecurityCodeVerified) {
            setPopup({ isOpen: true, type: 'error', title: 'Verification Required', message: 'Please verify the Security Access Code first.' });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Passwords do not match' });
            return;
        }

        const failed = Object.entries(passwordChecks).filter(([k, v]) => !v).map(x => x[0]);
        if (failed.length > 0) {
            setPopup({ isOpen: true, type: 'error', title: 'Weak Password', message: 'Password does not meet complexity requirements.' });
            return;
        }

        if (!formData.otp) {
            setPopup({ isOpen: true, type: 'error', title: 'Verification Required', message: 'Please verify your email with OTP before submitting.' });
            return;
        }

        try {
            const response = await fetch('/api/register/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Registration Successful', message: 'Admin registered successfully! Redirecting to login...' });
                // Navigation handled in StatusPopup onClose
            } else {
                if (data && data.error && data.details && Array.isArray(data.details)) {
                    setPopup({ isOpen: true, type: 'error', title: 'Registration Failed', message: data.error + '\n' + data.details.join('\n') });
                } else {
                    setPopup({ isOpen: true, type: 'error', title: 'Registration Failed', message: data.error || 'Registration failed' });
                }
            }
        } catch (error) {
            setPopup({ isOpen: true, type: 'error', title: 'System Error', message: 'An error occurred during registration.' });
        }
    };

    return (
        <div className="auth-page" style={{
            background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Segoe UI', sans-serif"
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
                    <h2 style={{ fontSize: '28px', color: '#00695c', fontWeight: 'bold', margin: '0 0 8px 0' }}>Register as Admin</h2>
                    <p style={{ color: '#546e7a', margin: 0 }}>Create a new administrative account</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* Admin Name & ID */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="adminName" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Admin Name</label>
                        <input type="text" id="adminName" value={formData.adminName} onChange={handleChange} placeholder="Full Name" required
                            style={{
                                width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#00897b'}
                            onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="adminId" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Admin ID</label>
                        <input type="text" id="adminId" value={formData.adminId} onChange={handleChange} placeholder="Employee ID" required
                            style={{
                                width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#00897b'}
                            onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                        />
                    </div>

                    {/* Email Group */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Email Address</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder="admin@renthub.com" required
                                style={{ flex: 1, padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = '#00897b'}
                                onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                            />
                            <button type="button" onClick={handleSendOtp} disabled={isSendingOtp} className="btn-verify"
                                style={{
                                    padding: '0 20px', background: '#00897b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                                    whiteSpace: 'nowrap', opacity: isSendingOtp ? 0.7 : 1, transition: 'background 0.3s'
                                }}>
                                {isSendingOtp ? 'Sending...' : 'Send OTP'}
                            </button>
                        </div>
                        {showOtpInput && (
                            <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#546e7a' }}>Enter OTP:</label>
                                <OTPInput
                                    length={6}
                                    value={formData.otp}
                                    onChange={(val) => setFormData(prev => ({ ...prev, otp: val }))}
                                />
                                <small style={{ display: 'block', color: '#78909c', fontSize: '12px', marginTop: '6px' }}>Valid for 10 minutes</small>
                            </div>
                        )}
                    </div>

                    {/* Security Code */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="securityCode" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Security Access Code</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                id="securityCode"
                                value={formData.securityCode}
                                onChange={(e) => {
                                    setFormData({ ...formData, securityCode: e.target.value });
                                    setIsSecurityCodeVerified(false); // Reset verification on change
                                }}
                                placeholder="Enter Admin Security Code"
                                required
                                readOnly={isSecurityCodeVerified}
                                style={{
                                    flex: 1, padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '16px', fontWeight: '500', outline: 'none',
                                    backgroundColor: isSecurityCodeVerified ? '#e8f5e9' : 'white'
                                }}
                                onFocus={(e) => !isSecurityCodeVerified && (e.target.style.borderColor = '#00897b')}
                                onBlur={(e) => !isSecurityCodeVerified && (e.target.style.borderColor = '#cfd8dc')}
                            />
                            <button
                                type="button"
                                onClick={handleVerifySecurityCode}
                                disabled={isSecurityCodeVerified || !formData.securityCode}
                                className="btn-verify"
                                style={{
                                    padding: '0 20px',
                                    background: isSecurityCodeVerified ? '#4caf50' : '#00897b',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isSecurityCodeVerified ? 'default' : 'pointer',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    transition: 'background 0.3s',
                                    opacity: (!formData.securityCode) ? 0.7 : 1
                                }}>
                                {isSecurityCodeVerified ? 'Verified ✓' : 'Verify'}
                            </button>
                        </div>
                    </div>

                    {/* Passwords */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPassword ? 'text' : 'password'} id="password" value={formData.password} onChange={handleChange} placeholder="Create Password" required
                                style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = '#00897b'}
                                onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                            />
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#90a4ae' }}></i>
                        </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#263238', fontSize: '16px' }}>Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" required
                                style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = '#00897b'}
                                onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                            />
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#90a4ae' }}></i>
                        </div>
                    </div>

                    {/* Password Rules - Compact Horizontal */}
                    <div style={{ gridColumn: '1 / -1', background: '#f0f2f5', padding: '12px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#607d8b' }}>
                        <span style={{ color: passwordChecks.length ? '#00897b' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.length ? '✓' : '○'} 8+ Chars
                        </span>
                        <span style={{ color: passwordChecks.upper ? '#00897b' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.upper ? '✓' : '○'} Uppercase
                        </span>
                        <span style={{ color: passwordChecks.lower ? '#00897b' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.lower ? '✓' : '○'} Lowercase
                        </span>
                        <span style={{ color: passwordChecks.digit ? '#00897b' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.digit ? '✓' : '○'} Number
                        </span>
                        <span style={{ color: passwordChecks.special ? '#00897b' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passwordChecks.special ? '✓' : '○'} Symbol
                        </span>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn-primary"
                        style={{
                            gridColumn: '1 / -1', width: '100%', padding: '14px', background: '#00796b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px',
                            boxShadow: '0 4px 12px rgba(0, 121, 107, 0.25)', transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Register as Admin
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px', color: '#546e7a', marginTop: '10px' }}>
                    Already have an account? <Link to="/login" style={{ color: '#00897b', fontWeight: '600', textDecoration: 'none', marginLeft: '4px' }}>Login</Link>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <Link to="/register-user" style={{ color: '#455a64', textDecoration: 'none' }}>Register as User</Link>
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
                 @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div >
    );
};

export default RegisterAdmin;
