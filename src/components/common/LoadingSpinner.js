import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  text = 'Loading...', 
  showText = true,
  color = 'primary',
  centered = true 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'spinner-border-sm';
      case 'large': return '';
      default: return '';
    }
  };

  const spinner = (
    <>
      <div className={`spinner-border text-${color} ${getSizeClass()}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {showText && <span className="ms-2">{text}</span>}
    </>
  );

  if (centered) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        {spinner}
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center">
      {spinner}
    </div>
  );
};

export default LoadingSpinner; 