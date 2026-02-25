import React from 'react';

const Spinner = () => {
  return (
    <div className="app-spinner-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="app-spinner" />
    </div>
  );
};

export default Spinner;
