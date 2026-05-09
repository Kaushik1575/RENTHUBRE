import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, CheckCircle2, Clock, MapPin, 
  User, Power, TrendingUp, Package,
  LogOut, ShieldCheck, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [agent, setAgent] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ todayDeliveries: 0, earnings: 0, activeTasks: 0, pendingTasks: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgentProfile();
  }, []);

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
      
      // Real-time subscription for new assignments
      const subscription = supabase
        .channel('booking-assignments')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `agent_id=eq.${user.id}`
        }, (payload) => {
          fetchTasks(user.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

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

  const updateTaskStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ delivery_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      fetchTasks(agent.id);
    } catch (error) {
      alert('Failed to update task status');
    }
  };

  const toggleStatus = async () => {
    const newStatus = isOnline ? 'Offline' : 'Online';
    try {
      const { error } = await supabase
        .from('delivery_agents')
        .update({ availability_status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;
      setIsOnline(!isOnline);
    } catch (error) {
      alert('Failed to update status');
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
                  <div key={task.id} className="task-item glass-card" style={{ padding: '20px', border: '1px solid #e2e8f0' }}>
                    <div className="flex between mb-4">
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Booking ID</span>
                        <div style={{ fontWeight: 800 }}>{task.booking_id || `#${task.id}`}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge`} style={{ 
                          padding: '4px 12px', 
                          borderRadius: '50px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          background: task.delivery_status === 'pending' ? '#fef3c7' : '#dcfce7',
                          color: task.delivery_status === 'pending' ? '#d97706' : '#10b981'
                        }}>
                          {task.delivery_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-4">
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                        <MapPin size={20} color="var(--accent)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Delivery Address</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{task.delivery_address}</div>
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
                        {task.delivery_status === 'pending' && (
                          <button onClick={() => updateTaskStatus(task.id, 'picked_up')} className="primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Pick Up</button>
                        )}
                        {task.delivery_status === 'picked_up' && (
                          <button onClick={() => updateTaskStatus(task.id, 'out_for_delivery')} className="primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Start Delivery</button>
                        )}
                        {task.delivery_status === 'out_for_delivery' && (
                          <button onClick={() => updateTaskStatus(task.id, 'delivered')} className="primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'var(--success)' }}>Mark Delivered</button>
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
    </div>
  );
};

export default Dashboard;
