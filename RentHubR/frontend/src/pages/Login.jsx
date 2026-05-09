import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';

const Login = () => {
    const [activeTab, setActiveTab] = useState('user');
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname ? (location.state.from.pathname + location.state.from.search) : null;

    // User Form State
    const [userEmail, setUserEmail] = useState('');
    const [userPassword, setUserPassword] = useState('');

    // Admin Form State
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminId, setAdminId] = useState('');

    const [showUserPassword, setShowUserPassword] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    // Audio for click sound
    const playClickSound = () => {
        // Using a short, reliable pop/click sound from a public CDN
        const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3");
        audio.volume = 0.5; // Set volume to 50%
        audio.play().catch(e => console.log('Audio play failed', e));
    };

    // Robot Check State
    const [isUserRobotChecked, setIsUserRobotChecked] = useState(false);
    const [isAdminRobotChecked, setIsAdminRobotChecked] = useState(false);

    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });

    const handleUserLogin = async (e, forceLogin = false) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!isUserRobotChecked) {
            setPopup({ isOpen: true, type: 'error', title: 'Verification Required', message: 'Please confirm you are not a robot' });
            return;
        }
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, password: userPassword, forceLogin })
            });
            const data = await response.json();

            if (response.status === 409) {
                // Concurrent session detected
                setPopup({
                    isOpen: true,
                    type: 'confirm',
                    title: 'Security Alert',
                    message: 'Your account is already logged in on another device.\n\nDo you want to log in here? This will log out the other device.',
                    confirmText: 'Yes, Login',
                    cancelText: 'No, Cancel',
                    onConfirm: () => {
                        setPopup({ ...popup, isOpen: false });
                        handleUserLogin(null, true); // Retrying with forceLogin = true
                    }
                });
                // Optional: Clear password for security if you want them to re-type, 
                // but the current request flow re-uses the state.
                // If you want them to re-type, you'd need to close popup and ask for input again.
                // For now, "Yes, Login" uses the current state credentials for convenience/UX.
                return;
            }

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setPopup({
                    isOpen: true,
                    type: 'success',
                    title: 'Login Successful',
                    message: 'Welcome back! Redirecting you...'
                });
            } else {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Login Failed',
                    message: data.error || 'Invalid credentials'
                });
            }
        } catch (error) {
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Network Error',
                message: 'An error occurred. Please check your connection.'
            });
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        if (!isAdminRobotChecked) {
            setPopup({ isOpen: true, type: 'error', title: 'Verification Required', message: 'Please confirm you are not a robot' });
            return;
        }
        try {
            const response = await fetch('/api/login/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: adminEmail, password: adminPassword, adminId })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ ...data.admin, isAdmin: true }));
                setPopup({
                    isOpen: true,
                    type: 'success',
                    title: 'Admin Login Successful',
                    message: 'Welcome Admin! Redirecting to panel...'
                });
            } else {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Login Failed',
                    message: data.error || 'Invalid credentials'
                });
            }
        } catch (error) {
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Network Error',
                message: 'An error occurred during login.'
            });
        }
    };

    const isUser = activeTab === 'user';
    const primaryColor = isUser ? '#2ecc71' : '#0097a7';
    const bgGradient = isUser
        ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
        : 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)';

    return (
        <div className="login-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bgGradient,
            transition: 'background 0.5s ease',
            padding: '20px',
            fontFamily: "'Segoe UI', sans-serif"
        }}>
            <div className="login-box" style={{
                background: 'white',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                width: '100%',
                maxWidth: '480px',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ textAlign: 'center', color: isUser ? '#27ae60' : '#00695c', fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                        {isUser ? 'Welcome Back' : 'Admin Portal'}
                    </h2>
                    <p style={{ textAlign: 'center', color: '#78909c', margin: 0 }}>Login to your account</p>
                </div>

                {/* Modern Tabs */}
                <div className="login-tabs" style={{
                    display: 'flex', background: '#f5f5f5', borderRadius: '12px', padding: '6px', marginBottom: '30px'
                }}>
                    <div
                        onClick={() => setActiveTab('user')}
                        style={{
                            flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontWeight: '600', borderRadius: '10px',
                            transition: 'all 0.3s ease', fontSize: '15px',
                            background: isUser ? '#fff' : 'transparent',
                            color: isUser ? '#2ecc71' : '#9e9e9e',
                            boxShadow: isUser ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        User
                    </div>
                    <div
                        onClick={() => setActiveTab('admin')}
                        style={{
                            flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', borderRadius: '10px',
                            transition: 'all 0.3s ease', fontSize: '15px',
                            background: !isUser ? '#fff' : 'transparent',
                            color: !isUser ? '#0097a7' : '#9e9e9e',
                            boxShadow: !isUser ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Admin
                    </div>
                </div>

                {/* User Login Form */}
                {activeTab === 'user' && (
                    <form onSubmit={handleUserLogin} style={{ animation: 'fadeIn 0.4s' }}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontSize: '16px', fontWeight: '700' }}>Email Address</label>
                            <input
                                type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required placeholder="name@example.com"
                                style={{
                                    width: '100%', padding: '14px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '16px', fontWeight: '500', outline: 'none', transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontSize: '16px', fontWeight: '700' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showUserPassword ? "text" : "password"}
                                    value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required placeholder="Enter password"
                                    style={{
                                        width: '100%', padding: '14px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '16px', fontWeight: '500', outline: 'none'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                                <i
                                    className={`fas ${showUserPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                    onClick={() => setShowUserPassword(!showUserPassword)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#bdc3c7', fontSize: '18px' }}
                                ></i>
                            </div>
                        </div>

                        {/* Robot Check - Professional Style */}
                        <div style={{
                            margin: '0 auto 24px',
                            width: '100%',
                            maxWidth: '304px',
                            height: '78px',
                            background: '#f9f9f9',
                            border: '1px solid #d3d3d3',
                            borderRadius: '3px',
                            boxShadow: '0 0 4px 1px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    onClick={() => {
                                        playClickSound();
                                        setIsUserRobotChecked(!isUserRobotChecked);
                                    }}
                                    style={{
                                        position: 'relative',
                                        width: '24px',
                                        height: '24px',
                                        background: '#fff',
                                        border: '2px solid #c1c1c1',
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isUserRobotChecked && (
                                        <svg width="30" height="30" viewBox="0 0 48 48" fill="none" style={{ position: 'absolute', top: '-6px', left: '-2px' }}>
                                            <path d="M20 34L10 24L12.83 21.17L20 28.34L37.17 11.17L40 14L20 34Z" fill="#0F9D58" />
                                        </svg>
                                    )}
                                </div>
                                <label onClick={() => {
                                    playClickSound();
                                    setIsUserRobotChecked(!isUserRobotChecked);
                                }} style={{ color: '#000', fontFamily: 'Roboto, helvetica, arial, sans-serif', fontSize: '14px', fontWeight: '400', cursor: 'pointer', userSelect: 'none' }}>I'm not a robot</label>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" style={{ width: '32px', height: '32px', opacity: '0.55' }} />
                                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', transform: 'scale(0.8)', whiteSpace: 'nowrap' }}>reCAPTCHA</div>
                                <div style={{ fontSize: '8px', color: '#555', transform: 'scale(0.8)', whiteSpace: 'nowrap', marginTop: '-2px' }}>Privacy - Terms</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                            <Link to="/forgot-password" style={{ color: '#7f8c8d', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>Forgot Password?</Link>
                        </div>
                        <button type="submit" style={{
                            width: '100%', padding: '16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)', transition: 'transform 0.2s'
                        }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >Login as User</button>
                        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px', color: '#7f8c8d' }}>
                            Don't have an account? <Link to="/register-user" style={{ color: '#2ecc71', fontWeight: '700', textDecoration: 'none' }}>Register</Link>
                        </div>
                    </form>
                )}

                {/* Admin Login Form */}
                {activeTab === 'admin' && (
                    <form onSubmit={handleAdminLogin} style={{ animation: 'fadeIn 0.4s' }}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#263238', fontSize: '16px', fontWeight: '700' }}>Email Address</label>
                            <input
                                type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="admin@renthub.com"
                                style={{
                                    width: '100%', padding: '14px', border: '1px solid #cfd8dc', borderRadius: '10px', fontSize: '16px', fontWeight: '500', outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#263238', fontSize: '16px', fontWeight: '700' }}>Admin ID</label>
                            <input
                                type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} required placeholder="Employee ID"
                                style={{
                                    width: '100%', padding: '14px', border: '1px solid #cfd8dc', borderRadius: '10px', fontSize: '16px', fontWeight: '500', outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#263238', fontSize: '16px', fontWeight: '700' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showAdminPassword ? "text" : "password"}
                                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required placeholder="Enter password"
                                    style={{
                                        width: '100%', padding: '14px', border: '1px solid #cfd8dc', borderRadius: '10px', fontSize: '16px', fontWeight: '500', outline: 'none'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                                    onBlur={(e) => e.target.style.borderColor = '#cfd8dc'}
                                />
                                <i
                                    className={`fas ${showAdminPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#90a4ae', fontSize: '18px' }}
                                ></i>
                            </div>
                        </div>

                        {/* Robot Check - Professional Style */}
                        <div style={{
                            margin: '0 auto 24px',
                            width: '100%',
                            maxWidth: '304px',
                            height: '78px',
                            background: '#f9f9f9',
                            border: '1px solid #d3d3d3',
                            borderRadius: '3px',
                            boxShadow: '0 0 4px 1px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    onClick={() => {
                                        playClickSound();
                                        setIsAdminRobotChecked(!isAdminRobotChecked);
                                    }}
                                    style={{
                                        position: 'relative',
                                        width: '24px',
                                        height: '24px',
                                        background: '#fff',
                                        border: '2px solid #c1c1c1',
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isAdminRobotChecked && (
                                        <svg width="30" height="30" viewBox="0 0 48 48" fill="none" style={{ position: 'absolute', top: '-6px', left: '-2px' }}>
                                            <path d="M20 34L10 24L12.83 21.17L20 28.34L37.17 11.17L40 14L20 34Z" fill="#0F9D58" />
                                        </svg>
                                    )}
                                </div>
                                <label onClick={() => {
                                    playClickSound();
                                    setIsAdminRobotChecked(!isAdminRobotChecked);
                                }} style={{ color: '#000', fontFamily: 'Roboto, helvetica, arial, sans-serif', fontSize: '14px', fontWeight: '400', cursor: 'pointer', userSelect: 'none' }}>I'm not a robot</label>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" style={{ width: '32px', height: '32px', opacity: '0.55' }} />
                                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', transform: 'scale(0.8)', whiteSpace: 'nowrap' }}>reCAPTCHA</div>
                                <div style={{ fontSize: '8px', color: '#555', transform: 'scale(0.8)', whiteSpace: 'nowrap', marginTop: '-2px' }}>Privacy - Terms</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                            <Link to="/forgot-password" style={{ color: '#78909c', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>Forgot Password?</Link>
                        </div>
                        <button type="submit" style={{
                            width: '100%', padding: '16px', background: '#0097a7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0, 151, 167, 0.3)', transition: 'transform 0.2s'
                        }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >Login as Admin</button>
                        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px', color: '#78909c' }}>
                            Need admin access? <Link to="/register-admin" style={{ color: '#0097a7', fontWeight: '700', textDecoration: 'none' }}>Register</Link>
                        </div>
                    </form>
                )
                }
            </div >

            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => {
                    setPopup({ ...popup, isOpen: false });
                    if (popup.type === 'success') {
                        if (activeTab === 'user') {
                            // Check for sessionStorage redirect (from home page banners)
                            const sessionRedirect = sessionStorage.getItem('redirectAfterLogin');

                            // Check for 'redirect' query param
                            const params = new URLSearchParams(window.location.search);
                            const redirectUrl = params.get('redirect');

                            if (sessionRedirect) {
                                // Clear the session storage
                                sessionStorage.removeItem('redirectAfterLogin');
                                navigate(sessionRedirect);
                            } else if (from) {
                                navigate(from, { replace: true });
                            } else if (redirectUrl) {
                                navigate(redirectUrl);
                            } else {
                                navigate('/');
                            }
                            window.dispatchEvent(new Event('storage'));
                        } else {
                            navigate('/admin');
                        }
                    }
                }}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onConfirm={popup.onConfirm}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
            />
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div >
    );
};

export default Login;
