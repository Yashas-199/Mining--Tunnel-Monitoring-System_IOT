import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const Chart = ({ data, dataKeys, colors, labels, threshold }) => {
  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
            {new Date(label).toLocaleString()}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontWeight: '500' }}>
              {labels[index]}: {entry.value.toFixed(2)}
            </p>
          ))}
          {threshold && (
            <p style={{ margin: '8px 0 0 0', color: '#ff3838', fontWeight: '600', borderTop: '1px solid #eee', paddingTop: '4px' }}>
              ⚠️ Threshold: {threshold}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxis}
          stroke="#888"
          style={{ fontSize: '0.85rem' }}
        />
        <YAxis stroke="#888" style={{ fontSize: '0.85rem' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px', fontSize: '0.9rem' }}
          formatter={(value, entry, index) => labels[index]}
        />
        {threshold && (
          <ReferenceLine 
            y={threshold} 
            stroke="#ff3838" 
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ 
              value: `Danger: ${threshold}`, 
              position: 'right',
              fill: '#ff3838',
              fontWeight: 'bold'
            }}
          />
        )}
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index]}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: colors[index] }}
            isAnimationActive={true}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Chart;
