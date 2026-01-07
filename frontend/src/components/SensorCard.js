import React from 'react';
import './SensorCard.css';

const SensorCard = ({ title, value, unit, icon, color, min, max, avg, isBoolean, boolValue, isDanger, threshold, showStatus }) => {
  const displayValue = isBoolean ? value : typeof value === 'number' ? value.toFixed(2) : value;
  const cardColor = isDanger ? '#ff3838' : color;
  
  // Determine MQ7 status based on value ranges
  const getMq7Status = () => {
    if (value < 300) return { text: 'Normal', color: '#4caf50', icon: '✓' };
    if (value < 500) return { text: 'Moderate', color: '#ff9800', icon: '⚠' };
    if (value < 700) return { text: 'High', color: '#ff5722', icon: '⚠' };
    return { text: 'Critical', color: '#f44336', icon: '🚨' };
  };
  
  const status = showStatus ? getMq7Status() : null;
  
  return (
    <div className={`sensor-card ${isDanger ? 'danger-card' : ''}`} style={{ borderTop: `4px solid ${cardColor}` }}>
      {isDanger && <div className="danger-badge">⚠️ DANGER</div>}
      <div className="card-header">
        <span className="card-icon" style={{ background: `${cardColor}20`, color: cardColor }}>
          {icon}
        </span>
        <h3>{title}</h3>
      </div>
      
      <div className="card-body">
        <div className="main-value" style={{ color: cardColor }}>
          {isBoolean ? (
            <div className={`boolean-indicator ${boolValue ? 'active' : 'inactive'}`}>
              {value}
            </div>
          ) : (
            <>
              <span className="value">{displayValue}</span>
              <span className="unit">{unit}</span>
            </>
          )}
        </div>
        
        {isDanger && threshold && (
          <div className="threshold-warning">
            ⚠️ Threshold: {threshold} {unit}
          </div>
        )}
        
        {showStatus && status && (
          <div className="status-display" style={{ 
            background: `${status.color}20`, 
            color: status.color,
            padding: '10px',
            borderRadius: '8px',
            marginTop: '10px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {status.icon} {status.text}
          </div>
        )}
        
        {!isBoolean && (
          <div className="stats">
            {avg !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Avg:</span>
                <span className="stat-value">{avg.toFixed(2)} {unit}</span>
              </div>
            )}
            {min !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Min:</span>
                <span className="stat-value">{min.toFixed(2)} {unit}</span>
              </div>
            )}
            {max !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Max:</span>
                <span className="stat-value">{max.toFixed(2)} {unit}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <div className="pulse" style={{ background: cardColor }}></div>
        <span>Live</span>
      </div>
    </div>
  );
};

export default SensorCard;
