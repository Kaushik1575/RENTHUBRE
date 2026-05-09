import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';

const LoyaltySettings = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        earning_rate: 1,
        reward_threshold: 1000,
        system_enabled: 'true'
    });
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState({ isOpen: false, type: '', title: '', message: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/loyalty-settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/loyalty-settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Saved', message: 'Settings updated successfully!' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to update settings.' });
            }
        } catch (e) {
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Network error.' });
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                <button onClick={() => navigate('/admin')} style={{ marginRight: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h1 style={{ margin: 0 }}>Reward System Settings</h1>
            </div>

            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <form onSubmit={handleSubmit}>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>System Status</label>
                        <select
                            value={settings.system_enabled}
                            onChange={e => setSettings({ ...settings, system_enabled: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                            If disabled, users won't earn points and cannot redeem rewards.
                        </small>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Earning Rate (Points per Minute)</label>
                        <input
                            type="number"
                            value={settings.earning_rate}
                            onChange={e => setSettings({ ...settings, earning_rate: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            min="0.1" step="0.1"
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                            How many reward points a user earns for every minute of a completed ride.
                        </small>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Reward Threshold (Points needed for Free Ride)</label>
                        <input
                            type="number"
                            value={settings.reward_threshold}
                            onChange={e => setSettings({ ...settings, reward_threshold: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            min="100"
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                            Points required to redeem a "Free 2-Hour Ride" coupon.
                        </small>
                    </div>

                    <button
                        type="submit"
                        style={{
                            padding: '12px 30px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        Save Changes
                    </button>
                </form>
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

export default LoyaltySettings;
