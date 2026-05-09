import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Bike, Car, Truck, DollarSign, Calendar, FileText, Info } from 'lucide-react';
import axios from 'axios';

const AddVehicle = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [vehicleType, setVehicleType] = useState('bike');
    const [formData, setFormData] = useState({
        name: '',
        registrationNumber: '',
        model: '',
        year: '',
        pricePerHour: '',
        engine: '',
        fuelType: '',
        description: ''
    });
    const [files, setFiles] = useState({
        image: null,
        rc: null,
        insurance: null,
        puc: null
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFiles({ ...files, [e.target.name]: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login first');
            navigate('/login-sponsor');
            return;
        }

        setLoading(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        Object.keys(files).forEach(key => {
            if (files[key]) data.append(key, files[key]);
        });

        try {
            await axios.post(`/api/sponsor/add-vehicle/${vehicleType}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            toast.success('Vehicle added successfully! Waiting for approval.');
            // Optionally clear form or redirect to a dashboard
            setFormData({
                name: '', registrationNumber: '', model: '', year: '', pricePerHour: '', engine: '', fuelType: '', description: ''
            });
            setFiles({ image: null, rc: null, insurance: null, puc: null });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to submit vehicle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-vehicle-container">
            <style>
                {`
          .add-vehicle-container {
            min-height: 100vh;
            padding: 40px 20px;
            background: #f8f9fa;
            font-family: 'Segoe UI', sans-serif;
          }
          .form-card {
            background: white;
            max-width: 800px;
            margin: 0 auto;
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            padding: 40px;
            animation: fadeIn 0.5s;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .header h2 {
            color: #2d3436;
            margin: 0;
            font-size: 28px;
          }
          .type-selector {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
          }
          .type-btn {
            padding: 10px 25px;
            border: 2px solid #dfe6e9;
            border-radius: 50px;
            background: white;
            color: #636e72;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
          }
          .type-btn.active {
            border-color: #0984e3;
            background: #0984e3;
            color: white;
            box-shadow: 0 4px 10px rgba(9, 132, 227, 0.2);
          }
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-group.full-width {
            grid-column: span 2;
          }
          label {
            display: block;
            margin-bottom: 8px;
            color: #2d3436;
            font-weight: 500;
            font-size: 14px;
          }
          .form-input, .form-textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #dfe6e9;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
             box-sizing: border-box;
          }
          .form-input:focus, .form-textarea:focus {
            border-color: #0984e3;
            outline: none;
          }
          .file-input-wrapper {
            border: 2px dashed #dfe6e9;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.3s;
          }
          .file-input-wrapper:hover {
            border-color: #0984e3;
          }
          .upload-icon {
            color: #b2bec3;
            margin-bottom: 10px;
          }
          .submit-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(to right, #0984e3, #00cec9);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: transform 0.2s;
          }
          .submit-btn:hover {
            transform: translateY(-2px);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>

            <div className="form-card">
                <div className="header">
                    <h2>List Your Vehicle</h2>
                    <p style={{ color: '#636e72', marginTop: '5px' }}>Earn money by sharing your vehicle</p>
                </div>

                <div className="type-selector">
                    <button className={`type-btn ${vehicleType === 'bike' ? 'active' : ''}`} onClick={() => setVehicleType('bike')}>
                        <Bike size={18} /> Bike
                    </button>
                    <button className={`type-btn ${vehicleType === 'scooty' ? 'active' : ''}`} onClick={() => setVehicleType('scooty')}>
                        <Bike size={18} /> Scooter
                    </button>
                    <button className={`type-btn ${vehicleType === 'car' ? 'active' : ''}`} onClick={() => setVehicleType('car')}>
                        <Car size={18} /> Car
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Vehicle Name</label>
                            <input className="form-input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Royal Enfield Classic 350" required />
                        </div>
                        <div className="form-group">
                            <label>Registration Number</label>
                            <input className="form-input" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="e.g. KA 01 AB 1234" required />
                        </div>
                        <div className="form-group">
                            <label>Model</label>
                            <input className="form-input" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Classic 350" required />
                        </div>
                        <div className="form-group">
                            <label>Year</label>
                            <input className="form-input" name="year" type="number" value={formData.year} onChange={handleChange} placeholder="e.g. 2023" required />
                        </div>
                        <div className="form-group">
                            <label>Price Per Hour (₹)</label>
                            <input className="form-input" name="pricePerHour" type="number" value={formData.pricePerHour} onChange={handleChange} placeholder="e.g. 50" required />
                        </div>
                        <div className="form-group">
                            <label>Engine (Optional)</label>
                            <input className="form-input" name="engine" value={formData.engine} onChange={handleChange} placeholder="e.g. 350cc" />
                        </div>
                        <div className="form-group">
                            <label>Fuel Type (Optional)</label>
                            <input className="form-input" name="fuelType" value={formData.fuelType} onChange={handleChange} placeholder="e.g. Petrol" />
                        </div>
                        <div className="form-group full-width">
                            <label>Description (Optional)</label>
                            <textarea className="form-textarea" rows="3" name="description" value={formData.description} onChange={handleChange} placeholder="Describe your vehicle..." />
                        </div>

                        <div className="form-group full-width">
                            <label>Vehicle Image (Required)</label>
                            <div className="file-input-wrapper">
                                <Upload className="upload-icon" size={24} />
                                <input type="file" name="image" onChange={handleFileChange} accept="image/*" required style={{ display: 'block', margin: '0 auto' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>RC Document (Required)</label>
                            <input type="file" name="rc" onChange={handleFileChange} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>Insurance (Required)</label>
                            <input type="file" name="insurance" onChange={handleFileChange} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>PUC (Required)</label>
                            <input type="file" name="puc" onChange={handleFileChange} className="form-input" required />
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Vehicle'}
                    </button>

                    <p style={{ textAlign: 'center', color: '#636e72', fontSize: '13px', marginTop: '15px' }}>
                        <Info size={12} style={{ marginRight: '5px' }} />
                        Your vehicle will be listed after Admin approval (usually 24 hours).
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AddVehicle;
