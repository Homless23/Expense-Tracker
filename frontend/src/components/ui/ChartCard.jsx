import React from 'react';

const ChartCard = ({ title, children, actions = null }) => (
  <section className="ui-card chart-card">
    <div className="chart-card-head">
      <h3>{title}</h3>
      {actions}
    </div>
    <div className="chart-card-body">
      {children}
    </div>
  </section>
);

export default ChartCard;
