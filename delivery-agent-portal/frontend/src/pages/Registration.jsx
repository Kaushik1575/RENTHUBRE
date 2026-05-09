import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Camera, 
  ShieldCheck, Truck, Banknote, 
  Lock, CheckCircle2, ChevronRight, ChevronLeft,
  Upload, CreditCard, Calendar
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const steps = [
  { id: 1, title: 'Identity', icon: User },
  { id: 2, title: 'Verification', icon: ShieldCheck },
  { id: 3, title: 'Logistics', icon: Truck },
  { id: 4, title: 'Security', icon: Lock }
];

const Registration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '', mobile: '', email: '', address: '', profilePhoto: null,
    aadhaarNumber: '', aadhaarFile: null, dlNumber: '', dlFile: null, dlExpiry: '',
    preferredArea: '', availabilityTiming: '', currentStatus: 'Available',
    bankAccount: '', ifscCode: '', upiId: '',
    password: '', confirmPassword: ''
  });

  const [otpSent, setOtpSent] = useState({ email: false, mobile: false });
  const [otpVerified, setOtpVerified] = useState({ email: false, mobile: false });
  const [otpCodes, setOtpCodes] = useState({ 
    email: ['', '', '', '', '', ''], 
    mobile: ['', '', '', '', '', ''] 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const API_URL = import.meta.env.VITE_API_URL;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    
    if (file) {
      // Profile photo MUST be image. Documents can be PDF.
      const isDoc = ['aadhaarFile', 'dlFile'].includes(name);
      const allowedTypes = isDoc 
        ? ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        : ['image/jpeg', 'image/png', 'image/jpg'];

      if (!allowedTypes.includes(file.type)) {
        alert(isDoc ? 'Please upload Image or PDF only.' : 'Please upload JPG or PNG images only.');
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, [name]: file }));
    }
  };

  const sendOtp = async (type) => {
    const identifier = type === 'email' ? formData.email : formData.mobile;
    if (!identifier) return alert(`Please enter your ${type}`);
    try {
      const endpoint = type === 'email' ? '/register/send-otp' : '/register/send-mobile-otp';
      const body = type === 'email' ? { email: identifier } : { phoneNumber: identifier };
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpSent(prev => ({ ...prev, [type]: true }));
      alert(`OTP sent to ${identifier}`);
    } catch (error) {
      alert(error.message);
    }
  };

  const verifyOtp = async (type) => {
    const identifier = type === 'email' ? formData.email : formData.mobile;
    const otp = otpCodes[type].join('');
    
    if (otp.length < 6) return alert('Please enter the full 6-digit code');

    try {
      const response = await fetch(`${API_URL}/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, identifier, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid OTP');
      setOtpVerified(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleOtpChange = (value, index, type) => {
    const newOtp = [...otpCodes[type]];
    // Allow only numbers
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    newOtp[index] = cleanValue;
    setOtpCodes({ ...otpCodes, [type]: newOtp });

    // Auto-focus next input
    if (cleanValue && index < 5) {
      const nextInput = document.getElementById(`otp-${type}-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index, type) => {
    if (e.key === 'Backspace' && !otpCodes[type][index] && index > 0) {
      const prevInput = document.getElementById(`otp-${type}-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('agent-assets').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('agent-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!otpVerified.email || !otpVerified.mobile) return alert('Please verify both Email and Mobile OTP first.');
    if (formData.password !== formData.confirmPassword) return alert('Passwords do not match.');
    
    setIsSubmitting(true);
    try {
      // 1. Create Auth Account in Supabase (Secure & Encrypted)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'delivery_agent'
          }
        }
      });

      if (authError) throw authError;

      // 2. Upload Documents
      const profileUrl = await uploadFile(formData.profilePhoto, 'profiles');
      const aadhaarUrl = await uploadFile(formData.aadhaarFile, 'aadhaar');
      const dlUrl = await uploadFile(formData.dlFile, 'licenses');

      // 3. Insert into delivery_agents table (Linking with auth.uid)
      const { error: profileError } = await supabase.from('delivery_agents').insert([{
        id: authData.user.id, // Linking to the auth user ID
        full_name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        profile_photo_url: profileUrl,
        aadhaar_number: formData.aadhaarNumber,
        aadhaar_url: aadhaarUrl,
        dl_number: formData.dlNumber,
        dl_url: dlUrl,
        dl_expiry: formData.dlExpiry,
        preferred_area: formData.preferredArea,
        availability_timing: formData.availabilityTiming,
        bank_account: formData.bankAccount,
        ifsc_code: formData.ifscCode,
        upi_id: formData.upiId,
        availability_status: 'Offline',
        is_verified: false // Admin must approve
      }]);

      if (profileError) throw profileError;
      setRegistrationSuccess(true);
    } catch (error) {
      if (error.message.includes('Bucket not found')) {
        alert('Setup Error: Please create a public bucket named "agent-assets" in your Supabase Storage dashboard to allow document uploads.');
      } else {
        alert('Security Error: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const CustomFileInput = ({ name, label, icon: Icon, file, accept = "image/*" }) => (
    <div className="input-group">
      <label>{label} <span className="text-red-500">*</span></label>
      <div className="file-upload-wrapper">
        <div className="file-upload-custom">
          <Icon size={20} color="var(--accent)" />
          <span>{file ? file.name : `Select ${label}...`}</span>
        </div>
        <input type="file" name={name} onChange={handleFileChange} accept={accept} />
      </div>
    </div>
  );

  const validateAadhaar = (val) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length > 0 && clean.length !== 12) {
      setErrors(prev => ({...prev, aadhaar: 'Aadhaar must be exactly 12 digits'}));
    } else {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.aadhaar;
        return newErrors;
      });
    }
  };

  if (registrationSuccess) {
    return (
      <div className="center flex" style={{ minHeight: '80vh' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card text-center" style={{ maxWidth: '500px' }}>
          <div className="mb-8" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <CheckCircle2 size={40} color="var(--success)" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Application Submitted</h2>
          <p className="text-text-secondary mb-8">We are reviewing your profile. Expect an email within 24 hours.</p>
          <button className="primary w-full" onClick={() => window.location.reload()}>Return to Home</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: '900px' }}>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Delivery <span className="text-gradient">Agent Portal</span></h1>
        <p className="text-text-secondary">Official onboarding for RentHubR car delivery experts.</p>
      </div>

      {/* Progress Tracker */}
      <div className="flex between mb-12" style={{ padding: '0 40px' }}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-3">
              <div className={`step-dot ${currentStep >= step.id ? 'active' : ''}`}>
                {currentStep > step.id ? <CheckCircle2 size={20} /> : <step.icon size={20} />}
              </div>
              <span className={`hidden md:block text-xs font-bold ${currentStep >= step.id ? 'text-accent' : 'text-text-secondary'}`}>{step.title}</span>
            </div>
            {index < steps.length - 1 && <div className={`step-line ${currentStep > step.id ? 'active' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="glass-card">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <div className="section-header">
              <h3>{steps[currentStep-1].title} Details</h3>
              <div className="line" />
            </div>

            {currentStep === 1 && (
              <div className="grid grid-2">
                <div className="input-group">
                  <label>Full Legal Name <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="relative">
                    <input name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="As per Aadhaar" className="pl-12" />
                    <User className="input-icon" size={20} />
                  </div>
                </div>
                <CustomFileInput name="profilePhoto" label="Profile Photo" icon={Camera} file={formData.profilePhoto} accept="image/*" />
                
                <div className="input-group">
                  <label>Email ID <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="input-with-button">
                    <div className="relative flex-1">
                      <input name="email" value={formData.email} onChange={handleInputChange} disabled={otpVerified.email} placeholder="name@email.com" className="pl-12" />
                      <Mail className="input-icon" size={20} />
                    </div>
                    {!otpVerified.email ? (
                      <button onClick={() => sendOtp('email')}>{otpSent.email ? 'Resend' : 'Send OTP'}</button>
                    ) : (
                      <div className="flex items-center px-4 bg-success/10"><CheckCircle2 size={16} color="var(--success)" /></div>
                    )}
                  </div>
                  {otpSent.email && !otpVerified.email && (
                    <div className="otp-container-modern mt-6">
                      <div className="otp-boxes-wrapper">
                        {otpCodes.email.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-email-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            autoComplete="off"
                            onChange={(e) => handleOtpChange(e.target.value, index, 'email')}
                            onKeyDown={(e) => handleOtpKeyDown(e, index, 'email')}
                            className="otp-box-modern"
                          />
                        ))}
                      </div>
                      <button onClick={() => verifyOtp('email')} className="verify-btn-modern">
                        Verify Code
                      </button>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>Mobile Contact <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="input-with-button">
                    <div className="relative flex-1">
                      <input name="mobile" value={formData.mobile} onChange={handleInputChange} disabled={otpVerified.mobile} placeholder="+91" className="pl-12" />
                      <Phone className="input-icon" size={20} />
                    </div>
                    {!otpVerified.mobile ? (
                      <button onClick={() => sendOtp('mobile')}>{otpSent.mobile ? 'Resend' : 'Send OTP'}</button>
                    ) : (
                      <div className="flex items-center px-4 bg-success/10"><CheckCircle2 size={16} color="var(--success)" /></div>
                    )}
                  </div>
                  {otpSent.mobile && !otpVerified.mobile && (
                    <div className="otp-container-modern mt-6">
                      <div className="otp-boxes-wrapper">
                        {otpCodes.mobile.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-mobile-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            autoComplete="off"
                            onChange={(e) => handleOtpChange(e.target.value, index, 'mobile')}
                            onKeyDown={(e) => handleOtpKeyDown(e, index, 'mobile')}
                            className="otp-box-modern"
                          />
                        ))}
                      </div>
                      <button onClick={() => verifyOtp('mobile')} className="verify-btn-modern">
                        Verify Code
                      </button>
                    </div>
                  )}
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Complete Address <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="relative">
                    <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="House No, Landmark, City, Pincode" className="pl-12 h-24" />
                    <MapPin className="input-icon" style={{ top: '24px', transform: 'none' }} size={20} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-2">
                <div className="input-group">
                  <label>Aadhaar Card Number <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="relative">
                    <input 
                      name="aadhaarNumber" 
                      value={formData.aadhaarNumber} 
                      onChange={(e) => {
                        handleInputChange(e);
                        validateAadhaar(e.target.value);
                      }} 
                      placeholder="12 Digit Number" 
                      className={`pl-12 ${errors.aadhaar ? 'border-red-500' : ''}`} 
                    />
                    <CreditCard className="input-icon" size={20} />
                  </div>
                  {errors.aadhaar && <span style={{fontSize: '0.8rem', color: '#ef4444', marginTop: '5px'}}>{errors.aadhaar}</span>}
                </div>
                <CustomFileInput name="aadhaarFile" label="Aadhaar Copy (Image/PDF)" icon={Upload} file={formData.aadhaarFile} accept="image/*,application/pdf" />
                <div className="input-group">
                  <label>Driving License No. <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="relative">
                    <input name="dlNumber" value={formData.dlNumber} onChange={handleInputChange} placeholder="DL-00000000" className="pl-12" />
                    <ShieldCheck className="input-icon" size={20} />
                  </div>
                </div>
                <div className="input-group">
                  <label>License Expiry <span style={{color: '#ef4444'}}>*</span></label>
                  <div className="relative">
                    <input type="date" name="dlExpiry" value={formData.dlExpiry} onChange={handleInputChange} className="pl-12" />
                    <Calendar className="input-icon" size={20} />
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <CustomFileInput name="dlFile" label="Upload Driving License (Image/PDF)" icon={Upload} file={formData.dlFile} accept="image/*,application/pdf" />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-2">
                <div className="input-group">
                  <label>Preferred Delivery City/Area</label>
                  <input name="preferredArea" value={formData.preferredArea} onChange={handleInputChange} placeholder="e.g. Mumbai Suburban" />
                </div>
                <div className="input-group">
                  <label>Shift Preference</label>
                  <select name="availabilityTiming" value={formData.availabilityTiming} onChange={handleInputChange}>
                    <option value="">Choose Shift</option>
                    <option value="Morning">Morning Expert (6AM - 2PM)</option>
                    <option value="Afternoon">Afternoon Expert (2PM - 10PM)</option>
                    <option value="Night">Night Expert (10PM - 6AM)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Bank Account</label>
                  <input name="bankAccount" value={formData.bankAccount} onChange={handleInputChange} placeholder="For Payouts" />
                </div>
                <div className="input-group">
                  <label>IFSC Code</label>
                  <input name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} placeholder="BANK0000000" />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="grid-2 grid">
                <div className="input-group">
                  <label>Set Secure Password</label>
                  <div className="relative">
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="pl-12" />
                    <Lock className="input-icon" size={20} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="relative">
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="pl-12" />
                    <Lock className="input-icon" size={20} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex between">
          <button className="secondary" onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1 || isSubmitting}>
            <ChevronLeft size={20} /> Back
          </button>
          {currentStep < 4 ? (
            <button className="primary" onClick={() => setCurrentStep(s => s + 1)}>
              Save & Continue <ChevronRight size={20} />
            </button>
          ) : (
            <button className="primary" onClick={handleSubmit} disabled={isSubmitting} style={{ background: 'var(--success)' }}>
              {isSubmitting ? 'Processing...' : 'Complete Application'} <CheckCircle2 size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registration;
