import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiLogIn, FiPhone, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const user = await login({ phoneNumber, password });
      
      toast.success(`Welcome back, ${user.shopName}!`);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
          }}>
            ✨
          </div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>
            Gold & Silver Manager
          </h1>
          <p className="text-muted">
            Professional accounting for your shop
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">
              <FiPhone style={{ display: 'inline', marginRight: '0.5rem' }} />
              Phone Number
            </label>
            <input
              type="tel"
              className="input"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <FiLock style={{ display: 'inline', marginRight: '0.5rem' }} />
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0',
                  fontSize: '1rem'
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading"></span>
                Signing in...
              </>
            ) : (
              <>
                <FiLogIn />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
