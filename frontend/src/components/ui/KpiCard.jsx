import React from 'react';

const KpiCard = ({
  title,
  value,
  trend = 0,
  prefix = '',
  suffix = '',
  meta = '',
  onViewReport = null
}) => {
  const up = Number(trend) >= 0;
  return (
    <article className="kpi-card kpi-card-strong">
      <span className="kpi-title">{title}</span>
      <strong>{prefix}{value}{suffix}</strong>
      <p className={up ? 'kpi-trend up' : 'kpi-trend down'}>
        {up ? '+ ' : '- '}
        {Math.abs(Number(trend)).toFixed(1)}%
      </p>
      <div className="kpi-foot">
        <span className="kpi-meta">{meta || 'N/A'}</span>
        <button
          type="button"
          className="kpi-report-btn"
          onClick={onViewReport || undefined}
          disabled={!onViewReport}
        >
          View Report
        </button>
      </div>
    </article>
  );
};

export default KpiCard;
