import React from 'react';
import logo from '../../assets/images/gls-logo.png';

const Navbar = ({ 
  title = "Dashboard", 
  user, 
  onLogout, 
  rightContent = null 
}) => {
  return (
    <nav
      className="shadow-sm"
      style={{
        background: 'linear-gradient(90deg, #1857b7 0%, #0ea5e9 100%)',
        padding: '0.75rem 0',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="container-fluid px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <img 
            src={logo} 
            alt="Company Logo" 
            style={{ 
              height: '50px', 
              marginRight: '1rem',
              objectFit: 'contain',
              backgroundColor: 'white',
              padding: '0.5rem',
            }} 
          />
          <span className="fw-bold fs-4 text-white">{title}</span>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          {rightContent}
          
          <span className="text-white fw-medium me-2">{user?.email}</span>
          <span
            className="d-flex align-items-center justify-content-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
            }}
          >
            <i className="bi bi-person fs-4 text-white"></i>
          </span>
          <button
            onClick={onLogout}
            className="btn d-flex align-items-center fw-semibold"
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.5rem 1.25rem',
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginLeft: '1rem',
            }}
          >
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 