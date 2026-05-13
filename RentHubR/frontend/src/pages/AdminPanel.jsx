import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import { Scanner } from '@yudiel/react-qr-scanner';
import './AdminPanelStyles.css';
import AdminIssues from '../components/AdminIssues';
import AdminOffers from '../components/AdminOffers';


const AdminPanel = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [adminUser, setAdminUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [activeTab, setActiveTab] = useState('dashboard');

    // Stats
    const [stats, setStats] = useState({
        totalVehicles: 0, pendingBookings: 0, todaysBookings: 0, activeUsers: 0,
        confirmedBookings: 0, totalBookingsMonth: 0, cancelledBookings: 0, pendingRefunds: 0,
        activeOffers: 0,
        recentActivity: []
    });

    // Users
    const [users, setUsers] = useState([]);
    const [usersFilter, setUsersFilter] = useState('');

    // Bookings
    const [bookings, setBookings] = useState([]);
    const [bookingsSearch, setBookingsSearch] = useState('');
    const [bookingsStatusFilter, setBookingsStatusFilter] = useState('');
    const [bookingsDateFilter, setBookingsDateFilter] = useState('');

    // Vehicles
    const [vehicles, setVehicles] = useState([]);
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [requests, setRequests] = useState([]); // New state for requests
    const [earnings, setEarnings] = useState([]); // Sponsor Earnings
    const [withdrawalRequests, setWithdrawalRequests] = useState([]); // Withdrawal Requests
    const [withdrawalFilter, setWithdrawalFilter] = useState('pending'); // 'pending', 'approved', 'history', 'all'
    const [deliveryAgents, setDeliveryAgents] = useState([]);
    const [agentSearch, setAgentSearch] = useState('');

    // Modals State
    const [modal, setModal] = useState({ type: null, data: null }); // type: 'viewBooking', 'editBooking', etc.

    // Form Data States for Modals
    const [editBookingData, setEditBookingData] = useState({});
    const [editUserData, setEditUserData] = useState({});
    const [vehicleFormData, setVehicleFormData] = useState({});

    const [scanInput, setScanInput] = useState('');
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token || !adminUser || !adminUser.adminId) {
            navigate('/login');
            return;
        }
        loadDashboardStats();
    }, [token, navigate, adminUser]);

    useEffect(() => {
        if (activeTab === 'dashboard') loadDashboardStats();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'bookings') {
            loadBookings();
            loadDeliveryAgents();
            // Refresh agents every 15s while on bookings tab
            const interval = setInterval(loadDeliveryAgents, 15000);
            return () => clearInterval(interval);
        }
        if (activeTab === 'vehicles') loadVehicles();
        if (activeTab === 'requests') loadRequests(); // Load requests
        if (activeTab === 'policies') loadPolicies();
        if (activeTab === 'earnings') loadEarnings();
        if (activeTab === 'withdrawals') {
            loadWithdrawalRequests();
            loadEarnings(); // Load earnings to show balance context
        }
        if (activeTab === 'agents') loadDeliveryAgents();
    }, [activeTab]);

    const loadDashboardStats = async () => {
        try {
            const res = await fetch('/api/dashboard-stats', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to load stats", e);
        }
    };

    const loadUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const loadBookings = async (page = 1) => {
        try {
            const res = await fetch(`/api/admin/bookings?page=${page}&limit=50`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const result = await res.json();
                if (Array.isArray(result)) setBookings(result);
                else if (result.data) setBookings(result.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadVehicles = async () => {
        try {
            const res = await fetch('/api/admin/vehicles', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setVehicles(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const loadRequests = async () => {
        try {
            const res = await fetch('/api/admin/vehicle-requests', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setRequests(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const loadEarnings = async () => {
        try {
            const res = await fetch('/api/admin/sponsor-earnings', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setEarnings(await res.json());
        } catch (e) { console.error(e); }
    };

    // Filtered Vehicles
    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(vehicleSearch.toLowerCase()) || 
                             v.id.toString().includes(vehicleSearch) ||
                             (v.category && v.category.toLowerCase().includes(vehicleSearch.toLowerCase()));
        const matchesType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;
        return matchesSearch && matchesType;
    });

    const loadWithdrawalRequests = async () => {
        try {
            const res = await fetch('/api/admin/withdrawal/requests', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setWithdrawalRequests(data.requests || []);
            }
        } catch (e) { console.error('Error loading withdrawals', e); }
    };

    const loadDeliveryAgents = async () => {
        try {
            const res = await fetch('/api/admin/delivery-agents', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setDeliveryAgents(await res.json());
        } catch (e) { console.error('Error loading agents', e); }
    };

    const handleAssignAgent = async (bookingId, agentId) => {
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/assign-agent`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agentId })
            });
            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Assigned', message: 'Delivery agent assigned successfully' });
                loadBookings();
                setModal({ type: null });
            }
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to assign agent' });
        }
    };

    const handleApproveAgent = async (id) => {
        try {
            const res = await fetch(`/api/admin/delivery-agents/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Approved', message: 'Agent has been approved and notified.' });
                loadDeliveryAgents();
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to remove this agent application?')) return;
        try {
            const res = await fetch(`/api/admin/delivery-agents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Removed', message: 'Agent application deleted.' });
                loadDeliveryAgents();
            }
        } catch (e) { console.error(e); }
    };

    const handleWithdrawalAction = async (id, status) => {
        try {
            const res = await fetch(`/api/admin/withdrawal/requests/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Success', message: `Withdrawal request ${status}` });
                loadWithdrawalRequests(); // Reload list
                loadEarnings(); // Reload earnings to update balance
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to update status' });
            }
        } catch (e) {
            console.error('Error updating withdrawal:', e);
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Something went wrong' });
        }
    };

    const loadPolicies = () => {
        // Static content for now or fetch if API exists
    };

    // --- Actions ---

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // User Actions
    // User Actions
    const executeBlockUser = async () => {
        const { userId, isBlocked } = modal.data;
        try {
            const res = await fetch(`/api/admin/users/${userId}/block`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBlocked: !isBlocked })
            });
            if (res.ok) {
                loadUsers();
                setModal({ type: null });
                setPopup({ isOpen: true, type: 'success', title: 'Success', message: `User ${isBlocked ? 'unblocked' : 'blocked'} successfully` });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Action Failed', message: 'Failed to update status' });
            }
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error updating status' }); }
    };

    const handleBlockUser = (userId, isBlocked) => {
        setModal({ type: 'confirmBlockUser', data: { userId, isBlocked } });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/admin/users/${editUserData.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(editUserData)
            });
            if (res.ok) {
                setModal({ type: null });
                loadUsers();
                setPopup({ isOpen: true, type: 'success', title: 'User Updated', message: 'User details updated successfully' });
            } else {
                const d = await res.json();
                setPopup({ isOpen: true, type: 'error', title: 'Update Failed', message: d.error || 'Failed update' });
            }
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error updating' }); }
    };

    // Booking Actions
    const handleConfirmBooking = async (id) => {
        try {
            await fetch(`/api/admin/bookings/${id}/confirm`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            loadBookings();
            setPopup({ isOpen: true, type: 'success', title: 'Confirmed', message: 'Booking confirmed successfully' });
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error confirming' }); }
    };



    const handleDeleteBooking = async (id) => {
        try {
            await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            setModal({ type: null });
            loadBookings();
            setPopup({ isOpen: true, type: 'success', title: 'Deleted', message: 'Booking deleted successfully' });
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error deleting' }); }
    };

    const handleUpdateBooking = async (e) => {
        e.preventDefault();
        try {
            await fetch(`/api/admin/bookings/${editBookingData.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(editBookingData)
            });
            setModal({ type: null });
            loadBookings();
            setPopup({ isOpen: true, type: 'success', title: 'Updated', message: 'Booking updated successfully' });
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error updating' }); }
    };

    const executeRefundComplete = async () => {
        try {
            await fetch(`/api/admin/bookings/${modal.data.id}/refund-complete`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            loadBookings();
            setModal({ type: null });
            setPopup({ isOpen: true, type: 'success', title: 'Refunded', message: 'Refund marked as complete' });
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error processing refund' }); }
    };

    const handleRefundComplete = (id) => {
        setModal({ type: 'confirmRefundComplete', data: { id } });
    };

    const executeSendSOS = async () => {
        try {
            const res = await fetch('/api/admin/send-sos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: modal.data.id })
            });
            const d = await res.json();
            setModal({ type: null });
            if (res.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'SOS Sent', message: d.message });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'SOS Failed', message: d.error });
            }
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error sending SOS' }); }
    };

    const handleSendSOS = (id) => {
        setModal({ type: 'confirmSOS', data: { id } });
    };

    // QR Scan Action
    const handleScanQR = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/scan-qr', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: (typeof scanInput === 'string' ? scanInput : scanInput.text).trim() })
            });
            const data = await res.json();

            if (res.ok) {
                setModal({ type: null });
                setScanInput('');
                loadBookings(); // Refresh list

                if (data.type === 'ride_end') {
                    // Show detailed summary for ride end
                    const balance = data.data.totalPayable;
                    const isRefund = balance < 0;

                    const summary = `Ride Ended Successfully!
--------------------------------
Date: ${data.data.rideEndTime}
Status: COMPLETED
--------------------------------
Time Used: ${data.data.durationText}
Actual Amount: ₹${data.data.totalBaseAmount}
Advance Paid: ₹${data.data.advancePaid}
--------------------------------
${isRefund ? `REFUND CUSTOMER: ₹${Math.abs(balance)}` : `COLLECT AMOUNT: ₹${balance}`}
`;
                    setPopup({ isOpen: true, type: 'success', title: 'Ride Completed', message: summary });
                } else if (data.type === 'already_completed') {
                    // Show info for already completed rides
                    const balance = data.data.balance;
                    const isRefund = balance < 0;
                    const summary = `This ride was already completed.
--------------------------------
Booking ID: ${data.data.bookingId}
Status: ${data.data.status}
--------------------------------
Total Amount: ₹${data.data.totalAmount}
Advance Paid: ₹${data.data.advancePaid}
${isRefund ? `Refund: ₹${Math.abs(balance)}` : `Balance: ₹${balance}`}
`;
                    setPopup({ isOpen: true, type: 'success', title: 'Already Completed', message: summary });
                } else {
                    // Ride Start or others
                    setPopup({ isOpen: true, type: 'success', title: 'Success', message: data.message });
                }
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Scan Failed', message: data.error || 'Failed to process QR code' });
            }
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Network or Server Error' });
        }
    };

    // Vehicle Actions
    const executeDeleteVehicle = async () => {
        const { id, type } = modal.data;
        try {
            await fetch(`/api/admin/vehicles/${type}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            loadVehicles();
            setModal({ type: null });
            setPopup({ isOpen: true, type: 'success', title: 'Deleted', message: 'Vehicle deleted successfully' });
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error deleting vehicle' }); }
    };

    const handleDeleteVehicle = (id, type) => {
        setModal({ type: 'confirmDeleteVehicle', data: { id, type } });
    };

    const handleVehicleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const isEdit = !!vehicleFormData.id;
        const url = isEdit
            ? `/api/admin/vehicles/${vehicleFormData.type}/${vehicleFormData.id}`
            : `/api/admin/vehicles/${vehicleFormData.type}`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleFormData)
            });

            const data = await res.json();

            if (res.ok) {
                if (data.alreadyApproved) {
                    setPopup({ isOpen: true, type: 'success', title: 'Already Approved', message: data.message });
                } else {
                    setPopup({ isOpen: true, type: 'success', title: isEdit ? 'Updated' : 'Added', message: `Vehicle ${isEdit ? 'updated' : 'added'} successfully` });
                }
                setModal({ type: null });
                loadVehicles();
                if (activeTab === 'requests') loadRequests();
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Action Failed', message: data.error || 'Operation failed' });
            }
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error saving vehicle' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveRequest = (request) => {
        setVehicleFormData({
            name: request.name || '',
            type: request.vehicleType || 'bike',
            model: request.model || '',
            year: request.year || '',
            registration_number: request.registration_number || '',
            price: request.price || '',
            category: 'Standard', // Default
            status: 'available',
            image_url: request.image_url || '',
            requestId: request.id
        });
        setModal({ type: 'addVehicle' });
    };

    const executeRejectRequest = async (id) => {
        try {
            const res = await fetch(`/api/admin/vehicle-requests/${id}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadRequests();
                setModal({ type: null });
                setPopup({ isOpen: true, type: 'success', title: 'Rejected', message: 'Request rejected/removed' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to reject' });
            }
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error rejecting request' }); }
    };

    const handleRejectRequest = (id) => {
        setModal({ type: 'confirmRejectRequest', data: { id } });
    };

    const executeDeleteRequest = async (id) => {
        try {
            const res = await fetch(`/api/admin/vehicle-requests/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadRequests();
                setModal({ type: null });
                setPopup({ isOpen: true, type: 'success', title: 'Deleted', message: 'Request deleted' });
            } else {
                setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete' });
            }
        } catch (e) { setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error deleting request' }); }
    };

    const handleDeleteRequest = (id) => {
        setModal({ type: 'confirmDeleteRequest', data: { id } });
    };

    // --- Filtering ---
    const filteredUsers = users.filter(u => {
        const s = usersFilter.toLowerCase();
        return !s ||
            (u.fullName || '').toLowerCase().includes(s) ||
            (u.email || '').toLowerCase().includes(s) ||
            (u.phoneNumber || '').includes(s);
    });

    const filteredBookings = bookings.filter(b => {
        const s = bookingsSearch.toLowerCase();
        const matchSearch = !s ||
            (b.customerName || '').toLowerCase().includes(s) ||
            (b.vehicleName || '').toLowerCase().includes(s) ||
            (b.booking_id || '').toLowerCase().includes(s) ||
            String(b.id).includes(s);
        const matchStatus = !bookingsStatusFilter || (b.status || '').toLowerCase() === bookingsStatusFilter;
        const matchDate = !bookingsDateFilter || b.start_date === bookingsDateFilter;
        return matchSearch && matchStatus && matchDate;
    });

    // --- Helper for formatting dates ---
    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="admin-body">
            <div className="admin-mobile-header">
                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
                </button>
                <h2>Admin</h2>
            </div>
            <div className={`admin-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                {/* Overlay for mobile */}
                {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

                <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Admin</h2>
                        <span className="admin-name-sub">{adminUser.adminName}</span>
                    </div>
                    <nav className="sidebar-nav">
                        <ul>
                            <li><a className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}><i className="fas fa-tachometer-alt"></i> Dashboard</a></li>
                            <li><a className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}><i className="fas fa-users"></i> User Management</a></li>
                            <li><a className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false); }}><i className="fas fa-calendar-check"></i> Bookings</a></li>
                            <li><a className={`nav-link ${activeTab === 'vehicles' ? 'active' : ''}`} onClick={() => { setActiveTab('vehicles'); setIsSidebarOpen(false); }}><i className="fas fa-motorcycle"></i> Vehicles</a></li>
                            <li><a className={`nav-link ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => { setActiveTab('offers'); setIsSidebarOpen(false); }}><i className="fas fa-gift"></i> Manage Offers</a></li>
                            <li><a className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => { setActiveTab('requests'); setIsSidebarOpen(false); }}><i className="fas fa-clipboard-list"></i> Requests {requests.length > 0 && <span className="badge">{requests.length}</span>}</a></li>
                            <li><a className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => { setActiveTab('policies'); setIsSidebarOpen(false); }}><i className="fas fa-file-alt"></i> Policies</a></li>
                            <li><a className={`nav-link ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => { setActiveTab('earnings'); setIsSidebarOpen(false); }}><i className="fas fa-chart-line"></i> Sponsor Reports</a></li>
                            <li><a className={`nav-link ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => { setActiveTab('withdrawals'); setIsSidebarOpen(false); }}><i className="fas fa-money-bill-wave"></i> Withdrawals</a></li>
                            <li><a className={`nav-link ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => { setActiveTab('issues'); setIsSidebarOpen(false); }}><i className="fas fa-headset"></i> Support Issues</a></li>
                            <li><a className={`nav-link ${activeTab === 'agents' ? 'active' : ''}`} onClick={() => { setActiveTab('agents'); setIsSidebarOpen(false); }}><i className="fas fa-truck"></i> Delivery Agents</a></li>
                        </ul>
                    </nav>
                    <div className="sidebar-footer">
                        <a onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</a>
                    </div>
                </aside>

                <main className="admin-content">
                    {/* DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div id="dashboard" className="content-section active">
                            <h3>Dashboard</h3>
                            <div className="dashboard-cards">
                                <div className="card"><div className="card-icon"><i className="fas fa-car"></i></div><div className="card-info"><h4>Total Vehicles</h4><p>{stats.totalVehicles}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-clock"></i></div><div className="card-info"><h4>Pending Confirmations</h4><p>{stats.pendingBookings}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-calendar-day"></i></div><div className="card-info"><h4>Today's Bookings</h4><p>{stats.todaysBookings}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-users"></i></div><div className="card-info"><h4>Active Users</h4><p>{stats.activeUsers}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-motorcycle"></i></div><div className="card-info"><h4>Confirmed Bookings</h4><p>{stats.confirmedBookings}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-calendar-alt"></i></div><div className="card-info"><h4>Monthly Bookings</h4><p>{stats.totalBookingsMonth}</p></div></div>
                                <div className="card" onClick={() => setActiveTab('offers')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #fff 0%, #f5f3ff 100%)' }}><div className="card-icon" style={{ color: '#4f46e5' }}><i className="fas fa-gift"></i></div><div className="card-info"><h4>Active Offers</h4><p>{stats.activeOffers || 0}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-ban"></i></div><div className="card-info"><h4>Cancelled Bookings</h4><p>{stats.cancelledBookings}</p></div></div>
                                <div className="card"><div className="card-icon"><i className="fas fa-hand-holding-usd"></i></div><div className="card-info"><h4>Pending Refunds</h4><p>{stats.pendingRefunds}</p></div></div>
                            </div>
                            <div className="recent-activity">
                                <h3>Recent Activity</h3>
                                <div className="activity-log">
                                    {stats.recentActivity && stats.recentActivity.length > 0 ? stats.recentActivity.map((act, i) => (
                                        <div key={i} className={`activity-item ${act.type}`}>
                                            <div className="activity-icon-wrapper">
                                                {act.type === 'confirmed' ? <i className="fas fa-check-circle"></i> :
                                                    act.type === 'cancelled' ? <i className="fas fa-times-circle"></i> :

                                                        <i className="fas fa-plus-circle"></i>}
                                            </div>
                                            <div className="activity-content">
                                                <span className="activity-desc">{act.description}</span>
                                                <span className="activity-time">{formatDate(act.timestamp)}</span>
                                            </div>
                                        </div>
                                    )) : <div className="no-activity">No recent activity</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div id="users" className="content-section active">
                            <div className="section-header-modern">
                                <div>
                                    <h2>User Directory</h2>
                                    <p className="section-subtitle">Manage system users and administrators</p>
                                </div>
                            </div>

                            <div className="inventory-controls">
                                <div className="search-box-modern">
                                    <i className="fas fa-search"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Search by name, email, or phone..." 
                                        value={usersFilter} 
                                        onChange={e => setUsersFilter(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="modern-table-card">
                                <div className="table-responsive">
                                    <table className="modern-data-table">
                                        <thead>
                                            <tr>
                                                <th>User Profile</th>
                                                <th>Contact Info</th>
                                                <th>Access Level</th>
                                                <th>Account Status</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5">
                                                        <div className="no-results">
                                                            <i className="fas fa-users-slash"></i>
                                                            <p>No users found matching your search.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.map(u => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div className="user-profile-cell">
                                                            <div className="user-avatar-circle">
                                                                {(u.fullName || u.adminName || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="user-meta">
                                                                <span className="u-name">{u.fullName || u.adminName || 'Unknown User'}</span>
                                                                <span className="u-id">User ID: #{u.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="contact-cell-modern">
                                                            <span className="contact-info-bit"><i className="fas fa-envelope"></i> {u.email}</span>
                                                            <span className="contact-info-bit"><i className="fas fa-phone"></i> {u.phoneNumber || 'No phone'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`role-pill ${u.isAdmin ? 'admin' : 'user'}`}>
                                                            {u.isAdmin ? <><i className="fas fa-user-shield"></i> Admin</> : <><i className="fas fa-user"></i> User</>}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${u.isBlocked ? 'busy' : 'available'}`}>
                                                            {u.isBlocked ? 'Blocked' : 'Active'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="actions-cell">
                                                            <button className="icon-btn-modern view" onClick={() => setModal({ type: 'viewUser', data: u })} title="View Profile">
                                                                <i className="fas fa-eye"></i>
                                                            </button>
                                                            <button className="icon-btn-modern edit" onClick={() => { setEditUserData(u); setModal({ type: 'editUser' }); }} title="Edit User">
                                                                <i className="fas fa-user-edit"></i>
                                                            </button>
                                                            <button 
                                                                className={`icon-btn-modern ${u.isBlocked ? 'available' : 'delete'}`} 
                                                                style={u.isBlocked ? { background: '#ecfdf5', color: '#10b981' } : {}}
                                                                onClick={() => handleBlockUser(u.id, u.isBlocked)} 
                                                                title={u.isBlocked ? 'Unblock User' : 'Block User'}
                                                            >
                                                                <i className={`fas ${u.isBlocked ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOOKINGS */}
                    {activeTab === 'bookings' && (
                        <div id="bookings" className="content-section active">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h2 style={{ margin: 0 }}>Bookings</h2>
                                <button onClick={() => loadBookings()} style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fas fa-sync-alt"></i> Refresh List
                                </button>
                            </div>
                            <div className="booking-filters">
                                <div><label>Search:</label><input type="text" placeholder="Name, Vehicle, or ID" value={bookingsSearch} onChange={e => setBookingsSearch(e.target.value)} /></div>
                                <div>
                                    <label>Status:</label>
                                    <select value={bookingsStatusFilter} onChange={e => setBookingsStatusFilter(e.target.value)}>
                                        <option value="">All</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="ride_started">Ride Started</option>
                                        <option value="ride_completed">Ride Completed</option>
                                        <option value="cancelled">Cancelled</option>

                                    </select>
                                </div>
                                <div><label>Start Date:</label><input type="date" value={bookingsDateFilter} onChange={e => setBookingsDateFilter(e.target.value)} /></div>
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button className="action-btn" style={{ background: '#333', color: '#fff' }} onClick={() => { setScanInput(''); setModal({ type: 'scanQR' }); }}>
                                        <i className="fas fa-qrcode"></i> Scan QR
                                    </button>
                                </div>
                            </div>
                            <div className="table-container">
                                <table id="bookings-table">
                                    <thead><tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Start Date</th><th>Duration</th><th>Amount</th><th>Status</th><th>Refund</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filteredBookings.map(b => (
                                            <tr key={b.id}>
                                                <td>{b.booking_id || `#${b.id}`}</td>
                                                <td>
                                                    {b.customerName}
                                                    {b.delivery_option === 'home_delivery' && (
                                                        <span style={{ display: 'block', fontSize: '0.75rem', background: '#fff7ed', color: '#9a3412', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ffedd5', marginTop: '4px', width: 'fit-content' }}>
                                                            <i className="fas fa-truck"></i> Home Delivery
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{b.vehicleName}</td>
                                                <td>{b.start_date}</td>
                                                <td>{b.duration} hrs</td>
                                                <td>₹{b.total_amount}</td>
                                                {/* Points column data removed */}
                                                <td><span className={`status-badge status-${(b.status || 'pending').toLowerCase()}`}>{b.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></td>
                                                <td>
                                                    {(b.status === 'cancelled') ? (
                                                        <div className="refund-info">
                                                            <p><strong>Refund:</strong> ₹{b.refund_amount}</p>
                                                            <p><strong>Status:</strong> {b.refund_status}</p>
                                                            {b.transaction_id && (
                                                                <p style={{ fontSize: '0.85em', color: '#666' }}>
                                                                    <strong>Payment ID:</strong><br />
                                                                    {b.transaction_id}
                                                                </p>
                                                            )}
                                                            {b.refund_id && (
                                                                <p style={{ fontSize: '0.85em', color: '#4CAF50' }}>
                                                                    <strong>Refund ID:</strong><br />
                                                                    {b.refund_id}
                                                                </p>
                                                            )}
                                                            {/* Show Refund Details if present */}
                                                            {b.refund_details && (
                                                                <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#555', background: '#f5f5f5', padding: '5px', borderRadius: '4px' }}>
                                                                    {(b.refund_details.method === 'upi' || b.refund_details.method === 'UPI') && (
                                                                        <p><strong>UPI:</strong> {b.refund_details.upiId}</p>
                                                                    )}
                                                                    {(b.refund_details.method === 'bank' || b.refund_details.method === 'Bank') && (
                                                                        <>
                                                                            <p><strong>Bank:</strong> {b.refund_details.accountNumber}</p>
                                                                            <p><strong>IFSC:</strong> {b.refund_details.ifsc}</p>
                                                                            <p><strong>Holder:</strong> {b.refund_details.accountHolder}</p>
                                                                        </>
                                                                    )}
                                                                    {b.refund_details.method === 'auto_razorpay' && (
                                                                        <p className="text-muted" style={{ fontStyle: 'italic', color: '#2196F3' }}>
                                                                            ✓ Auto-Refund
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : 'N/A'}
                                                </td>
                                                <td>
                                                    <div className="action-buttons-container">
                                                        <button className="action-btn btn-view" onClick={() => setModal({ type: 'viewBooking', data: b })}><i className="fas fa-eye"></i> View</button>
                                                        {b.status === 'pending' && (
                                                            <>
                                                                <button className="action-btn btn-confirm" onClick={() => handleConfirmBooking(b.id)}>Confirm</button>

                                                            </>
                                                        )}
                                                        {(['confirmed', 'cancelled', 'ride_started', 'ride_completed', 'completed'].includes(b.status)) && (
                                                            <>
                                                                <button className="action-btn btn-edit" onClick={() => { setEditBookingData(b); setModal({ type: 'editBooking' }); }}><i className="fas fa-edit"></i> Edit</button>
                                                                <button className="action-btn btn-delete" onClick={() => { setModal({ type: 'deleteBooking', data: b }) }}><i className="fas fa-trash"></i> Delete</button>
                                                            </>
                                                        )}
                                                        {(() => {
                                                            // Case-insensitive check for SOS button visibility
                                                            const s = (b.status || '').toLowerCase();
                                                            if (s === 'confirmed' || s === 'ride_started') {
                                                                return (
                                                                    <button className="action-btn btn-sos" onClick={() => handleSendSOS(b.id)}>
                                                                        <i className="fas fa-exclamation-triangle"></i> SOS
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        {(['cancelled'].includes(b.status) && b.refund_status === 'processing') &&
                                                            <button className="action-btn btn-confirm-refund" onClick={() => handleRefundComplete(b.id)}><i className="fas fa-check"></i> Ref. Done</button>
                                                        }
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VEHICLES */}
                    {activeTab === 'vehicles' && (
                        <div id="vehicles" className="content-section active">
                            <div className="section-header-modern">
                                <div>
                                    <h2>Vehicles Inventory</h2>
                                    <p className="section-subtitle">Manage and track all rental fleet</p>
                                </div>
                                <button className="add-vehicle-btn" onClick={() => { setVehicleFormData({ type: 'bike' }); setModal({ type: 'addVehicle' }); }}>
                                    <i className="fas fa-plus"></i> Add New Vehicle
                                </button>
                            </div>

                            <div className="inventory-controls">
                                <div className="search-box-modern">
                                    <i className="fas fa-search"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Search by name, ID, or category..." 
                                        value={vehicleSearch} 
                                        onChange={(e) => setVehicleSearch(e.target.value)} 
                                    />
                                </div>
                                <div className="filter-group-modern">
                                    <button 
                                        className={`filter-pill ${vehicleTypeFilter === 'all' ? 'active' : ''}`} 
                                        onClick={() => setVehicleTypeFilter('all')}
                                    >All</button>
                                    <button 
                                        className={`filter-pill ${vehicleTypeFilter === 'bike' ? 'active' : ''}`} 
                                        onClick={() => setVehicleTypeFilter('bike')}
                                    ><i className="fas fa-motorcycle"></i> Bikes</button>
                                    <button 
                                        className={`filter-pill ${vehicleTypeFilter === 'car' ? 'active' : ''}`} 
                                        onClick={() => setVehicleTypeFilter('car')}
                                    ><i className="fas fa-car"></i> Cars</button>
                                    <button 
                                        className={`filter-pill ${vehicleTypeFilter === 'scooty' ? 'active' : ''}`} 
                                        onClick={() => setVehicleTypeFilter('scooty')}
                                    ><i className="fas fa-moped"></i> Scooters</button>
                                </div>
                            </div>

                            <div className="modern-table-card">
                                <div className="table-responsive">
                                    <table className="modern-data-table">
                                        <thead>
                                            <tr>
                                                <th>Vehicle Info</th>
                                                <th>Specs</th>
                                                <th>Price / Hr</th>
                                                <th>Status</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredVehicles.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5">
                                                        <div className="no-results">
                                                            <i className="fas fa-search"></i>
                                                            <p>No vehicles match your search criteria.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredVehicles.map(v => (
                                                <tr key={v.id}>
                                                    <td>
                                                        <div className="vehicle-cell">
                                                            <div className="vehicle-thumb">
                                                                {v.image_url ? (
                                                                    <img src={v.image_url} alt={v.name} />
                                                                ) : (
                                                                    <i className={`fas ${v.type === 'car' ? 'fa-car' : 'fa-motorcycle'}`}></i>
                                                                )}
                                                            </div>
                                                            <div className="vehicle-meta">
                                                                <span className="v-name">{v.name}</span>
                                                                <span className="v-id">ID: #{v.id} • {v.category || 'Standard'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="specs-cell">
                                                            <span className="spec-item"><i className="fas fa-tag"></i> {v.type}</span>
                                                            <span className="spec-item"><i className="fas fa-cog"></i> {v.engine || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="price-tag-modern">₹{v.price}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${v.status === 'Available' ? 'available' : 'busy'}`}>
                                                            {v.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="actions-cell">
                                                            <button className="icon-btn-modern view" onClick={() => setModal({ type: 'viewVehicle', data: v })} title="View Details">
                                                                <i className="fas fa-eye"></i>
                                                            </button>
                                                            <button className="icon-btn-modern edit" onClick={() => { setVehicleFormData(v); setModal({ type: 'editVehicle' }); }} title="Edit Vehicle">
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button className="icon-btn-modern delete" onClick={() => handleDeleteVehicle(v.id, v.type)} title="Delete Vehicle">
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REQUESTS */}
                    {activeTab === 'requests' && (
                        <div id="requests" className="content-section active">
                            <h2>Vehicle Requests</h2>
                            <div className="requests-container">
                                {requests.length === 0 ? (
                                    <div className="no-data-card">
                                        <i className="fas fa-clipboard-list"></i>
                                        <p>No pending vehicle requests found.</p>
                                    </div>
                                ) : (
                                    <div className="requests-grid">
                                        {requests.map(r => (
                                            <div key={r.id} className="request-card">
                                                <div className="req-header">
                                                    <div className="req-title">
                                                        <h4>{r.name}</h4>
                                                        <span className="req-model">{r.model} • {r.year}</span>
                                                    </div>
                                                    <div className="req-badges">
                                                        <span className={`status-badge status-${(r.vehicleType || 'bike').toLowerCase()}`}>{r.vehicleType}</span>
                                                        <span className="price-badge">₹{r.price}<small>/hr</small></span>
                                                    </div>
                                                </div>

                                                <div className="req-body">
                                                    <div className="req-info-row">
                                                        <div className="req-info-item">
                                                            <label>Sponsor</label>
                                                            <p><i className="fas fa-user-tie"></i> {r.sponsors?.full_name || 'N/A'}</p>
                                                        </div>
                                                        <div className="req-info-item">
                                                            <label>Contact</label>
                                                            <p><i className="fas fa-phone-alt"></i> {r.phone_number || r.sponsors?.phone_number || 'N/A'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="req-docs-section">
                                                        <label>Documents Provided:</label>
                                                        <div className="req-docs-list">
                                                            {r.image_url ? (
                                                                <a href={r.image_url} target="_blank" rel="noreferrer" className="doc-chip photo">
                                                                    <i className="fas fa-camera"></i> Photo
                                                                </a>
                                                            ) : <span className="doc-chip missing">Missing Photo</span>}

                                                            {r.rc_url ? (
                                                                <a href={r.rc_url} target="_blank" rel="noreferrer" className="doc-chip rc">
                                                                    <i className="fas fa-file-invoice"></i> RC Book
                                                                </a>
                                                            ) : <span className="doc-chip missing">Missing RC</span>}

                                                            {r.insurance_url ? (
                                                                <a href={r.insurance_url} target="_blank" rel="noreferrer" className="doc-chip insurance">
                                                                    <i className="fas fa-shield-alt"></i> Insurance
                                                                </a>
                                                            ) : <span className="doc-chip missing">Missing Insr.</span>}

                                                            {r.puc_url ? (
                                                                <a href={r.puc_url} target="_blank" rel="noreferrer" className="doc-chip puc">
                                                                    <i className="fas fa-smog"></i> PUC
                                                                </a>
                                                            ) : <span className="doc-chip missing">Missing PUC</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="req-footer" style={{ borderTop: '1px solid #eee', marginTop: '15px', paddingTop: '15px' }}>
                                                    {r.status === 'approved' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            <div style={{ width: '100%', textAlign: 'center', color: '#28a745', fontWeight: 'bold', fontSize: '1.1rem', padding: '8px', background: '#e6fffa', borderRadius: '6px' }}>
                                                                <i className="fas fa-check-circle"></i> Approved
                                                            </div>
                                                            <button className="req-btn reject" style={{ width: '100%', background: '#dc3545', color: '#fff', border: 'none' }} onClick={() => handleDeleteRequest(r.id)}>
                                                                <i className="fas fa-trash"></i> Delete Request
                                                            </button>
                                                        </div>
                                                    ) : r.status === 'rejected' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            <div style={{ width: '100%', textAlign: 'center', color: '#e53e3e', fontWeight: 'bold', fontSize: '1.1rem', padding: '8px', background: '#fff5f5', borderRadius: '6px' }}>
                                                                <i className="fas fa-times-circle"></i> Rejected
                                                            </div>
                                                            <button className="req-btn reject" style={{ width: '100%', background: '#dc3545', color: '#fff', border: 'none' }} onClick={() => handleDeleteRequest(r.id)}>
                                                                <i className="fas fa-trash"></i> Delete Request
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button className="req-btn approve" onClick={() => handleApproveRequest(r)}>
                                                                <i className="fas fa-check-circle"></i> Approve Request
                                                            </button>
                                                            <button className="req-btn reject" onClick={() => handleRejectRequest(r.id)}>
                                                                <i className="fas fa-times-circle"></i> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EARNINGS */}
                    {activeTab === 'earnings' && (
                        <div id="earnings" className="content-section active">
                            <h2>Sponsor Earnings Report</h2>

                            {/* Summary Dashboard Logic */}
                            {(() => {
                                const totalRevenueAll = earnings.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
                                const sponsorShareAll = earnings.reduce((sum, e) => sum + (e.sponsorShare || 0), 0);
                                const platformShareAll = earnings.reduce((sum, e) => sum + (e.platformShare || 0), 0);
                                const withdrawnAll = earnings.reduce((sum, e) => sum + (e.totalWithdrawn || 0), 0);
                                const pendingBalanceAll = earnings.reduce((sum, e) => sum + (e.currentBalance || 0), 0);

                                return (
                                    <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                        <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #4299e1' }}>
                                            <div style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '5px', fontWeight: '500' }}>TOTAL REVENUE</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>₹{totalRevenueAll.toLocaleString()}</div>
                                        </div>
                                        <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #48bb78' }}>
                                            <div style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '5px', fontWeight: '500' }}>SPONSOR SHARE (70%)</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>₹{sponsorShareAll.toLocaleString()}</div>
                                        </div>
                                        <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #ed8936' }}>
                                            <div style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '5px', fontWeight: '500' }}>PLATFORM FEE (30%)</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>₹{platformShareAll.toLocaleString()}</div>
                                        </div>
                                        <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #e53e3e' }}>
                                            <div style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '5px', fontWeight: '500' }}>TOTAL PAID</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>₹{withdrawnAll.toLocaleString()}</div>
                                        </div>
                                        <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #805ad5' }}>
                                            <div style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '5px', fontWeight: '500' }}>PENDING BALANCE</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>₹{pendingBalanceAll.toLocaleString()}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="table-container">
                                <table id="earnings-table" className="sponsor-earnings-table">
                                    <thead>
                                        <tr>
                                            <th>Sponsor</th>
                                            <th>Email</th>
                                            <th>Vehicles</th>
                                            <th>Total Revenue</th>
                                            <th>Sponsor Share (70%)</th>
                                            <th>Platform Fee (30%)</th>
                                            <th>Withdrawn</th>
                                            <th>Balance</th>
                                            <th>Bookings</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {earnings.length === 0 ? (
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No earnings data found</td></tr>
                                        ) : earnings.map((e, idx) => (
                                            <tr key={e.id || idx}>
                                                <td>{e.name}</td>
                                                <td>{e.email}</td>
                                                <td style={{ textAlign: 'center' }}>{e.totalVehicles || 0}</td>
                                                <td style={{ fontWeight: 'bold' }}>₹{e.totalRevenue.toLocaleString()}</td>
                                                <td style={{ color: 'green' }}>₹{e.sponsorShare.toLocaleString()}</td>
                                                <td style={{ color: '#ed8936' }}>₹{e.platformShare.toLocaleString()}</td>
                                                <td style={{ color: '#e53e3e' }}>₹{e.totalWithdrawn?.toLocaleString() || 0}</td>
                                                <td style={{ fontWeight: 'bold', color: e.currentBalance < 0 ? 'red' : 'black' }}>
                                                    ₹{e.currentBalance?.toLocaleString() || 0}
                                                </td>
                                                <td>{e.bookingsCount}</td>
                                                <td>
                                                    <button className="action-btn btn-view btn-icon-only" onClick={() => setModal({ type: 'viewSponsorDetails', data: e })} title="View Details">
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* POLICIES */}
                    {activeTab === 'policies' && (
                        <div id="policies" className="content-section active" style={{ display: 'flex', justifyContent: 'center', background: '#f0f2f5', padding: '20px' }}>
                            <div className="policy-document" style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '800px',
                                minHeight: '800px',
                                padding: '50px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                                color: '#333',
                                fontFamily: "'Times New Roman', Times, serif"
                            }}>
                                <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                                    <h1 style={{ margin: '0', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '2px' }}>Terms & Conditions</h1>
                                    <p style={{ margin: '10px 0 0', fontSize: '14px', fontStyle: 'italic', color: '#666' }}>RentHub Vehicle Rental Services</p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>1. Driver Eligibility</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>1.1 Age Limit:</strong> The rider must be at least 18 years of age to rent a vehicle.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>1.2 License:</strong> The rider must verify they possess a valid, government-issued driving license appropriate for the vehicle category (LMV/MCWG) and carry the original during the trip.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>2. Booking & Cancellation</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>2.1 Confirmation:</strong> Bookings are confirmed only upon receipt of the advance payment.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>2.2 Cancellation Policy:</strong> Free cancellation is available up to 24 hours before the trip start time. Cancellations made within 24 hours will incur a fee of 50% of the advance amount. No refunds for cancellations after the trip start time.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>3. Security Deposit & Payments</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        Refundable security deposits may be required for certain high-end vehicles. This deposit will be refunded within 5-7 business days after the vehicle is returned damage-free.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>4. Vehicle Usage</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>4.1 Prohibited Use:</strong> Vehicles cannot be used for racing, towing, transporting illegal substances, or commercial passenger transport.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>4.2 Territory:</strong> Vehicles must be driven within the state limits unless a special permit is obtained and approved by RentHub.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>4.3 Traffic Violations:</strong> The user is solely responsible for paying any traffic fines or challans incurred during the rental period.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>5. Fuel Policy</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        The vehicle is provided with a full tank (or sufficient fuel to reach the nearest station). It must be returned with the same fuel level. If returned with less fuel, the cost of the difference plus a refueling surcharge will be deducted.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>6. Damage & Breakdown</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>6.1 Accident:</strong> In case of an accident, the user must immediately notify RentHub and valid authorities. The user is liable for damage costs up to the insurance deductible amount.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>6.2 Breakdown:</strong> For mechanical failures not caused by user negligence, RentHub will provide roadside assistance or a replacement vehicle subject to availability.
                                    </p>
                                </div>

                                <div className="policy-section" style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>7. Return Policy</h3>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>7.1 Late Return:</strong> A grace period of 30 minutes is allowed. Returns delayed by more than 30 minutes will attract a penalty of ₹100/hour + double the hourly rental rate for the extended duration.
                                    </p>
                                    <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', color: '#444' }}>
                                        <strong>7.2 Condition:</strong> The vehicle must be returned in a clean condition. Excessive dirt or trash may incur a cleaning fee.
                                    </p>
                                </div>

                                <div className="policy-footer" style={{ marginTop: '50px', borderTop: '1px solid #ddd', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                                    <p>Last updated: December 2025</p>
                                    <p>RentHub Inc. &copy; All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WITHDRAWALS */}
                    {/* WITHDRAWALS */}
                    {/* WITHDRAWALS */}
                    {activeTab === 'withdrawals' && (
                        <div id="withdrawals" className="content-section active">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>Sponsor Withdrawals</h2>
                                <button className="action-btn" onClick={loadWithdrawalRequests}><i className="fas fa-sync-alt"></i></button>
                            </div>

                            {/* Stats Cards */}
                            <div className="withdrawal-stats-container">
                                <div className="withdrawal-stat-card orange">
                                    <div className="w-stat-icon"><i className="fas fa-hourglass-half"></i></div>
                                    <div className="w-stat-info">
                                        <h4>Pending Requests</h4>
                                        <p>{withdrawalRequests.filter(r => r.status === 'pending').length}</p>
                                    </div>
                                </div>
                                <div className="withdrawal-stat-card blue">
                                    <div className="w-stat-icon"><i className="fas fa-rupee-sign"></i></div>
                                    <div className="w-stat-info">
                                        <h4>Pending Approval</h4>
                                        <p>₹{withdrawalRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="withdrawal-stat-card" style={{ borderLeft: '4px solid #3182ce', background: '#ebf8ff' }}>
                                    <div className="w-stat-icon" style={{ color: '#3182ce' }}><i className="fas fa-check"></i></div>
                                    <div className="w-stat-info">
                                        <h4>Approved (Unpaid)</h4>
                                        <p>₹{withdrawalRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="withdrawal-stat-card green">
                                    <div className="w-stat-icon"><i className="fas fa-check-double"></i></div>
                                    <div className="w-stat-info">
                                        <h4>Total Paid</h4>
                                        <p>₹{withdrawalRequests.filter(r => r.status === 'completed').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="withdrawal-filters-container">
                                <div className="w-tabs">
                                    <button className={`w-tab ${withdrawalFilter === 'pending' ? 'active' : ''}`} onClick={() => setWithdrawalFilter('pending')}>Pending</button>
                                    <button className={`w-tab ${withdrawalFilter === 'approved' ? 'active' : ''}`} onClick={() => setWithdrawalFilter('approved')}>Approved</button>
                                    <button className={`w-tab ${withdrawalFilter === 'history' ? 'active' : ''}`} onClick={() => setWithdrawalFilter('history')}>History</button>
                                    <button className={`w-tab ${withdrawalFilter === 'all' ? 'active' : ''}`} onClick={() => setWithdrawalFilter('all')}>All Requests</button>
                                </div>
                            </div>

                            <div className="withdrawal-table-container">
                                <table id="withdrawals-table">
                                    <thead>
                                        <tr>
                                            <th>Date & Time</th>
                                            <th>Sponsor Details</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Payment Details</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withdrawalRequests
                                            .filter(req => {
                                                if (withdrawalFilter === 'all') return true;
                                                if (withdrawalFilter === 'history') return ['completed', 'rejected'].includes(req.status);
                                                return req.status === withdrawalFilter;
                                            })
                                            .length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#A0AEC0' }}>
                                                <div style={{ marginBottom: '15px' }}><i className="fas fa-search" style={{ fontSize: '2.5rem', color: '#E2E8F0' }}></i></div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>No {withdrawalFilter !== 'all' ? withdrawalFilter : ''} requests found</div>
                                            </td></tr>
                                        ) : withdrawalRequests
                                            .filter(req => {
                                                if (withdrawalFilter === 'all') return true;
                                                if (withdrawalFilter === 'history') return ['completed', 'rejected'].includes(req.status);
                                                return req.status === withdrawalFilter;
                                            })
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            .map(req => {
                                                const sEarnings = earnings.find(e => e.id === req.sponsor_id);
                                                const balance = sEarnings ? sEarnings.currentBalance : null;
                                                return (
                                                    <tr key={req.id} className="withdrawal-row">
                                                        <td>
                                                            <div className="col-date">
                                                                <div className="col-date-main">{new Date(req.created_at).toLocaleDateString()}</div>
                                                                <div className="col-date-sub">
                                                                    <i className="far fa-clock"></i> {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="sponsor-cell">
                                                                <div className="sponsor-avatar">
                                                                    {(req.sponsors?.full_name || 'SP').substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="sponsor-info">
                                                                    <div className="sponsor-name">{req.sponsors?.full_name || 'Unknown'}</div>
                                                                    <div className="sponsor-email">{req.sponsors?.email || 'N/A'}</div>
                                                                    {balance !== null && (
                                                                        <div style={{ fontSize: '0.85rem', color: balance < 0 ? '#e53e3e' : '#2ecc71', fontWeight: 'bold' }}>
                                                                            Bal: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="withdrawal-amount">₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td>
                                                            <span className={`method-badge ${req.payment_method}`}>
                                                                {req.payment_method === 'bank' ? <i className="fas fa-university"></i> : <i className="fas fa-mobile-alt"></i>}
                                                                {req.payment_method.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {req.payment_method === 'bank' ? (
                                                                <div style={{ fontSize: '0.85em' }}>
                                                                    <div>Acct: {req.bank_account_number}</div>
                                                                    <div>IFSC: {req.ifsc_code}</div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.85em' }}>
                                                                    UPI: {req.upi_id}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge status-${req.status}`}>
                                                                {req.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {req.status === 'pending' && (
                                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                                    <button
                                                                        className="action-btn btn-confirm"
                                                                        title="Approve"
                                                                        onClick={() => handleWithdrawalAction(req.id, 'approved')}
                                                                    >
                                                                        <i className="fas fa-check"></i>
                                                                    </button>
                                                                    <button
                                                                        className="action-btn btn-delete"
                                                                        title="Reject"
                                                                        onClick={() => handleWithdrawalAction(req.id, 'rejected')}
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {req.status === 'approved' && (
                                                                <button
                                                                    className="action-btn btn-confirm"
                                                                    style={{ background: '#2196F3', borderColor: '#2196F3' }}
                                                                    onClick={() => handleWithdrawalAction(req.id, 'completed')}
                                                                >
                                                                    <i className="fas fa-check-double"></i> Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT ISSUES */}
                    {activeTab === 'issues' && (
                        <div id="issues" className="content-section active" style={{ padding: '24px' }}>
                            <AdminIssues />
                        </div>
                    )}

                    {/* OFFERS MANAGEMENT */}
                    {activeTab === 'offers' && (
                        <div id="offers" className="content-section active">
                            <AdminOffers />
                        </div>
                    )}

                    {/* DELIVERY AGENTS MANAGEMENT */}
                    {activeTab === 'agents' && (
                        <div id="agents" className="content-section active">
                            <div className="section-header-modern">
                                <div>
                                    <h2>Delivery Agent Network</h2>
                                    <p className="section-subtitle">Verify and manage professional vehicle handlers</p>
                                </div>
                            </div>

                            <div className="modern-table-card">
                                <div className="table-responsive">
                                    <table className="modern-data-table">
                                        <thead>
                                            <tr>
                                                <th>Agent Profile</th>
                                                <th>Contact & Area</th>
                                                <th>Documents</th>
                                                <th>KYC Status</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deliveryAgents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5">
                                                        <div className="no-results">
                                                            <i className="fas fa-truck-loading"></i>
                                                            <p>No delivery agent applications found.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : deliveryAgents.map(agent => (
                                                <tr key={agent.id}>
                                                    <td>
                                                        <div className="user-profile-cell">
                                                            <img src={agent.profile_photo_url || 'https://via.placeholder.com/40'} className="user-avatar-circle" alt="" style={{ objectFit: 'cover' }} />
                                                            <div className="user-meta">
                                                                <span className="u-name">{agent.full_name}</span>
                                                                <span className="u-id">Agent ID: {agent.id.slice(0,8)}...</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="contact-cell-modern">
                                                            <span className="contact-info-bit"><i className="fas fa-envelope"></i> {agent.email}</span>
                                                            <span className="contact-info-bit"><i className="fas fa-phone"></i> {agent.mobile}</span>
                                                            <span className="contact-info-bit" style={{ color: '#0284c7' }}><i className="fas fa-map-marker-alt"></i> {agent.preferred_area || 'Not Specified'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="doc-chips-container" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                            {agent.aadhaar_url && (
                                                                <a href={agent.aadhaar_url} target="_blank" className="doc-chip rc" title="View Aadhaar">
                                                                    <i className="fas fa-id-card"></i> Aadhaar
                                                                </a>
                                                            )}
                                                            {agent.dl_url && (
                                                                <a href={agent.dl_url} target="_blank" className="doc-chip photo" title="View License">
                                                                    <i className="fas fa-id-badge"></i> License
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${agent.is_verified ? 'available' : 'busy'}`}>
                                                            {agent.is_verified ? 'Verified Expert' : 'Pending Review'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="actions-cell">
                                                            {!agent.is_verified && (
                                                                <button className="icon-btn-modern view" style={{ background: '#ecfdf5', color: '#10b981' }} onClick={() => handleApproveAgent(agent.id)} title="Approve Agent">
                                                                    <i className="fas fa-user-check"></i>
                                                                </button>
                                                            )}
                                                            <button className="icon-btn-modern delete" onClick={() => handleDeleteAgent(agent.id)} title="Delete Application">
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

            </div>

            {/* MODALS */}
            {modal.type === 'viewBooking' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Booking Details</h2>
                        <div className="booking-details">
                            <h4 style={{ color: '#4CAF50', margin: '0 0 15px 0' }}>Booking ID: {modal.data.booking_id || `#${modal.data.id}`}</h4>

                            <p><strong>Service Type:</strong> {modal.data.delivery_option === 'home_delivery' ? (
                                <span style={{ color: '#9a3412', fontWeight: 'bold' }}>🏠 Home Delivery</span>
                            ) : (
                                <span style={{ color: '#166534', fontWeight: 'bold' }}>🏪 Self Pickup</span>
                            )}</p>
                            <p><strong>Vehicle:</strong> {modal.data.vehicleName} {modal.data.vehicleType ? `(${modal.data.vehicleType})` : ''}</p>
                            <p><strong>Start Date:</strong> {modal.data.start_date} ({modal.data.start_time})</p>

                            {/* Calculate End Date roughly for display */}
                            {(() => {
                                const start = new Date(`${modal.data.start_date}T${modal.data.start_time}`);
                                const end = new Date(start.getTime() + (modal.data.duration * 60 * 60 * 1000));
                                const endDate = end.toLocaleDateString('en-CA');
                                const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                                return <p><strong>End Date:</strong> {endDate} ({endTime})</p>;
                            })()}

                            <p><strong>Duration:</strong> {modal.data.duration} hours</p>
                            <p><strong>Total Amount:</strong> ₹{modal.data.total_amount}</p>
                            <p><strong>Advance Payment:</strong> ₹{modal.data.advance_payment}</p>
                            <p><strong>Advance Payment:</strong> ₹{modal.data.advance_payment}</p>
                            <p><strong>Remaining Amount:</strong> ₹{modal.data.total_amount - modal.data.advance_payment}</p>
                            {/* Points earned removed */}
                            {modal.data.coupon_code && (
                                <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                    <i className="fas fa-tag"></i> Coupon Used: {modal.data.coupon_code} ({modal.data.reward_type === 'FREE_2_HOUR_RIDE' ? 'Free 2 Hours' : 'Reward'})
                                </p>
                            )}

                            {modal.data.transaction_id && (
                                <p><strong>Transaction ID:</strong> {modal.data.transaction_id}</p>
                            )}

                            {/* ASSIGNED AGENT INFO (MODERN BOX) */}
                            {modal.data.agent_id && (
                                <div style={{ 
                                    margin: '15px 0', padding: '15px', background: '#f8fafc', 
                                    borderRadius: '12px', border: '1px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', gap: '12px'
                                }}>
                                    <div style={{ width: '45px', height: '45px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="fas fa-user-tie"></i>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>
                                            {deliveryAgents.find(a => a.id === modal.data.agent_id)?.full_name || 'Assigned Agent'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                            <i className="fas fa-phone-alt"></i> {deliveryAgents.find(a => a.id === modal.data.agent_id)?.mobile || 'N/A'}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                                            background: (['online', 'on_delivery'].includes((deliveryAgents.find(a => a.id === modal.data.agent_id)?.status || '').toLowerCase())) ? '#dcfce7' : '#f1f5f9',
                                            color: (['online', 'on_delivery'].includes((deliveryAgents.find(a => a.id === modal.data.agent_id)?.status || '').toLowerCase())) ? '#166534' : '#64748b'
                                        }}>
                                            {(deliveryAgents.find(a => a.id === modal.data.agent_id)?.status || 'offline').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {modal.data.delivery_option === 'home_delivery' && (
                                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd', marginTop: '15px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#0369a1', fontSize: '1rem' }}>
                                        <i className="fas fa-clock"></i> Full-Service Dispatch Schedule
                                    </h4>
                                    
                                    {/* Delivery Window */}
                                    <div style={{ marginBottom: '15px', borderBottom: '1px dashed #bae6fd', pb: '10px' }}>
                                        <p style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '5px' }}>
                                            <i className="fas fa-truck-loading"></i> Part 1: Delivery (Drop-off)
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                                            <p><i className="fas fa-sign-out-alt"></i> Leave Shop: <b>{modal.data.est_departure_time || 'N/A'}</b></p>
                                            <p><i className="fas fa-store"></i> Back at Shop: <b>{modal.data.est_return_to_shop || 'N/A'}</b></p>
                                        </div>
                                    </div>

                                    {/* Collection Window */}
                                    <div>
                                        <p style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '5px' }}>
                                            <i className="fas fa-truck-pickup"></i> Part 2: Collection (Return Pickup)
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                                            <p><i className="fas fa-sign-out-alt"></i> Leave Shop: <b>{modal.data.pickup_est_departure || 'N/A'}</b></p>
                                            <p><i className="fas fa-store"></i> Back at Shop: <b>{modal.data.pickup_est_return || 'N/A'}</b></p>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '12px', fontStyle: 'italic', borderTop: '1px solid #bae6fd', paddingTop: '8px' }}>
                                        * Intervals: Travel (X2) + 10m buffer. Agents are free between tasks.
                                    </p>
                                </div>
                            )}

                            <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-calendar-alt" style={{ color: '#6c757d' }}></i>
                                <span style={{ color: '#495057', fontSize: '0.9em' }}>
                                    <strong>Booked on:</strong> {formatDate(modal.data.created_at)}
                                </span>
                            </div>

                            <p style={{ marginTop: '15px' }}><strong>Status:</strong> <span className={`status-badge status-${(modal.data.status || 'pending').toLowerCase()}`}>{modal.data.status}</span></p>

                            {/* Delivery Info Section */}
                            {modal.data.delivery_option === 'home_delivery' && (
                                <div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#9a3412' }}><i className="fas fa-truck"></i> Home Delivery Info</h4>
                                    <p><strong>Address:</strong> {modal.data.delivery_address || 'Not Provided'}</p>
                                    <p><strong>Distance:</strong> {modal.data.distance} km</p>
                                    <p><strong>Delivery Fee:</strong> ₹{modal.data.delivery_fee} (2-Way)</p>
                                    
                                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ffedd5' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>Assign Delivery Agent:</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select 
                                                className="form-control"
                                                value={modal.data.agent_id || ''}
                                                onChange={(e) => handleAssignAgent(modal.data.id, e.target.value)}
                                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            >
                                                <option value="">Select Agent</option>
                                                {deliveryAgents.filter(a => a.is_verified).map(agent => {
                                                    // Conflict Check Logic (Match Backend autoAssigner.js)
                                                    const isBusy = () => {
                                                        const currentBooking = modal.data;
                                                        if (!currentBooking.start_date || !currentBooking.start_time) return false;

                                                        const AVG_SPEED_KMH = 20;
                                                        const HANDOVER_MINS = 10;
                                                        const SAFETY_BUFFER_MINS = 15;

                                                        const getWindows = (b) => {
                                                            const dist = parseFloat(b.distance) || 5;
                                                            const dur = parseInt(b.duration) || 0;
                                                            const travel = Math.ceil((dist / AVG_SPEED_KMH) * 60);
                                                            const start = new Date(`${b.start_date}T${b.start_time}`);
                                                            const end = new Date(start.getTime() + (dur * 3600000));
                                                            
                                                            return [
                                                                { s: start.getTime() - (travel * 60000), e: start.getTime() + ((HANDOVER_MINS + travel + SAFETY_BUFFER_MINS) * 60000) },
                                                                { s: end.getTime() - (travel * 60000), e: end.getTime() + ((HANDOVER_MINS + travel + SAFETY_BUFFER_MINS) * 60000) }
                                                            ];
                                                        };

                                                        const currentWindows = getWindows(currentBooking);
                                                        
                                                        // Check against all other confirmed bookings for this agent on the same day
                                                        const agentJobs = bookings.filter(b => 
                                                            b.agent_id === agent.id && 
                                                            b.start_date === currentBooking.start_date &&
                                                            b.id !== currentBooking.id &&
                                                            ['confirmed', 'ride_started', 'ride_completed'].includes(b.status)
                                                        );

                                                        for (const job of agentJobs) {
                                                            const jobWindows = getWindows(job);
                                                            for (const cw of currentWindows) {
                                                                for (const jw of jobWindows) {
                                                                    if (cw.s < jw.e && cw.e > jw.s) return true;
                                                                }
                                                            }
                                                        }
                                                        return false;
                                                    };

                                                    const busy = isBusy();

                                                    return (
                                                        <option 
                                                            key={agent.id} 
                                                            value={agent.id} 
                                                            style={{ color: busy ? '#ef4444' : 'inherit' }}
                                                        >
                                                            {agent.full_name} {busy ? '(Busy - Conflict detected)' : `(${agent.preferred_area || 'Global'})`}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        {modal.data.agent_id && (
                                            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                                                <i className="fas fa-info-circle"></i> Assigned to: {deliveryAgents.find(a => a.id === modal.data.agent_id)?.full_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}


                            {/* Ride Summary (Visible for Active & Completed Rides) */}
                            {(modal.data.status === 'ride_started' || modal.data.status === 'ride_completed' || modal.data.status === 'completed') && (
                                <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #b3e5fc' }}>
                                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #b3e5fc', paddingBottom: '5px' }}>Ride Summary</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em', marginBottom: '10px' }}>
                                        <div>
                                            <strong>Ride Start:</strong><br />
                                            {formatDate(modal.data.ride_start_time || modal.data.updated_at)}
                                        </div>
                                        {/* Show End Time only if completed */}
                                        {(modal.data.status === 'ride_completed' || modal.data.status === 'completed') ? (
                                            <div>
                                                <strong>Ride End:</strong><br />
                                                {formatDate(modal.data.ride_end_time)}
                                            </div>
                                        ) : (
                                            <div>
                                                <strong>Ride End:</strong><br />
                                                <span style={{ color: '#ff9800', fontStyle: 'italic' }}>IN PROGRESS...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* FULL PAYMENT SUMMARY - ONLY FOR COMPLETED RIDES */}
                                    {(modal.data.status === 'ride_completed' || modal.data.status === 'completed') && (
                                        <>
                                            {(modal.data.extra_amount > 0) && (
                                                <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                                    ⚠️ Overdue Charge: ₹{modal.data.extra_amount}<br />
                                                    <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#555' }}>
                                                        {(() => {
                                                            const extraHours = modal.data.extra_hours || 0;
                                                            const hours = Math.floor(extraHours);
                                                            const minutes = Math.round((extraHours - hours) * 60);
                                                            return `(${hours} hrs / ${minutes} mins)`;
                                                        })()}
                                                    </span>
                                                </p>
                                            )}

                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bbb' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <span>Actual Billable Amount:</span>
                                                    <span>₹{modal.data.total_amount}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#4caf50' }}>
                                                    <span>Advance Paid:</span>
                                                    <span>- ₹{modal.data.advance_payment}</span>
                                                </div>

                                                {/* Logic for Balance */}
                                                {(() => {
                                                    const total = parseFloat(modal.data.total_amount) || 0;
                                                    const advance = parseFloat(modal.data.advance_payment) || 0;
                                                    // Backend updates 'total_amount' to the full Actual Billable Amount upon ride completion
                                                    const balance = total - advance;

                                                    const isRefund = balance < 0;

                                                    return (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            paddingTop: '10px',
                                                            marginTop: '10px',
                                                            borderTop: '2px solid #333',
                                                            fontSize: '1.2em',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            <span>{isRefund ? 'REFUND CUSTOMER:' : 'TOTAL PAYABLE:'}</span>
                                                            <span style={{ color: isRefund ? '#d32f2f' : '#1976d2' }}>
                                                                ₹{Math.abs(balance)}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {(modal.data.status === 'cancelled' || modal.data.status === 'rejected') && (
                                <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                                    <p><strong>Refund Amount:</strong> ₹{modal.data.refund_amount}</p>
                                    <p><strong>Refund Status:</strong> {modal.data.refund_status}</p>
                                    {modal.data.refund_details && (
                                        <div style={{ marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '5px', border: '1px solid #eee' }}>
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1em' }}>Refund Details</h4>
                                            {(modal.data.refund_details.method === 'upi' || modal.data.refund_details.method === 'UPI') && (
                                                <p style={{ margin: '5px 0' }}><strong>UPI ID:</strong> {modal.data.refund_details.upiId}</p>
                                            )}
                                            {(modal.data.refund_details.method === 'bank' || modal.data.refund_details.method === 'Bank') && (
                                                <>
                                                    <p style={{ margin: '5px 0' }}><strong>Bank Account:</strong> {modal.data.refund_details.accountNumber}</p>
                                                    <p style={{ margin: '5px 0' }}><strong>IFSC:</strong> {modal.data.refund_details.ifsc}</p>
                                                    <p style={{ margin: '5px 0' }}><strong>Holder Name:</strong> {modal.data.refund_details.accountHolder}</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modal.type === 'editBooking' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Edit Booking</h2>
                        <form onSubmit={handleUpdateBooking}>
                            <div style={{ marginBottom: '12px' }}><label>Start Date</label><input type="date" value={editBookingData.start_date || ''} onChange={e => setEditBookingData({ ...editBookingData, start_date: e.target.value })} required className="form-control" /></div>
                            <div style={{ marginBottom: '12px' }}><label>Status</label>
                                <select value={editBookingData.status} onChange={e => setEditBookingData({ ...editBookingData, status: e.target.value })} className="form-control">
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="ride_started">Ride Started</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {editBookingData.delivery_option === 'home_delivery' && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label>Delivery Status (Manual Override)</label>
                                    <select 
                                        value={editBookingData.delivery_status || ''} 
                                        onChange={e => setEditBookingData({ ...editBookingData, delivery_status: e.target.value })} 
                                        className="form-control"
                                        style={{ border: '1px solid #ff9800' }}
                                    >
                                        <option value="">Not Assigned</option>
                                        <option value="pending">Pending Acceptance</option>
                                        <option value="accepted">Accepted by Agent</option>
                                        <option value="picked_up">Picked Up</option>
                                        <option value="out_for_delivery">Out for Delivery</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="returned">Returned</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                    <small style={{ color: '#f57c00' }}>⚠️ Overriding this will update the agent's dashboard immediately.</small>
                                </div>
                            )}
                            <button className="action-btn btn-confirm">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {modal.type === 'rejectBooking' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Reject Booking</h2>
                        <textarea style={{ width: '100%', minHeight: '100px' }} placeholder="Reason for rejection" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}></textarea>
                        <button className="action-btn btn-reject" style={{ marginTop: '10px' }} onClick={handleRejectBooking}>Submit</button>
                    </div>
                </div>
            )}

            {modal.type === 'scanQR' && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Scan QR Code</h2>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <div className="tabs" style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setScanInput('') /* clear input on switch if needed, or keep mode state */}
                                    style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', opacity: scanInput === 'camera' ? 1 : 0.6 }}
                                >
                                    <i className="fas fa-camera"></i> Camera
                                </button>
                                <button
                                    onClick={() => {/* managed via input focus usually, but here we just show both or toggle. Let's just show camera area */ }}
                                    style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#333', color: 'white', cursor: 'pointer' }}
                                >
                                    Manual Input
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', position: 'relative', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Scanner
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        const rawValue = result[0].rawValue;
                                        setScanInput(rawValue);
                                        // Feedback logic here if needed
                                    }
                                }}
                                onError={(error) => console.log(error?.message)}
                                components={{
                                    audio: false,
                                    onOff: true,
                                    torch: true,
                                    zoom: true,
                                    finder: true
                                }}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                                }}
                                allowMultiple={true}
                                scanDelay={500}
                            />
                            {!scanInput && <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, color: 'white', opacity: 0.8, pointerEvents: 'none', textAlign: 'center', zIndex: 10, fontWeight: 'bold' }}>Scanning...</div>}
                        </div>

                        <p style={{ marginBottom: '10px', color: '#666', textAlign: 'center' }}>Scan the QR code or enter Booking ID below.</p>
                        <form onSubmit={handleScanQR}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Booking ID (e.g. RH...)"
                                    value={typeof scanInput === 'object' ? scanInput.text : scanInput}
                                    onChange={e => setScanInput(e.target.value)}
                                    autoFocus
                                    required
                                    style={{
                                        fontSize: '1.2rem',
                                        padding: '12px',
                                        textAlign: 'center',
                                        letterSpacing: '1px',
                                        fontWeight: 'bold',
                                        border: '2px solid #ddd'
                                    }}
                                />
                                {scanInput && (
                                    <button
                                        type="button"
                                        onClick={() => setScanInput('')}
                                        style={{
                                            background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 15px', fontSize: '1.2rem', color: '#555'
                                        }}
                                        title="Clear"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="action-btn btn-confirm" style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}>Process Scan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE BOOKING */}
            <StatusPopup
                isOpen={modal.type === 'deleteBooking'}
                onClose={() => setModal({ type: null })}
                onConfirm={() => handleDeleteBooking(modal.data?.id)}
                type="confirm"
                title="Confirm Delete"
                message="Are you sure you want to delete this booking?"
                confirmText="Yes, Delete"
                cancelText="Cancel"
            />

            {modal.type === 'viewUser' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>User Details</h2>
                        <p><strong>Name:</strong> {modal.data.fullName || modal.data.adminName}</p>
                        <p><strong>Email:</strong> {modal.data.email}</p>
                        <p><strong>Phone:</strong> {modal.data.phoneNumber}</p>
                        <p><strong>Role:</strong> {modal.data.isAdmin ? 'Admin' : 'User'}</p>
                    </div>
                </div>
            )}

            {modal.type === 'editUser' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Edit User</h2>
                        <form onSubmit={handleUpdateUser}>
                            <div style={{ marginBottom: '12px' }}><label>Name</label><input type="text" value={editUserData.fullName || editUserData.adminName || ''} onChange={e => setEditUserData({ ...editUserData, fullName: e.target.value })} /></div>
                            <div style={{ marginBottom: '12px' }}><label>Email</label><input type="email" value={editUserData.email || ''} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} /></div>
                            <div style={{ marginBottom: '12px' }}><label>Phone</label><input type="text" value={editUserData.phoneNumber || ''} onChange={e => setEditUserData({ ...editUserData, phoneNumber: e.target.value })} /></div>
                            <button className="action-btn btn-confirm">Save</button>
                        </form>
                    </div>
                </div>
            )}

            {/* SPONSOR DETAILS MODAL */}
            {modal.type === 'viewSponsorDetails' && (
                <div className="modal">
                    <div className="modal-content sponsor-dashboard-modal" style={{ maxWidth: '900px', width: '95%', padding: '0', background: 'transparent', border: 'none' }}>

                        {/* Header */}
                        <div className="modal-header-styled">
                            <h2>
                                <i className="fas fa-chart-line"></i>
                                {modal.data.name}'s Dashboard
                            </h2>
                            <button className="modal-close-btn-styled" onClick={() => setModal({ type: null })}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-body-styled">

                            {/* Premium Stats Grid */}
                            <div className="modal-stats-grid">
                                <div className="stat-card-premium">
                                    <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981' }}>
                                        <i className="fas fa-car-side"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h4>Total Vehicles</h4>
                                        <p>{modal.data.totalVehicles || 0}</p>
                                    </div>
                                </div>
                                <div className="stat-card-premium">
                                    <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                                        <i className="fas fa-rupee-sign"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h4>Total Revenue</h4>
                                        <p>₹{parseFloat(modal.data.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="stat-card-premium">
                                    <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                                        <i className="fas fa-wallet"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h4>Net Earnings</h4>
                                        <p className="text-success">₹{parseFloat(modal.data.sponsorShare || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="stat-card-premium">
                                    <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#ef4444' }}>
                                        <i className="fas fa-calendar-check"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h4>Bookings</h4>
                                        <p>{modal.data.bookingsCount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Financial Summary */}
                            <div className="financial-summary-section">
                                <h3><i className="fas fa-file-invoice-dollar" style={{ marginRight: '8px' }}></i> Financial Summary</h3>

                                <div className="summary-rows">
                                    <div className="summary-row">
                                        <span className="summary-label">Sponsor Name</span>
                                        <span className="summary-value">{modal.data.name}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Registered Email</span>
                                        <span className="summary-value" style={{ color: '#64748b' }}>{modal.data.email}</span>
                                    </div>
                                    <div className="summary-row" style={{ marginTop: '10px' }}>
                                        <span className="summary-label">Total Generated Revenue</span>
                                        <span className="summary-value">₹{parseFloat(modal.data.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="summary-row">
                                        <span className="summary-label">Platform Fee (30%)</span>
                                        <span className="summary-value text-warning">- ₹{parseFloat(modal.data.platformShare || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="summary-row" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                        <span className="summary-label">Sponsor Gross Share (70%)</span>
                                        <span className="summary-value text-success">₹{parseFloat(modal.data.sponsorShare || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="summary-row">
                                        <span className="summary-label">Total Amount Withdrawn</span>
                                        <span className="summary-value text-danger">- ₹{parseFloat(modal.data.totalWithdrawn || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="summary-row total">
                                        <span className="summary-label">Current Withdrawable Balance</span>
                                        <span className="summary-value" style={{ fontSize: '1.4rem', color: modal.data.currentBalance < 0 ? '#ef4444' : '#0f172a' }}>
                                            ₹{parseFloat(modal.data.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Vehicle Modal */}
            {(modal.type === 'addVehicle' || modal.type === 'editVehicle') && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '650px', width: '95%' }}>
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                            {modal.type === 'addVehicle' ? 'Add New Vehicle' : 'Edit Vehicle Details'}
                        </h2>

                        <form onSubmit={handleVehicleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Left Column */}
                                <div>
                                    <div className="form-group">
                                        <label>Vehicle Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={vehicleFormData.name || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, name: e.target.value })}
                                            placeholder="e.g. Royal Enfield Classic"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Vehicle Type</label>
                                        <select
                                            className="form-control"
                                            value={vehicleFormData.type || 'bike'}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, type: e.target.value })}
                                        >
                                            <option value="bike">Bike</option>
                                            <option value="car">Car</option>
                                            <option value="scooty">Scooty</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Model</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={vehicleFormData.model || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                                            placeholder="e.g. Classic 350"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Year</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={vehicleFormData.year || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, year: e.target.value })}
                                            placeholder="e.g. 2024"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Hourly Price (₹)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={vehicleFormData.price || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, price: e.target.value })}
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div>
                                    <div className="form-group">
                                        <label>Registration Number</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={vehicleFormData.registration_number || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, registration_number: e.target.value })}
                                            placeholder="e.g. OD-02-XY-1234"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Category</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={vehicleFormData.category || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, category: e.target.value })}
                                            placeholder="e.g. Cruiser"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            className="form-control"
                                            value={vehicleFormData.status || 'available'}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, status: e.target.value })}
                                        >
                                            <option value="available">Available (Active)</option>
                                            <option value="unavailable">Unavailable</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Image URL</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={vehicleFormData.image_url || ''}
                                            onChange={e => setVehicleFormData({ ...vehicleFormData, image_url: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>

                                    {/* Image Preview */}
                                    <div style={{
                                        height: '110px',
                                        background: '#f8f9fa',
                                        border: '1px dashed #ced4da',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: '10px',
                                        overflow: 'hidden'
                                    }}>
                                        {vehicleFormData.image_url ? (
                                            <img
                                                src={vehicleFormData.image_url}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerText = 'Invalid Image URL' }}
                                            />
                                        ) : (
                                            <span style={{ color: '#adb5bd', fontSize: '0.9rem' }}>Image Preview</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="action-btn" style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ddd' }} onClick={() => setModal({ type: null })}>Cancel</button>
                                <button type="submit" className="action-btn btn-confirm" disabled={isSubmitting} style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save"></i>
                                            {modal.type === 'addVehicle' ? (vehicleFormData.requestId ? 'Approve & Earn' : 'Add Vehicle') : 'Save Changes'}
                                        </>
                                    )}
                                </button>
                            </div>

                            {modal.type === 'addVehicle' && vehicleFormData.requestId && (
                                <p style={{ marginTop: '15px', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
                                    <i className="fas fa-info-circle"></i> Approving this vehicle will automatically notify the sponsor via email.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {modal.type === 'viewVehicle' && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={() => setModal({ type: null })}>&times;</span>
                        <h2>Vehicle Details</h2>
                        <p><strong>Name:</strong> {modal.data.name}</p>
                        <p><strong>Type:</strong> {modal.data.type}</p>
                        <p><strong>Price:</strong> {modal.data.price}</p>
                        <p><strong>Status:</strong> {modal.data.status}</p>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modals */}
            {/* Active User Block/Unblock Confirmation */}
            {/* Confirm Block User */}
            <StatusPopup
                isOpen={modal.type === 'confirmBlockUser'}
                onClose={() => setModal({ type: null })}
                onConfirm={executeBlockUser}
                type="confirm"
                title={modal.data?.isBlocked ? 'Unblock User' : 'Block User'}
                message={`Are you sure you want to ${modal.data?.isBlocked ? 'unblock' : 'block'} this user? This will ${modal.data?.isBlocked ? 'restore their access' : 'prevent them from logging in'}.`}
                confirmText={modal.data?.isBlocked ? 'Yes, Unblock' : 'Yes, Block'}
                cancelText="Cancel"
            />

            {/* Refund Complete Confirmation */}
            <StatusPopup
                isOpen={modal.type === 'confirmRefundComplete'}
                onClose={() => setModal({ type: null })}
                onConfirm={executeRefundComplete}
                type="confirm"
                title="Confirm Refund"
                message="Are you sure you want to mark this refund as COMPLETED? This action confirms you have sent the money to the user."
                confirmText="Yes, Completed"
                cancelText="Cancel"
            />

            {/* SOS Confirmation */}
            <StatusPopup
                isOpen={modal.type === 'confirmSOS'}
                onClose={() => setModal({ type: null })}
                onConfirm={executeSendSOS}
                type="warning"
                title="Trigger SOS Alert"
                message="Are you sure you want to trigger an SOS for this booking? This will send emergency alerts to relevant authorities."
                confirmText="Yes, Send SOS"
                cancelText="Cancel"
            />

            {/* Delete Vehicle Confirmation */}
            <StatusPopup
                isOpen={modal.type === 'confirmDeleteVehicle'}
                onClose={() => setModal({ type: null })}
                onConfirm={executeDeleteVehicle}
                type="confirm"
                title="Delete Vehicle"
                message="Are you sure you want to delete this vehicle? This action cannot be undone."
                confirmText="Yes, Delete"
                cancelText="Cancel"
            />

            {/* Reject Request Confirmation */}
            <StatusPopup
                isOpen={modal.type === 'confirmRejectRequest'}
                onClose={() => setModal({ type: null })}
                onConfirm={() => executeRejectRequest(modal.data.id)}
                type="confirm"
                title="Reject Request"
                message="Are you sure you want to reject this vehicle request?"
                confirmText="Yes, Reject"
                cancelText="Cancel"
            />

            {/* Delete Request Confirmation */}
            <StatusPopup
                isOpen={modal.type === 'confirmDeleteRequest'}
                onClose={() => setModal({ type: null })}
                onConfirm={() => executeDeleteRequest(modal.data.id)}
                type="confirm"
                title="Delete Request"
                message="Are you sure you want to delete this request permanently?"
                confirmText="Yes, Delete"
                cancelText="Cancel"
            />

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

export default AdminPanel;
