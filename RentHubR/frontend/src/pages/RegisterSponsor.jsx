import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, CreditCard, Landmark, MapPin, BadgeCheck } from 'lucide-react';
import axios from 'axios';

const RegisterSponsor = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        bankAccount: '',
        ifscCode: '',
        upiId: '',
        address: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // Updated endpoint to RentHub backend
            const response = await axios.post('/api/sponsor/register', formData);
            if (response.data) {
                toast.success('Registration successful! Please login.');
                navigate('/login-sponsor'); // Redirect to sponsor login
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <style>
                {`
          .register-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            font-family: 'Segoe UI', sans-serif;
          }
          .register-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 500px;
            animation: slideUp 0.5s ease-out;
          }
          .register-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .register-header h2 {
            color: #2d3436;
            margin: 0;
            font-size: 28px;
          }
          .register-header p {
            color: #636e72;
            margin-top: 10px;
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
          .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .login-link {
            text-align: center;
            margin-top: 20px;
            color: #636e72;
          }
          .login-link a {
            color: #0984e3;
            text-decoration: none;
            font-weight: 600;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .divider {
            height: 1px;
            background: #dfe6e9;
            margin: 20px 0;
          }
          .section-title {
            color: #0984e3;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        `}
            </style>

            <div className="register-card">
                <div className="register-header">
                    <h2>Become a Host</h2>
                    <p>Start earning by renting your vehicle</p>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="section-title">Personal Details</div>

                    <div className="form-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="text"
                            name="fullName"
                            placeholder="Full Name"
                            className="form-input"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                        <Phone className="input-icon" size={20} />
                        <input
                            type="tel"
                            name="phoneNumber"
                            placeholder="Phone Number"
                            className="form-input"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <MapPin className="input-icon" size={20} />
                        <input
                            type="text"
                            name="address"
                            placeholder="Full Address"
                            className="form-input"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="divider"></div>
                    <div className="section-title">Banking Details (For Payouts)</div>

                    <div className="form-group">
                        <Landmark className="input-icon" size={20} />
                        <input
                            type="text"
                            name="bankAccount"
                            placeholder="Bank Account Number"
                            className="form-input"
                            value={formData.bankAccount}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <BadgeCheck className="input-icon" size={20} />
                        <input
                            type="text"
                            name="ifscCode"
                            placeholder="IFSC Code"
                            className="form-input"
                            value={formData.ifscCode}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <CreditCard className="input-icon" size={20} />
                        <input
                            type="text"
                            name="upiId"
                            placeholder="UPI ID (Optional)"
                            className="form-input"
                            value={formData.upiId}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="divider"></div>
                    <div className="section-title">Security</div>

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

                    <div className="form-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register as Host'}
                    </button>
                </form>

                <div className="login-link">
                    Already a host? <a onClick={() => navigate('/login-sponsor')} style={{ cursor: 'pointer' }}>Login here</a>
                </div>
            </div>
        </div>
    );
};

export default RegisterSponsor;
