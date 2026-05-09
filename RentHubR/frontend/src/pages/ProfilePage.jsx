import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';

const ProfilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    // Rewards/Loyalty removed as per user request

    useEffect(() => {
        fetchProfile();
    }, []);

    // fetchRewards removed

    // Rewards tab scroll logic removed

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setUser(data.user);
                    setFormData(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.dispatchEvent(new Event('storage'));
                }
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (error) {
            console.error(error);
            const localUser = localStorage.getItem('user');
            if (localUser) {
                const parsed = JSON.parse(localUser);
                setUser(parsed);
                setFormData(parsed);
            }
        } finally {
            setLoading(false);
        }
    };

    // handleRedeem and fetchRewards functions removed

    const fileInputRef = React.useRef(null);

    const handleForcedImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setPopup({ isOpen: true, type: 'error', title: 'File too large', message: 'Image size should be less than 5MB' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profile_photo: reader.result }));
                setIsEditing(true); // Auto-enable edit mode so they can save
                setPopup({ isOpen: true, type: 'info', title: 'Photo Updated', message: 'Click "Save Changes" to apply.' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setIsEditing(false);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.dispatchEvent(new Event('storage'));
                setPopup({ isOpen: true, type: 'success', title: 'Success', message: 'Profile updated successfully!' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: data.message || 'Failed to update profile' });
            }
        } catch (error) {
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Network error occurred' });
        }
    };

    if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center' }}>Loading profile...</div>;
    if (!user) return <div style={{ paddingTop: '100px', textAlign: 'center' }}>Please log in to view profile.</div>;

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    return (
        <div style={{ paddingTop: '100px', paddingBottom: '80px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>

                {/* Main Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    position: 'relative'
                }}>

                    {/* Hero Banner */}
                    <div style={{
                        height: '180px',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Malibu (Light Blue) Gradient
                        position: 'relative'
                    }}>
                        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                        <div style={{ position: 'absolute', bottom: '-20%', right: '10%', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                    </div>

                    {/* Profile Section */}
                    <div style={{ padding: '0 40px 60px 40px', marginTop: '-75px', position: 'relative' }}>

                        {/* Avatar Row */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleForcedImageUpload}
                            />

                            <div
                                onClick={() => fileInputRef.current.click()}
                                style={{
                                    width: '150px', height: '150px',
                                    borderRadius: '50%',
                                    border: '6px solid white',
                                    backgroundColor: 'white',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    overflow: 'visible'
                                }}
                                onMouseOver={e => {
                                    const overlay = e.currentTarget.querySelector('.camera-overlay');
                                    if (overlay) overlay.style.opacity = '1';
                                }}
                                onMouseOut={e => {
                                    const overlay = e.currentTarget.querySelector('.camera-overlay');
                                    if (overlay) overlay.style.opacity = '0';
                                }}
                            >
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', position: 'relative' }}>
                                    {user.profile_photo || formData.profile_photo ? (
                                        <img src={formData.profile_photo || user.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#87CEEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'white', fontWeight: 'bold' }}>
                                            {getInitials(user.full_name)}
                                        </div>
                                    )}

                                    <div className="camera-overlay" style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        background: 'rgba(0,0,0,0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.2s'
                                    }}>
                                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>Change</span>
                                    </div>
                                </div>

                                <div style={{
                                    position: 'absolute', bottom: '5px', right: '5px',
                                    width: '36px', height: '36px',
                                    backgroundColor: '#4facfe',
                                    borderRadius: '50%',
                                    border: '3px solid white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                    zIndex: 10,
                                    transition: 'transform 0.2s',
                                    transform: 'scale(1)'
                                }}>
                                    <i className="fas fa-camera" style={{ color: 'white', fontSize: '16px' }}></i>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <h1 style={{ margin: '0 0 5px 0', color: '#1a1a1a', fontSize: '28px', fontWeight: '800' }}>
                                    {user.full_name || 'RentHub User'}
                                </h1>
                                <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px', fontWeight: '500' }}>
                                    <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                                    Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#eee', margin: '30px 0' }}></div>



                        {/* Details Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ fontSize: '20px', margin: 0, color: '#2c3e50', fontWeight: '700' }}>Personal Details</h2>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} style={{
                                    padding: '10px 24px', borderRadius: '50px', border: 'none',
                                    background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', transition: 'all 0.2s'
                                }}
                                    onMouseOver={e => e.currentTarget.style.background = '#e9ecef'}
                                    onMouseOut={e => e.currentTarget.style.background = '#f8f9fa'}
                                >
                                    <i className="fas fa-pen" style={{ fontSize: '12px' }}></i> Edit Profile
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>

                                <div style={fieldCardStyle}>
                                    <div style={iconBoxStyle}><i className="fas fa-user"></i></div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Full Name</label>
                                        {isEditing ? (
                                            <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} style={startEditInputStyle} placeholder="Enter your full name" />
                                        ) : (
                                            <div style={readOnlyTextStyle}>{user.full_name || 'Not set'}</div>
                                        )}
                                    </div>
                                </div>

                                <div style={fieldCardStyle}>
                                    <div style={{ ...iconBoxStyle, background: '#e3f2fd', color: '#1976d2' }}><i className="fas fa-envelope"></i></div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <div style={readOnlyTextStyle}>{user.email}</div>
                                    </div>
                                    <i className="fas fa-lock" style={{ color: '#bdc3c7', fontSize: '14px' }} title="Read-only"></i>
                                </div>

                                <div style={fieldCardStyle}>
                                    <div style={{ ...iconBoxStyle, background: '#e0f2f1', color: '#009688' }}><i className="fas fa-phone-alt"></i></div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Phone Number</label>
                                        {isEditing ? (
                                            <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleInputChange} style={startEditInputStyle} placeholder="+91 99999 99999" />
                                        ) : (
                                            <div style={readOnlyTextStyle}>{user.phone_number || 'Not set'}</div>
                                        )}
                                    </div>
                                </div>

                                <div style={fieldCardStyle}>
                                    <div style={{ ...iconBoxStyle, background: '#fff3e0', color: '#e67e22' }}><i className="fas fa-map-marker-alt"></i></div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Address</label>
                                        {isEditing ? (
                                            <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} style={startEditInputStyle} placeholder="Your City, State" />
                                        ) : (
                                            <div style={readOnlyTextStyle}>{user.address || 'Not set'}</div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {isEditing && (
                                <div style={{ marginTop: '40px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button type="button" onClick={() => { setIsEditing(false); setFormData(user); }} style={{
                                        padding: '12px 30px', borderRadius: '50px', border: '1px solid #ddd', background: 'white', color: '#7f8c8d', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        padding: '12px 40px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px',
                                        boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
                                    }}>Save Changes</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                customActions={popup.customActions}
            />
        </div >
    );
};

// Styles
const fieldCardStyle = {
    display: 'flex', alignItems: 'center', gap: '15px',
    backgroundColor: '#fff', padding: '20px', borderRadius: '16px',
    border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    transition: 'transform 0.2s',
};

const iconBoxStyle = {
    width: '45px', height: '45px', borderRadius: '12px',
    background: '#f1f8e9', color: '#558b2f',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#95a5a6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' };

const readOnlyTextStyle = { fontSize: '16px', color: '#2c3e50', fontWeight: '500' };

const startEditInputStyle = {
    width: '100%', padding: '8px 0', border: 'none', borderBottom: '2px solid #4facfe',
    fontSize: '16px', color: '#2c3e50', fontWeight: '500', outline: 'none',
    background: 'transparent'
};

export default ProfilePage;
