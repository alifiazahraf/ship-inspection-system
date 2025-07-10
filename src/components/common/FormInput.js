import React from 'react';

const FormInput = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  error = null,
  className = "",
  helpText = null,
  rows = null,
  accept = null,
  max = null,
  min = null,
  multiple = false
}) => {
  const InputComponent = type === 'textarea' ? 'textarea' : 'input';
  
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <InputComponent
        type={type !== 'textarea' ? type : undefined}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        accept={accept}
        max={max}
        min={min}
        multiple={multiple}
      />
      {helpText && <div className="form-text">{helpText}</div>}
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default FormInput; 