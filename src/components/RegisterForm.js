import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { supabase } from '../supabaseClient';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // default role
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // Custom email validation - lebih fleksibel dari HTML5 validation
  const validateEmail = (emailValue) => {
    // Regex yang lebih fleksibel untuk email dengan subdomain panjang
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailValue) {
      return 'Email wajib diisi.';
    }
    
    if (!emailRegex.test(emailValue)) {
      return 'Format email tidak valid.';
    }
    
    // Validasi tambahan: pastikan ada domain
    const parts = emailValue.split('@');
    if (parts.length !== 2 || !parts[1] || !parts[1].includes('.')) {
      return 'Format email tidak valid.';
    }
    
    return '';
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    setEmailError('');
    
    // Validasi real-time saat user mengetik (opsional)
    if (emailValue && e.target.value.length > 0) {
      const validationError = validateEmail(emailValue);
      if (validationError) {
        setEmailError(validationError);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mencegah HTML5 validation
    const form = e.target;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
    }
    
    setError('');
    setEmailError('');
    setSuccess('');
    
    // Validasi email custom
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role
          }
        }
      });

      if (error) {
        // Parse error dari Supabase untuk memberikan pesan yang lebih spesifik
        const errorMessage = error.message || '';
        const errorCode = error.status || error.code || '';
        
        // Debug: log error untuk membantu troubleshooting
        console.log('Supabase Error:', {
          message: errorMessage,
          code: errorCode,
          status: error.status,
          fullError: error
        });
        
        // Cek apakah email sudah terdaftar
        // Supabase biasanya return error dengan message seperti:
        // - "User already registered"
        // - "Email already registered" 
        // - Status code 422
        if (
          errorMessage.toLowerCase().includes('already registered') ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('user already registered') ||
          errorMessage.toLowerCase().includes('email already registered') ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorCode === 'user_already_registered' ||
          errorCode === 'email_already_registered' ||
          error.status === 422 ||
          error.status === 400 // Kadang Supabase return 400 untuk duplicate
        ) {
          setError('Email ini sudah terdaftar. Silakan gunakan email lain atau lakukan login.');
          setEmailError(''); // Clear email error karena ini bukan masalah format
        }
        // Cek apakah format email tidak valid
        else if (
          errorMessage.toLowerCase().includes('invalid email') ||
          errorMessage.toLowerCase().includes('email format') ||
          errorMessage.toLowerCase().includes('email is invalid') ||
          errorMessage.toLowerCase().includes('malformed') ||
          errorCode === 'invalid_email' ||
          errorCode === 'validation_failed' ||
          error.status === 400 // Kadang 400 untuk invalid format
        ) {
          setEmailError('Format email tidak valid. Pastikan email yang Anda masukkan benar.');
          setError(''); // Clear general error karena ini masalah format
        }
        // Error lainnya (password, network, dll)
        else {
          setError(errorMessage || 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
          setEmailError(''); // Clear email error untuk error lainnya
        }
      } else {
        setSuccess('User berhasil didaftarkan! Silakan cek email untuk verifikasi.');
        setEmail('');
        setPassword('');
        setRole('user');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mendaftar.');
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
                <i className="bi bi-person-plus" style={{ fontSize: '2rem', color: 'white' }}></i>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                Register User Baru
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Daftarkan user baru ke sistem</p>
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

            {success && (
              <div className="alert mb-4" role="alert" style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem'
              }}>
                <i className="bi bi-check-circle me-2"></i>
                {success}
              </div>
            )}

            <form 
              onSubmit={handleSubmit} 
              noValidate
              onInvalid={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="mb-3">
                <label htmlFor="email" className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Email
                </label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute" style={{
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    zIndex: 1
                  }}></i>
                  <input
                    type="text"
                    className={`form-control ${emailError ? 'is-invalid' : ''}`}
                    id="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Masukkan email"
                    autoComplete="email"
                    style={{
                      paddingLeft: '2.5rem',
                      border: emailError ? '1px solid #dc2626' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      // Validasi saat blur
                      const validationError = validateEmail(e.target.value);
                      if (validationError) {
                        setEmailError(validationError);
                        e.target.style.borderColor = '#dc2626';
                      } else {
                        setEmailError('');
                        e.target.style.borderColor = '#e2e8f0';
                      }
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {emailError && (
                  <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {emailError}
                  </div>
                )}
              </div>

              <div className="mb-3">
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
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="new-password"
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
                <label htmlFor="role" className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Role
                </label>
                <div className="position-relative">
                  <i className="bi bi-person-badge position-absolute" style={{
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    zIndex: 1
                  }}></i>
                  <select
                    className="form-select"
                    id="role"
                    value={role}
                    onChange={e => setRole(e.target.value)}
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
                  >
                    <option value="user">User (Crew Kapal)</option>
                    <option value="admin">Admin (Marine Surveyor)</option>
                  </select>
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
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus me-2"></i>
                    Register
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
