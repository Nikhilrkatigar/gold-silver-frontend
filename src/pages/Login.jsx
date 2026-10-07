import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion } from 'motion/react';
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
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
      padding: '1.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom))'
    }}>
      <motion.div
        className="card"
        style={{ maxWidth: '400px', width: '100%', padding: '2rem 1.5rem', boxShadow: 'var(--shadow-lg)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src="/favicon.svg" alt="" width="64" height="64" style={{ borderRadius: 16, margin: '0 auto 1rem', display: 'block' }} />
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            Gold &amp; Silver Manager
          </h1>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
            Sign in to your shop account
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label className="input-label" htmlFor="login-phone">Phone number</label>
            <div style={{ position: 'relative' }}>
              <FiPhone aria-hidden="true" style={iconStyle} />
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                className="input"
                placeholder="10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <FiLock aria-hidden="true" style={iconStyle} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none' }}
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
                <span className="loading" aria-hidden="true"></span>
                Signing in...
              </>
            ) : (
              <>
                <FiLogIn aria-hidden="true" />
                Sign In
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

const iconStyle = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-tertiary)',
  pointerEvents: 'none'
};
