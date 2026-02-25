import React from 'react';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ title = 'No data yet', description = 'Once you add records, they will appear here.' }) => (
  <div className="empty-state-card">
    <FiInbox />
    <h4>{title}</h4>
    <p>{description}</p>
  </div>
);

export default EmptyState;
