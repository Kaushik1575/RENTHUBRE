import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const NavbarProfile = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUser = () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    setUser(JSON.parse(userStr));
                }
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        };

        loadUser();
        window.addEventListener('storage', loadUser);

        // Listen for clicks outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('storage', loadUser);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage')); // Trigger update for other components
        navigate('/login');
        window.location.reload();
    };

    if (!user) return null;

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="navbar-profile" ref={dropdownRef} style={{ position: 'relative' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    borderRadius: '50px',
                    backgroundColor: isOpen ? '#f0f2f5' : 'transparent',
                    transition: 'all 0.2s'
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    overflow: 'hidden',
                    border: '2px solid white',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                    {user.profile_photo || user.profilePhoto ? (
                        <img src={user.profile_photo || user.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        getInitials(user.full_name || user.fullName || user.email)
                    )}
                </div>

                {/* Name - Desktop only */}
                <span className="desktop-only" style={{ fontWeight: '600', color: '#2c3e50', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(user.full_name || user.fullName || 'User').split(' ')[0]}
                </span>

                <i className={`fas fa-chevron-down`} style={{
                    fontSize: '12px',
                    color: '#95a5a6',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s'
                }}></i>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '220px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    padding: '10px',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', marginBottom: '5px' }}>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{user.full_name || user.fullName || 'RentHub User'}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                    </div>

                    <div
                        onClick={() => { setIsOpen(false); navigate('/profile'); }}
                        style={menuItemStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <i className="fas fa-user-circle" style={{ width: '20px', color: '#3498db' }}></i> My Profile
                    </div>



                    <div
                        onClick={() => { setIsOpen(false); navigate('/my-bookings'); }}
                        style={menuItemStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <i className="fas fa-calendar-alt" style={{ width: '20px', color: '#2ecc71' }}></i> My Bookings
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#eee', margin: '5px 0' }}></div>

                    <div
                        onClick={handleLogout}
                        style={{ ...menuItemStyle, color: '#e74c3c' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#fff5f5'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <i className="fas fa-sign-out-alt" style={{ width: '20px' }}></i> Logout
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const menuItemStyle = {
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s'
};

export default NavbarProfile;
