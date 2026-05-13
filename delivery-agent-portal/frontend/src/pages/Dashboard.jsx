import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, CheckCircle2, Clock, MapPin, 
  User, Power, TrendingUp, Package,
  LogOut, ShieldCheck, Star, Store, RotateCcw, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Scanner } from '@yudiel/react-qr-scanner';

const Dashboard = () => {
  const [agent, setAgent] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [actionLoading, setActionLoading] = useState(null); // Track which task is being updated
  const [stats, setStats] = useState({ todayDeliveries: 0, earnings: 0, activeTasks: 0, pendingTasks: 0 });
  const [scanModal, setScanModal] = useState({ isOpen: false, taskId: null, type: null }); // type: 'start' or 'end'
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgentProfile();
  }, []);

  // --- LIVE TRACKING LOGIC ---
  useEffect(() => {
    let watchId = null;

    if (isOnline && agent) {
      console.log('📡 Starting Live Tracking...');
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`📍 Location Update: ${latitude}, ${longitude}`);
          
          // Update Supabase with current position
          await supabase
            .from('delivery_agents')
            .update({ 
              current_lat: latitude, 
              current_lng: longitude,
              last_active: new Date().toISOString()
            })
            .eq('id', agent.id);
        },
        (error) => console.error('Tracking Error:', error),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, agent]);

  const fetchAgentProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');

      const { data, error } = await supabase
        .from('delivery_agents')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setAgent(data);
      setIsOnline(data.availability_status === 'Online');
      fetchTasks(user.id);
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert('Dashboard Error: ' + error.message);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    let subscription = null;
    let userId = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      subscription = supabase
        .channel(`agent-tasks-${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `agent_id=eq.${userId}`
        }, () => {
          fetchTasks(userId);
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const fetchTasks = async (agentId) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          users:user_id (full_name, phone_number)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      
      // Update stats based on fetched tasks
      const active = data.filter(t => ['pending', 'picked_up', 'out_for_delivery'].includes(t.delivery_status)).length;
      const pending = data.filter(t => t.delivery_status === 'pending').length;
      setStats(prev => ({ ...prev, activeTasks: active, pendingTasks: pending }));
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const acceptTask = async (task) => {
    try {
      setActionLoading(task.id);
      // Call official backend API for acceptance and user notification
      const response = await fetch(`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/bookings/${task.id}/accept-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id })
      });

      if (!response.ok) throw new Error('Failed to accept task via API');

      alert('Task Accepted! The customer has been notified with your details and tracking link.');
      fetchTasks(agent.id);
    } catch (error) {
      alert('Failed to accept task: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateTaskStatus = async (bookingId, newStatus) => {
    try {
      setActionLoading(bookingId);
      const { error } = await supabase
        .from('bookings')
        .update({ delivery_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      fetchTasks(agent.id);
    } catch (error) {
      alert('Failed to update task status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleScanSuccess = async (result) => {
    if (!result) return;
    const bookingId = typeof result === 'string' ? result : result[0].rawValue;
    const { taskId, type } = scanModal;

    console.log(`🔍 Scanned ID: ${bookingId} | Task ID: ${taskId}`);

    // Simple verification: Scanned ID should match Booking ID (or long ID)
    // In your system, the QR usually contains the Booking ID
    
    try {
      setScanModal({ isOpen: false, taskId: null, type: null });
      setActionLoading(taskId);

      // Call the main backend scan-qr API to ensure all logic (payments, etc.) is handled
      const response = await fetch(`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/admin/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingId.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Verification Successful!');
        
        // --- AUTO-ACTIVATE GPS TRACKING ON SCAN ---
        if (type === 'start') {
          // Force Online status to start GPS watcher
          await supabase.from('delivery_agents')
            .update({ 
              availability_status: 'Online',
              current_status: 'ON_DELIVERY' 
            })
            .eq('id', agent.id);
          
          setIsOnline(true);
          setAgent(prev => ({ ...prev, current_status: 'ON_DELIVERY' }));
        }

        // If it was a return (end), set agent to RETURNING state
        if (type === 'end') {
          await supabase.from('delivery_agents')
            .update({ 
              availability_status: 'Online', // Keep online to track return trip
              current_status: 'RETURNING' 
            })
            .eq('id', agent.id);
          
          setIsOnline(true);
          setAgent(prev => ({ ...prev, current_status: 'RETURNING' }));
        }
        
        fetchTasks(agent.id);
      } else {
        alert('Verification Failed: ' + (data.error || 'Invalid QR Code'));
      }
    } catch (error) {
      console.error(error);
      alert('Error during verification');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async () => {
    if (!agent) return alert('Profile not loaded yet');

    const newStatus = isOnline ? 'Offline' : 'Online';
    try {
      console.log('🔄 Attempting to save status to DB:', newStatus);
      const { data, error } = await supabase
        .from('delivery_agents')
        .update({ 
          availability_status: newStatus,
          current_status: newStatus === 'Online' ? 'AT_SHOP' : 'OFFLINE'
        })
        .eq('id', agent.id)
        .select();

      if (error) {
        console.error('❌ DB Update Error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('✅ Status saved successfully:', data[0]);
        setIsOnline(newStatus === 'Online');
      } else {
        throw new Error('No rows updated. Check your permissions.');
      }
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const markArrivedAtShop = async () => {
    try {
      const { error } = await supabase
        .from('delivery_agents')
        .update({ current_status: 'AT_SHOP' })
        .eq('id', agent.id);

      if (error) throw error;
      setAgent(prev => ({ ...prev, current_status: 'AT_SHOP' }));
      alert('Welcome back! You are now eligible for new assignments.');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return (
    <div className="center flex" style={{ height: '100vh' }}>
      <div className="animate-pulse text-accent">Synchronizing Profile...</div>
    </div>
  );

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Navigation */}
      <nav className="glass-card" style={{ borderRadius: 0, padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="flex gap-3">
          <div style={{ background: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <Truck size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Agent<span className="text-gradient">Hub</span></h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logistics Management</p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex gap-2">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isOnline ? 'var(--success)' : 'var(--text-secondary)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <div 
              onClick={toggleStatus}
              style={{ 
                width: '50px', 
                height: '26px', 
                background: isOnline ? 'var(--success)' : '#cbd5e1',
                borderRadius: '50px',
                padding: '3px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'white', 
                borderRadius: '50%',
                position: 'absolute',
                left: isOnline ? '27px' : '3px',
                transition: 'all 0.3s ease'
              }} />
            </div>
          </div>

          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
            <LogOut size={18} /> Exit
          </button>
        </div>
      </nav>

      <div className="mx-auto px-4 pb-12" style={{ maxWidth: '1200px' }}>
        {/* Welcome Header */}
        <div className="grid grid-2 items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">Welcome back, {agent?.full_name.split(' ')[0]}!</h2>
            <p className="text-text-secondary flex gap-2">
              <ShieldCheck size={18} color="var(--success)" /> Verified Delivery Expert • {agent?.preferred_area}
            </p>
          </div>
          <div className="flex justify-end gap-4">
            <div className="glass-card" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '10px', borderRadius: '12px' }}>
                <Star size={20} fill="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>4.92</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>AGENT RATING</div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'DELIVERIES TODAY', value: stats.todayDeliveries, icon: Package, color: '#0284c7', bg: '#e0f2fe' },
            { label: 'TODAYS EARNINGS', value: `₹${stats.earnings}`, icon: TrendingUp, color: '#10b981', bg: '#dcfce7' },
            { label: 'ACTIVE TASKS', value: stats.activeTasks, icon: Clock, color: '#6366f1', bg: '#e0e7ff' },
            { label: 'PENDING TASKS', value: stats.pendingTasks, icon: CheckCircle2, color: '#f59e0b', bg: '#fef3c7' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card" 
              style={{ padding: '20px' }}
            >
              <div className="flex between mb-4">
                <div style={{ background: stat.bg, color: stat.color, padding: '10px', borderRadius: '12px' }}>
                  <stat.icon size={22} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>LIVE UPDATE</span>
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '5px 0' }}>{stat.value}</h3>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tasks Section */}
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="glass-card" style={{ padding: '30px' }}>
            <div className="flex between mb-8">
              <h3 className="text-xl font-bold">Assigned Delivery Tasks</h3>
              <button className="secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>View History</button>
            </div>

            {/* Empty State */}
            {tasks.length > 0 ? (
              <div className="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {tasks.map(task => (
                  <div key={task.id} className="glass-card" style={{ padding: '25px', marginBottom: '25px', borderLeft: '5px solid var(--accent)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Booking ID</div>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>{task.booking_id}</h3>
                      </div>
                      <span style={{ 
                        padding: '6px 12px', background: '#e3f2fd', color: '#1976d2', 
                        borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' 
                      }}>
                        {task.delivery_status?.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    {/* NEW FULL-SERVICE SCHEDULE UI */}
                    <div style={{ background: '#f0f9ff', borderRadius: '12px', padding: '15px', border: '1px solid #bae6fd', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 'bold', marginBottom: '15px', fontSize: '0.95rem' }}>
                        <Clock size={18} />
                        Full-Service Dispatch Schedule
                      </div>

                      {/* Part 1: Delivery */}
                      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #bae6fd' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0c4a6e', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px' }}>
                          <Truck size={16} />
                          Part 1: Delivery (Drop-off)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <LogOut size={14} color="#666" />
                            <span>Leave Shop: <strong>{new Date(task.est_departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Store size={14} color="#666" />
                            <span>Back at Shop: <strong>{new Date(task.est_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Part 2: Collection */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0c4a6e', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px' }}>
                          <RotateCcw size={16} />
                          Part 2: Collection (Return Pickup)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <LogOut size={14} color="#666" />
                            <span>Leave Shop: <strong>{new Date(task.pickup_est_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Store size={14} color="#666" />
                            <span>Back at Shop: <strong>{new Date(task.pickup_est_return).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="task-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                      <div className="task-info-item">
                        <MapPin size={16} />
                        <div>
                          <div className="label">Delivery Address</div>
                          <div className="value" style={{ fontSize: '0.85rem' }}>{task.delivery_address}</div>
                        </div>
                      </div>
                      <div className="task-info-item">
                        <Calendar size={16} />
                        <div>
                          <div className="label">Scheduled Time</div>
                          <div className="value" style={{ fontSize: '0.85rem' }}>{new Date(task.start_date).toLocaleDateString()} at {task.start_time}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex between items-center">
                      <div className="flex gap-3">
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '50%' }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{task.users?.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.users?.phone_number}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(task.delivery_status === 'assigned' || task.delivery_status === 'pending') && (
                          <button 
                            onClick={() => acceptTask(task)} 
                            className="primary" 
                            disabled={actionLoading === task.id}
                            style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#4338ca', opacity: actionLoading === task.id ? 0.7 : 1 }}
                          >
                            {actionLoading === task.id ? 'Processing...' : 'Accept Task'}
                          </button>
                        )}
                        {task.delivery_status === 'accepted' && (
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'picked_up')} 
                            className="primary" 
                            disabled={actionLoading === task.id}
                            style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: actionLoading === task.id ? 0.7 : 1 }}
                          >
                            {actionLoading === task.id ? 'Processing...' : 'Pick Up Vehicle'}
                          </button>
                        )}
                        {task.delivery_status === 'picked_up' && (
                          <button 
                            onClick={() => setScanModal({ isOpen: true, taskId: task.id, type: 'start' })} 
                            className="primary" 
                            disabled={actionLoading === task.id}
                            style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#f59e0b', opacity: actionLoading === task.id ? 0.7 : 1 }}
                          >
                            <Truck size={14} style={{ marginRight: '5px' }} />
                            {actionLoading === task.id ? 'Processing...' : 'Scan to Start Ride'}
                          </button>
                        )}
                        {task.delivery_status === 'out_for_delivery' && (
                          <button 
                            onClick={() => setScanModal({ isOpen: true, taskId: task.id, type: 'end' })} 
                            className="primary" 
                            disabled={actionLoading === task.id}
                            style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#10b981', opacity: actionLoading === task.id ? 0.7 : 1 }}
                          >
                            <CheckCircle2 size={14} style={{ marginRight: '5px' }} />
                            {actionLoading === task.id ? 'Processing...' : 'Scan to End Ride'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                <div style={{ width: '60px', height: '60px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <Clock size={30} color="#cbd5e1" />
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>No active tasks found</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                  When the admin assigns a car delivery in {agent?.preferred_area}, it will appear here instantly.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-card" style={{ padding: '25px' }}>
              <h4 className="font-bold mb-6">Service Zone</h4>
              <div className="flex gap-4 mb-4">
                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '12px' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Primary Location</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agent?.preferred_area}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', padding: '12px', background: '#f8fafc', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                You will only receive delivery requests within a 15km radius of this zone.
              </div>

              {agent?.current_status === 'RETURNING' && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderRadius: '12px', border: '2px solid #fdba74', textAlign: 'center' }}
                >
                  <p style={{ fontWeight: 800, color: '#9a3412', marginBottom: '10px' }}>Are you back at the shop?</p>
                  <button 
                    onClick={markArrivedAtShop}
                    className="primary" 
                    style={{ background: '#ea580c', width: '100%' }}
                  >
                    I am Back at Shop
                  </button>
                </motion.div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '25px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none' }}>
              <h4 className="font-bold mb-4" style={{ color: 'white' }}>Support Center</h4>
              <p style={{ fontSize: '0.8rem', color: '#e0f2fe', marginBottom: '20px' }}>Need help with a delivery? Our 24/7 support line is ready.</p>
              <button style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR SCAN MODAL */}
      {scanModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '25px', position: 'relative', background: 'white' }}>
            <button 
              onClick={() => setScanModal({ isOpen: false, taskId: null, type: null })}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {scanModal.type === 'start' ? 'Verify Delivery' : 'Confirm Collection'}
            </h3>
            <div style={{ borderRadius: '15px', overflow: 'hidden', border: '4px solid var(--accent)', marginBottom: '20px' }}>
              <Scanner 
                onScan={handleScanSuccess}
                onError={(err) => console.error(err)}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Please scan the QR code displayed on the customer's device to {scanModal.type === 'start' ? 'start' : 'end'} the ride.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
