import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('user'); // 'user' or 'admin'
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // const [message, setMessage] = useState({ type: '', text: '' }); // Removed old message state
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    const [verifiedOtp, setVerifiedOtp] = useState(null);

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error', // 'success' or 'error'
        title: '',
        message: ''
    });

    // Timer logic
    useEffect(() => {
        let timer;
        if (timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(curr => curr - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Helper to show popup
    const showPopup = (type, title, msg) => {
        setPopup({
            isOpen: true,
            type,
            title,
            message: msg
        });
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        const endpoint = activeTab === 'admin' ? '/api/admin/forgot-password' : '/api/forgot-password';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                showPopup('success', 'OTP Sent', 'Check your email for the verification code.');
                setStep(2);
                setTimeLeft(60);
            } else {
                showPopup('error', 'Failed', data.error || 'Failed to send OTP');
            }
        } catch (err) {
            showPopup('error', 'Network Error', 'Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) return showPopup('error', 'Invalid OTP', 'Please enter complete 6-digit OTP');

        setLoading(true);
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString })
            });
            const data = await res.json();

            if (res.ok) {
                setVerifiedOtp(otpString);
                setStep(3);
                showPopup('success', 'Verified', 'OTP verified successfully. Please set a new password.');
            } else {
                showPopup('error', 'Verification Failed', data.error || 'Invalid OTP');
            }
        } catch (err) {
            showPopup('error', 'Error', 'Verification failed due to network error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return showPopup('error', 'Mismatch', 'Passwords do not match');
        if (newPassword.length < 6) return showPopup('error', 'Weak Password', 'Password must be at least 6 characters');

        setLoading(true);
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp: verifiedOtp || otp.join(''),
                    newPassword
                })
            });
            const data = await res.json();

            if (res.ok) {
                showPopup('success', 'Password Reset', 'Your password has been reset successfully! Redirecting to login...');
                setTimeout(() => navigate(activeTab === 'admin' ? '/login' : '/login'), 2000);
            } else {
                showPopup('error', 'Reset Failed', data.error || 'Reset failed');
            }
        } catch (err) {
            showPopup('error', 'Error', 'Reset failed due to network error');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto move next
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    return (
        <div style={{
            minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', background: '#f5f7fa'
        }}>
            <div style={{
                background: 'white', padding: '2.5rem', borderRadius: '15px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                        <button
                            onClick={() => { setActiveTab('user'); setStep(1); setEmail(''); }}
                            style={{
                                padding: '0.5rem 1rem', border: 'none', background: 'transparent',
                                borderBottom: activeTab === 'user' ? '2px solid #2ecc71' : 'none',
                                color: activeTab === 'user' ? '#2ecc71' : '#666', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >User Reset</button>
                        <button
                            onClick={() => { setActiveTab('admin'); setStep(1); setEmail(''); }}
                            style={{
                                padding: '0.5rem 1rem', border: 'none', background: 'transparent',
                                borderBottom: activeTab === 'admin' ? '2px solid #6A0DAD' : 'none',
                                color: activeTab === 'admin' ? '#6A0DAD' : '#666', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >Admin Reset</button>
                    </div>
                    <h2 style={{ color: '#333', marginBottom: '1rem' }}>
                        {step === 1 ? 'Forgot Password?' : step === 2 ? 'Verify OTP' : 'New Password'}
                    </h2>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                        {step === 1 ? 'Enter your email to receive a reset code.' :
                            step === 2 ? `Enter the 6-digit code sent to ${email}` :
                                'Create a strong new password.'}
                    </p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Email Address</label>
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }}
                                placeholder="Enter your registered email"
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
                            background: activeTab === 'admin' ? '#6A0DAD' : '#2ecc71',
                            color: 'white', fontWeight: '600', cursor: loading ? 'wait' : 'pointer'
                        }}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i} id={`otp-${i}`}
                                    type="text" maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                    style={{
                                        width: '45px', height: '45px', textAlign: 'center', fontSize: '1.2rem',
                                        border: '2px solid #ddd', borderRadius: '8px'
                                    }}
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
                            background: activeTab === 'admin' ? '#6A0DAD' : '#2ecc71',
                            color: 'white', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', marginBottom: '1rem'
                        }}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={timeLeft > 0 || loading}
                                style={{ background: 'none', border: 'none', color: '#666', cursor: timeLeft > 0 ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}
                            >
                                {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend OTP'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>New Password</label>
                            <input
                                type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength="6"
                                style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Confirm Password</label>
                            <input
                                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength="6"
                                style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
                            background: activeTab === 'admin' ? '#6A0DAD' : '#2ecc71',
                            color: 'white', fontWeight: '600', cursor: loading ? 'wait' : 'pointer'
                        }}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <Link to="/login" style={{ color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <i className="fas fa-arrow-left"></i> Back to Login
                    </Link>
                </div>
            </div>

            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
            />
        </div>
    );
};

export default ForgotPassword;
