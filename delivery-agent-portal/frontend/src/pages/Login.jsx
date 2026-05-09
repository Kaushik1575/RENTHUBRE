import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if the user is actually a delivery agent
      const { data: agent, error: agentError } = await supabase
        .from('delivery_agents')
        .select('is_verified')
        .eq('id', data.user.id)
        .single();

      if (agentError || !agent) {
        await supabase.auth.signOut();
        throw new Error('Access Denied: You are not registered as a delivery agent.');
      }

      if (!agent.is_verified) {
        await supabase.auth.signOut();
        throw new Error('Account Pending: Your documents are still being reviewed by the admin.');
      }

      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex center items-center" style={{ minHeight: '100vh' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card" 
        style={{ width: '100%', maxWidth: '450px' }}
      >
        <div className="text-center mb-8">
          <div className="mb-4 mx-auto step-dot active">
            <LogIn size={24} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Agent Portal</h2>
          <p className="text-text-secondary">Sign in to manage your deliveries</p>
        </div>

        <form onSubmit={handleLogin} className="grid">
          <div className="input-group">
            <label>Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@email.com" 
                className="pl-12"
                required
              />
              <Mail className="input-icon" size={20} />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="pl-12"
                required
              />
              <Lock className="input-icon" size={20} />
            </div>
          </div>

          <button type="submit" className="primary w-full center" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-text-secondary">
            New expert? <Link to="/register" className="text-accent font-bold" style={{ textDecoration: 'none' }}>Apply to Join</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
