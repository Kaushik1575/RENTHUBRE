import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from './StatusPopup';

const GlobalAuthCheck = () => {
    const navigate = useNavigate();
    const [popup, setPopup] = useState({ isOpen: false, type: 'error', title: '', message: '' });

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user') || '{}');

                // Only check if user is logged in and not an admin
                if (!token || user.isAdmin) return;

                const response = await fetch('/api/bookings/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 403) {
                    const errorData = await response.json();
                    if (errorData.code === 'USER_BLOCKED') {
                        setPopup({
                            isOpen: true,
                            type: 'error',
                            title: 'Account Blocked',
                            message: 'Your account has been blocked by the administrator. You will be logged out.'
                        });
                    }
                } else if (response.status === 401) {
                    const errorData = await response.json();
                    // SESSION_TERMINATED means concurrent login happened elsewhere
                    if (errorData.code === 'SESSION_TERMINATED') {
                        setPopup({
                            isOpen: true,
                            type: 'info',
                            title: 'Session Expired',
                            message: 'You have logged in on another device. This session has been terminated.'
                        });
                    }
                }
            } catch (error) {
                // Silently fail - don't disrupt user experience
                console.error('Auth check failed:', error);
            }
        };

        // Check immediately on mount
        checkUserStatus();

        // Then check every 5 seconds
        const interval = setInterval(checkUserStatus, 5000);

        return () => clearInterval(interval);
    }, []);

    const handlePopupClose = () => {
        setPopup({ ...popup, isOpen: false });

        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <StatusPopup
            isOpen={popup.isOpen}
            onClose={handlePopupClose}
            type={popup.type}
            title={popup.title}
            message={popup.message}
        />
    );
};

export default GlobalAuthCheck;
