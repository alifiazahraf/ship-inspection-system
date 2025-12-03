import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { supabase } from '../supabaseClient'; // Import supabase client
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log(username, password);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // atau ganti dengan email jika pakai email
        password,
      });
      console.log(data);
      if (error) {
        setError(error.message);
      } else {
        onLogin();
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Koneksi error. Pastikan server backend berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center" style={{ 
      backgroundColor: '#f0f4f8',
      backgroundImage: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(30, 64, 175, 0.03) 100%)'
    }}>
      <div className="row w-100">
        <div className="col-md-5 col-lg-4 mx-auto">
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 4px 12px rgba(30, 58, 138, 0.15)',
            border: '1px solid #e2e8f0'
          }}>
            <div className="text-center mb-4">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <i className="bi bi-shield-lock" style={{ fontSize: '2rem', color: 'white' }}></i>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                Marine Inspection System
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Login untuk mengakses sistem</p>
            </div>

            {error && (
              <div className="alert mb-4" role="alert" style={{
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem'
              }}>
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Username / Email
                </label>
                <div className="position-relative">
                  <i className="bi bi-person position-absolute" style={{
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    zIndex: 1
                  }}></i>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Masukkan username atau email"
                    style={{
                      paddingLeft: '2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Password
                </label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute" style={{
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    zIndex: 1
                  }}></i>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password"
                    style={{
                      paddingLeft: '2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn w-100"
                disabled={loading}
                style={{
                  background: loading ? '#94a3b8' : '#1e3a8a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = '#1e40af';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = '#1e3a8a';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Login
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-top text-center">
              <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Demo: admin/admin123 (Marine Surveyor) | user/user123 (Crew Kapal)
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
