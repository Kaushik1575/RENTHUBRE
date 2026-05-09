import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusPopup from './StatusPopup';
import NavbarProfile from './NavbarProfile';
import LanguageSelector from './LanguageSelector';

const Navbar = () => {
    // Mobile menu state
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);


    // Scroll state for shadow effect
    const [scrolled, setScrolled] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            setIsLoggedIn(!!token);

            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    setIsAdmin(user.isAdmin === true || user.is_admin === true);
                } catch (e) {
                    console.error("Error parsing user from local storage", e);
                }
            }
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('storage', checkAuth);
        };
    }, []);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setIsAdmin(false);
        setShowLogoutConfirm(false);
        navigate('/login');
        window.location.reload();
    };

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <>
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.1)' : '0 1px 0 rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
                padding: '0 5%'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    {/* Logo - Left Side */}
                    <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>R</div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#2c3e50', margin: 0, letterSpacing: '-0.5px' }}>RentHub</h1>
                    </div>

                    {/* Desktop Links - Center/Right Offset */}
                    <div className="desktop-only" style={{ display: 'flex', gap: '40px', alignItems: 'center', marginLeft: 'auto', marginRight: '40px' }}>
                        <Link to="/" style={linkStyle}>Home</Link>
                        <Link to="/about" style={linkStyle}>About</Link>
                        <Link to="/contact" style={linkStyle}>Contact</Link>

                        {isLoggedIn && (
                            <div style={{ position: 'relative' }}>
                                <Link to="/my-bookings" style={linkStyle}>My Bookings</Link>
                            </div>
                        )}
                        {/* E-Query Link */}
                        <Link 
                            to="/e-query"
                            style={{ 
                                ...linkStyle, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                color: '#2ecc71', // Highlight green
                                background: 'rgba(46, 204, 113, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '50px',
                                transition: 'all 0.3s'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(46, 204, 113, 0.2)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(46, 204, 113, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <span>E-Query</span>
                            <span style={{ fontSize: '14px' }}>⚡</span>
                        </Link>


                    </div>

                    {/* Language Selector - Desktop */}
                    <div className="desktop-only" style={{ marginRight: '16px' }}>
                        <LanguageSelector />
                    </div>

                    {/* Auth Buttons - Far Right */}
                    <div className="desktop-only" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {!isLoggedIn ? (
                            <>
                                {/* Login Button */}
                                <Link to="/login" style={{
                                    textDecoration: 'none',
                                    color: '#2ecc71',
                                    fontWeight: '700',
                                    padding: '10px 24px',
                                    borderRadius: '50px',
                                    border: '2px solid #2ecc71',
                                    fontSize: '16px',
                                    transition: 'all 0.2s'
                                }} onMouseOver={(e) => { e.target.style.background = '#2ecc71'; e.target.style.color = 'white'; }}
                                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#2ecc71'; }}>
                                    Login
                                </Link>

                                {/* Get Started Button */}
                                <button onClick={() => setShowRegisterModal(true)} style={{
                                    background: '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 28px',
                                    borderRadius: '50px',
                                    fontWeight: '700',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)',
                                    transition: 'transform 0.2s'
                                }} onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
                                    Get Started
                                </button>
                            </>
                        ) : (
                            <NavbarProfile />
                        )}
                    </div>

                    {/* Hamburger */}
                    <div className="mobile-only" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ cursor: 'pointer', zIndex: 1001 }}>
                        <div style={{ width: '28px', height: '3px', background: '#2c3e50', marginBottom: '6px', transition: '0.3s', transform: isMenuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none', borderRadius: '2px' }}></div>
                        <div style={{ width: '28px', height: '3px', background: '#2c3e50', marginBottom: '6px', transition: '0.3s', opacity: isMenuOpen ? 0 : 1, borderRadius: '2px' }}></div>
                        <div style={{ width: '28px', height: '3px', background: '#2c3e50', marginBottom: '0', transition: '0.3s', transform: isMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none', borderRadius: '2px' }}></div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div style={{
                    position: 'fixed', top: '80px', left: 0, width: '100%', height: isMenuOpen ? 'calc(100vh - 80px)' : '0', background: 'white',
                    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', zIndex: 999,
                    borderBottom: isMenuOpen ? '1px solid #f0f0f0' : 'none'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '30px', gap: '24px', alignItems: 'center' }}>
                        <Link to="/" onClick={closeMenu} style={mobileLinkStyle}>Home</Link>
                        <Link to="/about" onClick={closeMenu} style={mobileLinkStyle}>About</Link>
                        <Link to="/contact" onClick={closeMenu} style={mobileLinkStyle}>Contact</Link>
                        {isLoggedIn && (
                            <>
                                <Link to="/profile" onClick={closeMenu} style={mobileLinkStyle}>My Profile <span style={{ fontSize: '10px', background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '10px', verticalAlign: 'middle', marginLeft: '5px' }}>NEW</span></Link>
                                <Link to="/my-bookings" onClick={closeMenu} style={mobileLinkStyle}>My Bookings</Link>
                            </>
                        )}
                        {/* E-Query Section Mobile */}
                        <div style={{ width: '100%', marginTop: '5px' }}>
                            <div 
                                onClick={() => { navigate('/e-query'); closeMenu(); }}
                                style={{ 
                                    fontSize: '12px', 
                                    fontWeight: '800', 
                                    color: '#6366f1', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1.5px', 
                                    marginBottom: '15px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    padding: '5px',
                                    borderRadius: '8px',
                                    background: 'rgba(99, 102, 241, 0.05)'
                                }}>⚡ E-Query System</div>

                            
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '12px',
                                width: '100%'
                            }}>
                                <Link to="/support" onClick={closeMenu} style={{ 
                                    textDecoration: 'none',
                                    background: '#f8fafc',
                                    padding: '15px 10px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <span style={{ fontSize: '24px' }}>🛟</span>
                                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Support</span>
                                </Link>
                                
                                <Link to="/track-issue" onClick={closeMenu} style={{ 
                                    textDecoration: 'none',
                                    background: '#f8fafc',
                                    padding: '15px 10px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <span style={{ fontSize: '24px' }}>🔍</span>
                                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Track</span>
                                </Link>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '1px', background: '#f0f0f0', margin: '10px 0' }}></div>

                        {/* Language Selector - Mobile */}
                        <div style={{ width: '100%', marginBottom: '10px' }}>
                            <LanguageSelector />
                        </div>

                        {!isLoggedIn ? (
                            <>
                                <Link to="/login" onClick={closeMenu} style={{
                                    textDecoration: 'none',
                                    color: '#2ecc71',
                                    fontWeight: '700',
                                    fontSize: '18px',
                                    padding: '12px 0'
                                }}>Login</Link>
                                <button onClick={() => { setShowRegisterModal(true); closeMenu(); }} style={{
                                    width: '100%', padding: '16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold'
                                }}>Get Started</button>
                            </>
                        ) : (
                            <button onClick={confirmLogout} style={{ ...mobileLinkStyle, color: '#e74c3c', background: 'none', border: 'none' }}>Logout</button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Register Modal */}
            {showRegisterModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(20, 30, 40, 0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s'
                }} onClick={() => setShowRegisterModal(false)}>
                    <div style={{
                        background: 'white', padding: '40px', borderRadius: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowRegisterModal(false)} style={{
                            position: 'absolute', top: '20px', right: '20px', background: '#f1f2f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }} onMouseOver={e => { e.target.style.background = '#e1e2e6'; e.target.style.transform = 'rotate(90deg)'; }} onMouseOut={e => { e.target.style.background = '#f1f2f6'; e.target.style.transform = 'rotate(0deg)'; }}>&times;</button>

                        <h2 style={{
                            margin: '0 0 10px 0', fontSize: '32px', fontWeight: '900',
                            background: 'linear-gradient(135deg, #2ecc71 0%, #0097a7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>Join RentHub</h2>
                        <p style={{ margin: '0 0 35px 0', color: '#95a5a6', fontSize: '16px', fontWeight: '500' }}>Choose your account type to continue</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* User Button */}
                            <button onClick={() => { setShowRegisterModal(false); navigate('/register-user'); }} style={{
                                width: '100%', padding: '15px 20px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                                color: 'white', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 10px 25px rgba(46, 204, 113, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(46, 204, 113, 0.4)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(46, 204, 113, 0.3)'; }}
                            >
                                <div style={{
                                    width: '45px', height: '45px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                }}>👤</div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <div style={{ fontSize: '18px', fontWeight: '800' }}>User Account</div>
                                    <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500' }}>For renting vehicles</div>
                                </div>
                                <div style={{ fontSize: '20px', opacity: 0.8 }}>→</div>
                            </button>

                            {/* Admin Button */}
                            <button onClick={() => { setShowRegisterModal(false); navigate('/register-admin'); }} style={{
                                width: '100%', padding: '15px 20px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)',
                                color: 'white', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 10px 25px rgba(0, 188, 212, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 188, 212, 0.4)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 188, 212, 0.3)'; }}
                            >
                                <div style={{
                                    width: '45px', height: '45px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                }}>🛡️</div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <div style={{ fontSize: '18px', fontWeight: '800' }}>Admin Account</div>
                                    <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500' }}>For managing inventory</div>
                                </div>
                                <div style={{ fontSize: '20px', opacity: 0.8 }}>→</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StatusPopup
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                type="confirm"
                title="Log Out"
                message="Are you sure you want to log out?"
                confirmText="Yes, Logout"
                cancelText="Cancel"
            />

            <style>{`
                @media (max-width: 900px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: block !important; }
                }
                @media (min-width: 901px) {
                    .desktop-only { display: flex !important; }
                    .mobile-only { display: none !important; }
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .dropdown-item:hover {
                    background-color: #f8fafc !important;
                    transform: translateX(5px);
                }
            `}</style>

        </>
    );
};

const linkStyle = {
    textDecoration: 'none',
    color: '#34495e',
    fontWeight: '700',
    fontSize: '17px',
    transition: 'color 0.2s',
    letterSpacing: '0.3px'
};

const mobileLinkStyle = {
    textDecoration: 'none',
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: '20px',
    padding: '10px 0'
};

const dropdownLinkStyle = {
    textDecoration: 'none',
    color: '#2c3e50',
    padding: '10px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
};

export default Navbar;

