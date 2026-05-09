import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import axios from 'axios';

const LoginSponsor = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/sponsor/login', formData);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.sponsor)); // Store as 'user' or 'sponsor'? 'user' is used by Navbar usually.
                // But Navbar checks for isAdmin. Maybe we need to store as 'sponsor' and update Navbar to check both?
                // For now, let's store as 'sponsor' to keep it distinct as per user request.
                localStorage.setItem('sponsor', JSON.stringify(response.data.sponsor));

                toast.success('Login successful!');
                navigate('/sponsor/add-vehicle'); // specific landing page
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <style>
                {`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            font-family: 'Segoe UI', sans-serif;
          }
          .login-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            animation: slideUp 0.5s ease-out;
          }
          .login-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .login-header h2 {
            color: #2d3436;
            margin: 0;
            font-size: 28px;
          }
          .form-group {
            position: relative;
            margin-bottom: 20px;
          }
          .input-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #b2bec3;
          }
          .form-input {
            width: 100%;
            padding: 12px 15px 12px 45px;
            border: 2px solid #dfe6e9;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s;
            box-sizing: border-box;
          }
          .form-input:focus {
            border-color: #0984e3;
            outline: none;
            box-shadow: 0 0 0 3px rgba(9, 132, 227, 0.1);
          }
          .submit-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(to right, #0984e3, #00cec9);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin-top: 10px;
          }
          .submit-btn:hover {
            transform: translateY(-2px);
            background: linear-gradient(to right, #0984e3, #0984e3);
          }
          .register-link {
            text-align: center;
            margin-top: 20px;
            color: #636e72;
          }
          .register-link a {
            color: #0984e3;
            text-decoration: none;
            font-weight: 600;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>

            <div className="login-card">
                <div className="login-header">
                    <h2>Host Login</h2>
                    <p>Manage your vehicles</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <Mail className="input-icon" size={20} />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="register-link">
                    New to RentHub? <a onClick={() => navigate('/register-sponsor')} style={{ cursor: 'pointer' }}>Register here</a>
                </div>
            </div>
        </div>
    );
};

export default LoginSponsor;
