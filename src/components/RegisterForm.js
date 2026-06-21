import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { supabase } from '../supabaseClient';
import { normalizeEmailForSubmit } from '../utils/emailUtils';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // default role
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [suggestedEmail, setSuggestedEmail] = useState('');

  // Fungsi untuk generate alternatif email jika ada titik di local part
  const generateEmailAlternatives = (emailValue) => {
    const normalizedEmail = normalizeEmailForSubmit(emailValue);
    const parts = normalizedEmail.split('@');
    if (parts.length !== 2) return [];
    
    const localPart = parts[0];
    const domain = parts[1];
    const alternatives = [];
    
    // Alternatif 1: Ganti titik dengan underscore
    if (localPart.includes('.')) {
      alternatives.push({
        email: `${localPart.replace(/\./g, '_')}@${domain}`,
        description: 'Ganti titik dengan underscore'
      });
    }
    
    // Alternatif 2: Hapus titik
    if (localPart.includes('.')) {
      alternatives.push({
        email: `${localPart.replace(/\./g, '')}@${domain}`,
        description: 'Hapus titik'
      });
    }
    
    // Alternatif 3: Ganti titik dengan hyphen
    if (localPart.includes('.')) {
      alternatives.push({
        email: `${localPart.replace(/\./g, '-')}@${domain}`,
        description: 'Ganti titik dengan hyphen'
      });
    }
    
    return alternatives;
  };

  const isDuplicateEmailError = (supabaseError) => {
    const errorMessage = (supabaseError?.message || '').toLowerCase();
    const errorCode = String(supabaseError?.code || supabaseError?.status || '').toLowerCase();

    return (
      errorMessage.includes('already registered') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('user already registered') ||
      errorMessage.includes('email already registered') ||
      errorMessage.includes('duplicate') ||
      errorCode === 'user_already_registered' ||
      errorCode === 'email_already_registered'
    );
  };

  const isInvalidEmailError = (supabaseError) => {
    const errorMessage = (supabaseError?.message || '').toLowerCase();
    const errorCode = String(supabaseError?.code || '').toLowerCase();

    return (
      errorCode === 'email_address_invalid' ||
      errorCode === 'invalid_email' ||
      errorCode === 'validation_failed' ||
      errorMessage.includes('invalid email') ||
      errorMessage.includes('email format') ||
      errorMessage.includes('email is invalid') ||
      (errorMessage.includes('email address') && errorMessage.includes('invalid')) ||
      errorMessage.includes('malformed')
    );
  };

  // Custom email validation - lebih fleksibel dari HTML5 validation
  const validateEmail = (emailValue) => {
    const normalizedEmail = normalizeEmailForSubmit(emailValue);

    // Regex yang lebih fleksibel untuk email dengan subdomain panjang
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!normalizedEmail) {
      return 'Email wajib diisi.';
    }
    
    if (!emailRegex.test(normalizedEmail)) {
      return 'Format email tidak valid.';
    }
    
    // Validasi tambahan: pastikan ada domain
    const parts = normalizedEmail.split('@');
    if (parts.length !== 2 || !parts[1] || !parts[1].includes('.')) {
      return 'Format email tidak valid.';
    }
    
    // Validasi tambahan: pastikan domain tidak terlalu panjang
    // Supabase mungkin membatasi panjang domain
    const domain = parts[1];
    if (domain.length > 253) { // Max domain length per RFC
      return 'Domain email terlalu panjang.';
    }
    
    // Validasi: pastikan local part (sebelum @) tidak terlalu panjang
    const localPart = parts[0];
    if (localPart.length > 64) { // Max local part length per RFC
      return 'Bagian email sebelum @ terlalu panjang.';
    }
    
    return '';
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    setEmailError('');
    setSuggestedEmail(''); // Clear suggested email saat user mengetik
    
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

    const normalizedEmail = normalizeEmailForSubmit(email);
    const submittedPassword = password || '';
    
    // Validasi email tidak kosong
    if (!normalizedEmail) {
      setEmailError('Email wajib diisi.');
      return;
    }
    
    // Validasi password tidak kosong
    if (!submittedPassword || submittedPassword.trim().length === 0) {
      setError('Password wajib diisi.');
      return;
    }
    
    // Validasi password minimal (Supabase requirement)
    if (submittedPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    
    // Validasi email format (double check)
    const emailValidationError = validateEmail(normalizedEmail);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    
    // Pastikan email dan password adalah string yang valid
    if (typeof normalizedEmail !== 'string' || typeof submittedPassword !== 'string') {
      setError('Format input tidak valid.');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: submittedPassword,
        options: {
          data: {
            role: role || 'user'
          }
        }
      });

      if (error) {
        if (isDuplicateEmailError(error)) {
          setError('Email ini sudah terdaftar. Silakan gunakan email lain atau lakukan login.');
          setEmailError(''); // Clear email error karena ini bukan masalah format
        }
        else if (isInvalidEmailError(error)) {
          const emailParts = normalizedEmail.split('@');
          const localPart = emailParts[0];
          const hasDotInLocalPart = localPart && localPart.includes('.');
          
          if (hasDotInLocalPart) {
            // Generate alternatif email
            const alternatives = generateEmailAlternatives(email);
            if (alternatives.length > 0) {
              const firstAlternative = alternatives[0];
              setSuggestedEmail(firstAlternative.email);
              setEmailError(`Format email tidak diterima oleh Supabase. Email dengan titik di local part mungkin ditolak. Coba gunakan format alternatif: ${firstAlternative.email}`);
            } else {
              setEmailError('Format email tidak diterima oleh Supabase. Email dengan titik di local part mungkin ditolak. Silakan gunakan email dengan format yang lebih standar.');
            }
          } else {
            setEmailError('Format email tidak diterima oleh Supabase. Email ini mungkin memiliki format yang tidak didukung. Silakan gunakan email dengan format yang lebih standar (contoh: user@example.com).');
          }
          setError(''); // Clear general error karena ini masalah format
        }
        // Error lainnya (password, network, dll)
        else {
          setError(error.message || 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
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
                {suggestedEmail && (
                  <div className="mt-2 p-2" style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <i className="bi bi-lightbulb me-1" style={{ color: '#0284c7' }}></i>
                        <strong style={{ color: '#0284c7' }}>Saran:</strong> Gunakan email alternatif:
                        <code className="ms-1" style={{ 
                          background: '#e0f2fe', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontSize: '0.7rem'
                        }}>{suggestedEmail}</code>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setEmail(suggestedEmail);
                          setEmailError('');
                          setSuggestedEmail('');
                        }}
                        style={{
                          background: '#0284c7',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          marginLeft: '8px'
                        }}
                      >
                        Gunakan
                      </button>
                    </div>
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
