import React from 'react';

const SkeletonTable = ({ rows = 6, cols = 5 }) => (
  <div className="skeleton-table">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={`r-${r}`} className="skeleton-row">
        {Array.from({ length: cols }).map((__, c) => (
          <span key={`c-${r}-${c}`} className="skeleton-cell" />
        ))}
      </div>
    ))}
  </div>
);

export default SkeletonTable;
