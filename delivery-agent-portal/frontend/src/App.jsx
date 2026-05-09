import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Registration from './pages/Registration';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
