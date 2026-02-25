import React from 'react';

const Button = ({ variant = 'primary', className = '', loading = false, disabled = false, children, ...props }) => {
  const classes = `ui-btn ui-btn-${variant} ${className}`.trim();
  return (
    <button
      {...props}
      className={classes}
      disabled={disabled || loading}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
};

export default Button;
