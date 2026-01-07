import React from 'react';
import './StatusIndicator.css';

const StatusIndicator = ({ label, connected }) => {
  return (
    <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
      <div className="status-dot"></div>
      <span className="status-label">{label}</span>
    </div>
  );
};

export default StatusIndicator;
