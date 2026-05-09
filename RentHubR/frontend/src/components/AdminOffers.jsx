import React, { useState, useEffect } from 'react';
import StatusPopup from './StatusPopup';

const AdminOffers = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        code: '',
        offer_type: 'GENERAL',
        discount_percentage: '',
        flat_discount: '',
        min_booking_amount: '0',
        min_duration: '0',
        min_monthly_bookings: '0',
        target_category: 'ALL',
        max_discount: '',
        usage_limit_per_user: '1',
        valid_until: '',
        valid_from: '',
        valid_from_hour: '',
        valid_to_hour: '',
        valid_days: '',
        target_month: '',
        image_url: '',
        is_active: true,
        launch_type: 'instant'
    });
    const [uploading, setUploading] = useState(false);
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
    });

    const showPopup = (type, title, message, onConfirm = null, confirmText = 'Okay, Got it', cancelText = 'Cancel') => {
        setPopup({ isOpen: true, type, title, message, onConfirm, confirmText, cancelText });
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/offers/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setOffers(data.offers);
        } catch (error) {
            console.error('Error fetching offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (offer = null) => {
        if (offer) {
            setEditingId(offer.id);
            setFormData({
                title: offer.title || '',
                description: offer.description || '',
                code: offer.code || '',
                offer_type: offer.offer_type || 'GENERAL',
                discount_percentage: offer.discount_percentage || '',
                flat_discount: offer.flat_discount || '',
                min_booking_amount: offer.min_booking_amount || '0',
                min_duration: offer.min_duration || '0',
                min_monthly_bookings: offer.min_monthly_bookings || '0',
                target_category: offer.target_category || 'ALL',
                max_discount: offer.max_discount || '',
                usage_limit_per_user: offer.usage_limit_per_user || '1',
                valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : '',
                valid_from: offer.valid_from ? offer.valid_from.split('T')[0] : '',
                valid_from_hour: offer.valid_from_hour || '',
                valid_to_hour: offer.valid_to_hour || '',
                valid_days: offer.valid_days || '',
                target_month: offer.target_month || '',
                image_url: offer.image_url || '',
                is_active: offer.is_active,
                launch_type: offer.valid_from ? 'scheduled' : 'instant'
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                code: '',
                offer_type: 'GENERAL',
                discount_percentage: '',
                flat_discount: '',
                min_booking_amount: '0',
                min_duration: '0',
                min_monthly_bookings: '0',
                target_category: 'ALL',
                max_discount: '',
                usage_limit_per_user: '1',
                valid_until: '',
                valid_from: '',
                valid_from_hour: '',
                valid_to_hour: '',
                valid_days: '',
                target_month: '',
                image_url: '',
                is_active: true,
                launch_type: 'instant',
                broadcast: true
            });
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem('token');
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        setUploading(true);
        try {
            const res = await fetch('/api/offers/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
                showPopup('success', 'Success', 'Offer image uploaded successfully!');
            } else {
                showPopup('error', 'Upload Failed', data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            showPopup('error', 'Error', 'Something went wrong during image upload.');
        } finally {
            setUploading(false);
        }
    };

    const formatDateForInput = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingId ? `/api/offers/${editingId}` : '/api/offers/create';
            const method = editingId ? 'PUT' : 'POST';

            const finalFormData = { ...formData };
            
            // Handle Start Date
            if (formData.launch_type === 'instant' && !editingId) {
                finalFormData.valid_from = new Date().toISOString();
            } else if (finalFormData.valid_from) {
                // Convert local time from datetime-local to UTC ISO string
                finalFormData.valid_from = new Date(finalFormData.valid_from).toISOString();
            }

            // Handle Expiry Date
            if (finalFormData.valid_until) {
                finalFormData.valid_until = new Date(finalFormData.valid_until).toISOString();
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(finalFormData)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchOffers();

                // Format details for the success message
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const selectedDays = formData.valid_days
                    ? formData.valid_days.split(',').map(i => days[parseInt(i)]).join(', ')
                    : 'All Days';

                const formatH = (h) => {
                    if (h === '' || h === null) return 'Anytime';
                    const hr = parseInt(h);
                    return hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr < 12 ? `${hr} AM` : `${hr - 12} PM`;
                };

                const timeStr = (formData.valid_from_hour !== '' || formData.valid_to_hour !== '')
                    ? `${formatH(formData.valid_from_hour)} to ${formatH(formData.valid_to_hour)}`
                    : 'Anytime';

                const detailMsg = (
                    <div style={{ textAlign: 'left', marginTop: '10px', fontSize: '0.9rem', color: '#64748b' }}>
                        <p style={{ margin: '4px 0' }}><strong>📅 Applicable Days:</strong> {selectedDays}</p>
                        <p style={{ margin: '4px 0' }}><strong>⏰ Active Hours:</strong> {timeStr}</p>
                        <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#4f46e5' }}>New promotional offer created and broadcasted to all users!</p>
                    </div>
                );

                showPopup('success', editingId ? 'Offer Updated' : 'Offer Created', detailMsg);
            } else {
                showPopup('error', 'Action Failed', data.error || 'Failed to save offer details.');
            }
        } catch (error) {
            console.error('Error saving offer:', error);
            showPopup('error', 'System Error', 'Failed to communicate with the server.');
        }
    };

    const handleDelete = async (id) => {
        showPopup('confirm', 'Confirm Delete', 'Are you sure you want to delete this offer? This action cannot be undone.', async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/offers/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    fetchOffers();
                    setPopup(prev => ({ ...prev, isOpen: false }));
                    // Show a quick success message after deletion
                    setTimeout(() => showPopup('success', 'Deleted', 'Offer removed successfully.'), 300);
                } else {
                    showPopup('error', 'Delete Failed', data.error || 'Failed to delete offer.');
                }
            } catch (error) {
                console.error('Error deleting offer:', error);
                showPopup('error', 'Error', 'An unexpected error occurred during deletion.');
            }
        }, 'Yes, Delete It', 'No, Keep It');
    };

    if (loading) return <div>Loading offers...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
                onConfirm={popup.onConfirm}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b' }}>Festive Rewards & Offers</h2>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ padding: '12px 24px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
                >
                    <i className="fas fa-plus"></i> Create New Offer
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                {offers.map(offer => (
                    <div key={offer.id} style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '180px', background: '#f8fafc', position: 'relative' }}>
                            <img src={offer.image_url || 'https://via.placeholder.com/400x200'} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: '15px', right: '15px', background: offer.is_active ? '#dcfce7' : '#fee2e2', color: offer.is_active ? '#166534' : '#991b1b', padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                {offer.is_active ? '● Active' : '○ Inactive'}
                            </div>
                            <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(30, 27, 75, 0.8)', backdropFilter: 'blur(8px)', color: 'white', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                                {offer.offer_type}
                            </div>
                        </div>
                        <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '850', color: '#1e1b4b' }}>{offer.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px' }}>
                                    <i className="fas fa-tag"></i> {offer.code}
                                </div>
                            </div>

                            {/* Rules Summary Section */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                {offer.discount_percentage && <span style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>{offer.discount_percentage}% OFF</span>}
                                {offer.flat_discount && <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>₹{offer.flat_discount} OFF</span>}
                                {offer.min_duration > 0 && <span style={{ background: '#fff7ed', color: '#9a3412', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}><i className="far fa-clock"></i> Min {offer.min_duration}h</span>}
                                {offer.valid_from_hour !== null && offer.valid_from_hour !== undefined && offer.valid_from_hour !== '' && (
                                    <span style={{ background: '#faf5ff', color: '#6b21a8', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                                        <i className="far fa-moon"></i> {((h) => {
                                            const hour = parseInt(h);
                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                            const displayHour = hour % 12 || 12;
                                            return `${displayHour} ${ampm}`;
                                        })(offer.valid_from_hour)} - {((h) => {
                                            const hour = parseInt(h);
                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                            const displayHour = hour % 12 || 12;
                                            return `${displayHour} ${ampm}`;
                                        })(offer.valid_to_hour)}
                                    </span>
                                )}
                                {offer.valid_days && offer.valid_days.toString().replace(/[\[\]]/g, '').length > 0 && (
                                    <span style={{ background: '#f5f3ff', color: '#4338ca', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                                        <i className="far fa-calendar-alt"></i> Days: {offer.valid_days.toString().replace(/[\[\]]/g, '').split(',').map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(d)]).filter(Boolean).join(', ')}
                                    </span>
                                )}
                                {offer.target_month && (
                                    <span style={{ background: '#fff1f2', color: '#be123c', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                                        <i className="fas fa-calendar-check"></i> Month: {new Date(2000, offer.target_month - 1).toLocaleString('default', { month: 'long' })}
                                    </span>
                                )}
                                {offer.target_category !== 'ALL' && <span style={{ background: '#ecfeff', color: '#155e75', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>{offer.target_category.toUpperCase()} ONLY</span>}
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                <button onClick={() => handleOpenModal(offer)} style={{ flex: 1, padding: '12px', borderRadius: '15px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '700', color: '#475569', transition: '0.2s' }}>
                                    <i className="far fa-edit"></i> Edit
                                </button>
                                <button onClick={() => handleDelete(offer.id)} style={{ padding: '12px 20px', borderRadius: '15px', border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: '700', transition: '0.2s' }}>
                                    <i className="far fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODERNIZED CREATE/EDIT MODAL */}
            {isModalOpen && (
                <div className="offer-modal-overlay">
                    <div className="offer-modal-container">
                        <div className="offer-modal-header">
                            <div>
                                <h3 className="offer-modal-title">{editingId ? 'Edit Promotion' : 'Create New Promotion'}</h3>
                                <p className="offer-modal-subtitle">Configure your offer details and scheduling rules</p>
                            </div>
                            <button className="offer-modal-close" onClick={() => setIsModalOpen(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="offer-modal-body">
                            {!editingId && (
                                <div className="offer-presets-section">
                                    <div className="section-label">
                                        <i className="fas fa-magic"></i> Quick Templates
                                    </div>
                                    <div className="presets-grid">
                                        {[
                                            {
                                                label: '🌅 Early Bird',
                                                data: { title: 'Early Bird Special', description: 'Plan ahead and save! Get 15% off when you book at least 24 hours in advance.', code: 'EARLYBIRD', offer_type: 'GENERAL', discount_percentage: '15', min_booking_amount: '500', image_url: 'https://images.unsplash.com/photo-1495562569060-2eec283d3391?auto=format&fit=crop&q=80&w=800' }
                                            },
                                            {
                                                label: '🎡 Weekend',
                                                data: { title: 'Weekend Warrior', description: 'Make your weekends extra special with 20% OFF on all rentals.', code: 'WEEKEND20', offer_type: 'GENERAL', discount_percentage: '20', image_url: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&q=80&w=800' }
                                            },
                                            {
                                                label: '🛣️ Long Haul',
                                                data: { title: 'The Long Haul', description: 'Going far? Get 25% OFF on rentals longer than 12 hours.', code: 'LONGHAUL25', offer_type: 'HOURLY', min_duration: '12', discount_percentage: '25', image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800' }
                                            },
                                            {
                                                label: '🏆 Loyalty',
                                                data: { title: 'Loyalty Milestone', description: '₹200 off for our most active users (5+ bookings this month).', code: 'LOYALTY200', offer_type: 'VOLUME', min_monthly_bookings: '5', target_month: (new Date().getMonth() + 1).toString(), flat_discount: '200', min_booking_amount: '1000', image_url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800' }
                                            }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                className="preset-btn"
                                                onClick={() => setFormData({ ...formData, ...preset.data })}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="offer-form">
                                {/* SECTION: BASIC INFO */}
                                <div className="form-section">
                                    <div className="section-title"><i className="fas fa-info-circle"></i> Basic Information</div>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Offer Title</label>
                                            <div className="input-with-icon">
                                                <i className="fas fa-tag"></i>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    placeholder="e.g., Festive Season Sale"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Promo Code</label>
                                            <div className="code-input-wrapper">
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    placeholder="SAVE20"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="magic-btn"
                                                    onClick={() => {
                                                        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                                                        setFormData({ ...formData, code: `RH${randomCode}` });
                                                    }}
                                                >
                                                    <i className="fas fa-magic"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Offer Type</label>
                                            <select
                                                value={formData.offer_type}
                                                onChange={e => setFormData({ ...formData, offer_type: e.target.value })}
                                            >
                                                <option value="GENERAL">General (Public)</option>
                                                <option value="HOURLY">Hourly Bonus</option>
                                                <option value="VOLUME">Loyal Rider</option>
                                                <option value="CATEGORY">Category Specific</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION: DISCOUNT & CONSTRAINTS */}
                                <div className="form-section">
                                    <div className="section-title"><i className="fas fa-percentage"></i> Discount & Conditions</div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Discount Percentage (%)</label>
                                            <input
                                                type="number"
                                                value={formData.discount_percentage}
                                                onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Flat Discount (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.flat_discount}
                                                onChange={e => setFormData({ ...formData, flat_discount: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Min. Booking Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.min_booking_amount}
                                                onChange={e => setFormData({ ...formData, min_booking_amount: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Max Discount Cap (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.max_discount}
                                                onChange={e => setFormData({ ...formData, max_discount: e.target.value })}
                                                placeholder="No Limit"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Target Vehicle Category</label>
                                            <select
                                                value={formData.target_category}
                                                onChange={e => setFormData({ ...formData, target_category: e.target.value })}
                                            >
                                                <option value="ALL">All Vehicles</option>
                                                <option value="bike">Bikes Only</option>
                                                <option value="car">Cars Only</option>
                                                <option value="scooty">Scooty Only</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Max Usage Per User</label>
                                            <input
                                                type="number"
                                                value={formData.usage_limit_per_user}
                                                onChange={e => setFormData({ ...formData, usage_limit_per_user: e.target.value })}
                                                placeholder="1"
                                            />
                                        </div>

                                        {formData.offer_type === 'HOURLY' && (
                                            <div className="form-group full-width">
                                                <label>Minimum Duration Required (Hours)</label>
                                                <input
                                                    type="number"
                                                    value={formData.min_duration}
                                                    onChange={e => setFormData({ ...formData, min_duration: e.target.value })}
                                                    placeholder="e.g., 12"
                                                />
                                            </div>
                                        )}

                                        {formData.offer_type === 'VOLUME' && (
                                            <>
                                                <div className="form-group">
                                                    <label>Min. Monthly Bookings</label>
                                                    <input
                                                        type="number"
                                                        value={formData.min_monthly_bookings}
                                                        onChange={e => setFormData({ ...formData, min_monthly_bookings: e.target.value })}
                                                        placeholder="e.g., 5"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Target Month</label>
                                                    <select
                                                        value={formData.target_month}
                                                        onChange={e => setFormData({ ...formData, target_month: e.target.value })}
                                                    >
                                                        <option value="">Current Month</option>
                                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                                            <option key={m} value={i + 1}>{m}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION: SCHEDULING */}
                                <div className="form-section">
                                    <div className="section-title"><i className="fas fa-calendar-alt"></i> Schedule & Validity</div>
                                    <div className="form-group full-width">
                                        <label>Launch Type</label>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <button 
                                                type="button" 
                                                className={`preset-btn ${formData.launch_type === 'instant' ? 'active' : ''}`}
                                                style={{ flex: 1, background: formData.launch_type === 'instant' ? '#4f46e5' : 'white', color: formData.launch_type === 'instant' ? 'white' : '#1e293b' }}
                                                onClick={() => setFormData({ ...formData, launch_type: 'instant', valid_from: '' })}
                                            >
                                                ⚡ Instant Launch
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`preset-btn ${formData.launch_type === 'scheduled' ? 'active' : ''}`}
                                                style={{ flex: 1, background: formData.launch_type === 'scheduled' ? '#4f46e5' : 'white', color: formData.launch_type === 'scheduled' ? 'white' : '#1e293b' }}
                                                onClick={() => setFormData({ ...formData, launch_type: 'scheduled' })}
                                            >
                                                📅 Schedule for Later
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-grid" style={{ gridColumn: 'span 2' }}>
                                        {formData.launch_type === 'scheduled' && (
                                            <div className="form-group">
                                                <label>Launch Date & Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={formatDateForInput(formData.valid_from)}
                                                    onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                                    required={formData.launch_type === 'scheduled'}
                                                />
                                            </div>
                                        )}
                                        <div className="form-group" style={{ gridColumn: formData.launch_type === 'scheduled' ? 'auto' : 'span 2' }}>
                                            <label>Expiry Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={formatDateForInput(formData.valid_until)}
                                                onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                        <div className="form-group">
                                            <label>Valid Days</label>
                                            <div className="days-selector">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                                    const cleanDays = formData.valid_days ? formData.valid_days.toString().replace(/[\[\]]/g, '') : '';
                                                    const daysArray = cleanDays ? cleanDays.split(',').map(d => d.trim()) : [];
                                                    const isSelected = daysArray.includes(index.toString());

                                                    return (
                                                        <button
                                                            key={`${day}-${index}`}
                                                            type="button"
                                                            className={`day-btn ${isSelected ? 'active' : ''}`}
                                                            onClick={() => {
                                                                let newDays = isSelected
                                                                    ? daysArray.filter(d => d !== index.toString())
                                                                    : [...daysArray, index.toString()];
                                                                setFormData({ ...formData, valid_days: newDays.sort().join(',') });
                                                            }}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* IMPROVED TIME SELECTORS */}
                                        <div className="form-group">
                                            <label>Active From (Hour)</label>
                                            <select
                                                value={formData.valid_from_hour}
                                                onChange={e => setFormData({ ...formData, valid_from_hour: e.target.value })}
                                                className="modern-select"
                                            >
                                                <option value="">Any Time</option>
                                                {[...Array(24)].map((_, i) => (
                                                    <option key={i} value={i}>
                                                        {i === 0 ? '12 AM (Midnight)' : i === 12 ? '12 PM (Noon)' : i < 12 ? `${i} AM` : `${i - 12} PM`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Active Until (Hour)</label>
                                            <select
                                                value={formData.valid_to_hour}
                                                onChange={e => setFormData({ ...formData, valid_to_hour: e.target.value })}
                                                className="modern-select"
                                            >
                                                <option value="">Any Time</option>
                                                {[...Array(24)].map((_, i) => (
                                                    <option key={i} value={i}>
                                                        {i === 0 ? '12 AM (Midnight)' : i === 12 ? '12 PM (Noon)' : i < 12 ? `${i} AM` : `${i - 12} PM`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                {/* SECTION: MEDIA & TEXT */}
                                <div className="form-section">
                                    <div className="section-title"><i className="fas fa-image"></i> Media & Description</div>
                                    <div className="form-group">
                                        <label>Cover Image</label>
                                        <div className="media-upload-wrapper">
                                            <div className="image-preview-mini">
                                                {formData.image_url ? <img src={formData.image_url} alt="Preview" /> : <i className="fas fa-camera"></i>}
                                            </div>
                                            <div className="upload-controls">
                                                <input
                                                    type="text"
                                                    value={formData.image_url}
                                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                    placeholder="Paste image URL..."
                                                />
                                                <label className="upload-label">
                                                    <i className="fas fa-upload"></i>
                                                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Marketing Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Tell users why they should use this offer..."
                                            rows="3"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                                            <div style={{ position: 'relative', width: '44px', height: '24px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.broadcast}
                                                    onChange={e => setFormData({ ...formData, broadcast: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }} 
                                                />
                                                <span style={{ 
                                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                                                    backgroundColor: formData.broadcast ? '#4f46e5' : '#cbd5e1', 
                                                    transition: '0.4s', borderRadius: '34px' 
                                                }}></span>
                                                <span style={{ 
                                                    position: 'absolute', height: '18px', width: '18px', left: formData.broadcast ? '22px' : '4px', bottom: '3px', 
                                                    backgroundColor: 'white', transition: '0.4s', borderRadius: '50%' 
                                                }}></span>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#1e1b4b', fontSize: '14px' }}>Broadcast to all users</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Send a premium email notification to all registered customers</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="offer-form-footer">
                                    <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Discard</button>
                                    <button type="submit" className="submit-btn" disabled={loading}>
                                        {loading ? <i className="fas fa-spinner fa-spin"></i> : editingId ? 'Update Promotion' : 'Launch Promotion'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOffers;
