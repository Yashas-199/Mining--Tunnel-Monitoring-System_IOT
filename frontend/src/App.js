import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';
import SensorCard from './components/SensorCard';
import Chart from './components/Chart';
import StatusIndicator from './components/StatusIndicator';

const API_URL = 'http://localhost:5000';
const socket = io(API_URL);

function App() {
  const [currentData, setCurrentData] = useState({
    temperature: 0,
    humidity: 0,
    gasLevel: 0,
    mq7Level: 0,
    lightStatus: false
  });
  
  const [historicalData, setHistoricalData] = useState([]);
  const [stats, setStats] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({
    mqtt: false,
    mongodb: false,
    websocket: false
  });
  const [showDangerAlert, setShowDangerAlert] = useState(false);
  const [alertTrigger, setAlertTrigger] = useState({ type: 'none', value: 0 }); // Track what triggered the alert
  const GAS_THRESHOLD = 600; // MQ135 ADC threshold value (lowered for more realistic detection)
  const MQ7_THRESHOLD = 600; // MQ7 ADC threshold value
  const HUMIDITY_THRESHOLD = 70; // Humidity percentage threshold
  const TEMPERATURE_THRESHOLD = 35; // Temperature threshold in Celsius

  useEffect(() => {
    // Fetch initial data
    fetchLatestData();
    fetchHistoricalData();
    fetchStats();
    checkHealth();

    // Setup WebSocket listeners
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnectionStatus(prev => ({ ...prev, websocket: true }));
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnectionStatus(prev => ({ ...prev, websocket: false }));
    });

    socket.on('sensorData', (data) => {
      console.log('Received sensor data:', data);
      const gasLevel = data.gasLevel || 0;
      const humidity = data.humidity || 0;
      const temperature = data.temperature || 0;
      const mq7Level = data.mq7Level || 0;
      
      // Check all thresholds
      const gasExceeded = gasLevel > GAS_THRESHOLD;
      const mq7Exceeded = mq7Level > MQ7_THRESHOLD;
      const humidityExceeded = humidity > HUMIDITY_THRESHOLD;
      const temperatureExceeded = temperature > TEMPERATURE_THRESHOLD;
      const isLightOn = data.lightStatus || gasExceeded || mq7Exceeded || humidityExceeded || temperatureExceeded;
      
      setCurrentData({
        temperature: temperature,
        humidity: humidity,
        gasLevel: gasLevel,
        mq7Level: mq7Level,
        lightStatus: isLightOn
      });
      
      // Determine what triggered the alert and show danger alert
      const alerts = [];
      if (temperatureExceeded) alerts.push({ type: 'temperature', value: temperature });
      if (gasExceeded) alerts.push({ type: 'gas', value: gasLevel });
      if (mq7Exceeded) alerts.push({ type: 'mq7', value: mq7Level });
      if (humidityExceeded) alerts.push({ type: 'humidity', value: humidity });
      
      if (alerts.length > 0) {
        setShowDangerAlert(true);
        setAlertTrigger({ 
          type: alerts.length > 1 ? 'multiple' : alerts[0].type, 
          alerts: alerts,
          temperature: temperature,
          gasLevel: gasLevel,
          humidity: humidity
        });
      } else {
        setShowDangerAlert(false);
        setAlertTrigger({ type: 'none', value: 0 });
      }
      
      // Add to historical data (keep last 50 points)
      setHistoricalData(prev => {
        const newData = [...prev, {
          timestamp: new Date(data.timestamp).getTime(),
          ...data
        }];
        return newData.slice(-50);
      });
    });

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchStats, 30000);
    
    // Check health every 10 seconds
    const healthInterval = setInterval(checkHealth, 10000);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sensorData');
      clearInterval(statsInterval);
      clearInterval(healthInterval);
    };
  }, []);

  const fetchLatestData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/latest`);
      if (response.data && response.data.temperature !== undefined) {
        const gasLevel = response.data.gasLevel || 0;
        const temperature = response.data.temperature || 0;
        const humidity = response.data.humidity || 0;
        const mq7Level = response.data.mq7Level || 0;
        
        setCurrentData({
          temperature: temperature,
          humidity: humidity,
          gasLevel: gasLevel,
          mq7Level: mq7Level,
          lightStatus: response.data.lightStatus || gasLevel > GAS_THRESHOLD || mq7Level > MQ7_THRESHOLD || humidity > HUMIDITY_THRESHOLD || temperature > TEMPERATURE_THRESHOLD
        });
        
        // Check for any threshold violations
        const alerts = [];
        if (temperature > TEMPERATURE_THRESHOLD) alerts.push({ type: 'temperature', value: temperature });
        if (gasLevel > GAS_THRESHOLD) alerts.push({ type: 'gas', value: gasLevel });
        if (mq7Level > MQ7_THRESHOLD) alerts.push({ type: 'mq7', value: mq7Level });
        if (humidity > HUMIDITY_THRESHOLD) alerts.push({ type: 'humidity', value: humidity });
        
        if (alerts.length > 0) {
          setShowDangerAlert(true);
          setAlertTrigger({ 
            type: alerts.length > 1 ? 'multiple' : alerts[0].type, 
            alerts: alerts,
            temperature: temperature,
            gasLevel: gasLevel,
            humidity: humidity
          });
        }
      }
    } catch (error) {
      console.error('Error fetching latest data:', error);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/history?limit=50`);
      if (response.data && response.data.data) {
          const formattedData = response.data.data.map(item => ({
          timestamp: new Date(item.timestamp).getTime(),
          temperature: item.temperature || 0,
          humidity: item.humidity || 0,
          gasLevel: item.gasLevel || 0,
          mq7Level: item.mq7Level || 0
        }));
        setHistoricalData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      setConnectionStatus(prev => ({
        ...prev,
        mqtt: response.data.mqtt === 'Connected',
        mongodb: response.data.mongodb === 'Connected'
      }));
    } catch (error) {
      console.error('Error checking health:', error);
      setConnectionStatus(prev => ({
        ...prev,
        mqtt: false,
        mongodb: false
      }));
    }
  };

  return (
    <div className="App">
      {/* Danger Alert Overlay */}
      {showDangerAlert && (
        <div className="danger-alert-overlay">
          <div className="danger-alert">
            <div className="alert-icon">⚠️</div>
            {alertTrigger.type === 'multiple' ? (
              <>
                <h2>DANGER - MULTIPLE ALERTS!</h2>
                {alertTrigger.alerts.map((alert, index) => (
                  <p key={index}>
                    {alert.type === 'temperature' && `🌡️ Temperature: ${alert.value.toFixed(1)}°C (Threshold: ${TEMPERATURE_THRESHOLD}°C)`}
                    {alert.type === 'gas' && `💨 Gas Level (MQ135): ${alert.value.toFixed(0)} ADC (Threshold: ${GAS_THRESHOLD} ADC)`}
                    {alert.type === 'mq7' && `🔥 CO Level (MQ7): ${alert.value.toFixed(0)} ADC (Threshold: ${MQ7_THRESHOLD} ADC)`}
                    {alert.type === 'humidity' && `💧 Humidity: ${alert.value.toFixed(1)}% (Threshold: ${HUMIDITY_THRESHOLD}%)`}
                  </p>
                ))}
              </>
            ) : alertTrigger.type === 'temperature' ? (
              <>
                <h2>DANGER - TEMPERATURE ALERT!</h2>
                <p>Temperature above safe threshold ({TEMPERATURE_THRESHOLD}°C)</p>
                <p className="alert-value">Current: {alertTrigger.alerts[0].value.toFixed(1)}°C</p>
              </>
            ) : alertTrigger.type === 'gas' ? (
              <>
                <h2>DANGER - GAS ALERT!</h2>
                <p>Gas levels above safe threshold ({GAS_THRESHOLD} ADC)</p>
                <p className="alert-value">Current: {alertTrigger.alerts[0].value.toFixed(0)} ADC</p>
              </>
            ) : alertTrigger.type === 'mq7' ? (
              <>
                <h2>DANGER - CO ALERT!</h2>
                <p>Carbon Monoxide levels above safe threshold ({MQ7_THRESHOLD} ADC)</p>
                <p className="alert-value">Current: {alertTrigger.alerts[0].value.toFixed(0)} ADC</p>
              </>
            ) : (
              <>
                <h2>DANGER - HUMIDITY ALERT!</h2>
                <p>Humidity above safe threshold ({HUMIDITY_THRESHOLD}%)</p>
                <p className="alert-value">Current: {alertTrigger.alerts[0].value.toFixed(1)}%</p>
              </>
            )}
            <p className="alert-action">⚡ Emergency lighting activated</p>
            <p className="alert-action">🚨 Take immediate action!</p>
            <button onClick={() => setShowDangerAlert(false)} className="alert-dismiss">
              Acknowledge
            </button>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>⛏️ Mining Tunnel Monitoring System</h1>
            <p>Real-time Gas Detection & Environmental Control</p>
          </div>
          <div className="status-indicators">
            <StatusIndicator label="MQTT" connected={connectionStatus.mqtt} />
            <StatusIndicator label="MongoDB" connected={connectionStatus.mongodb} />
            <StatusIndicator label="WebSocket" connected={connectionStatus.websocket} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Emergency Light Status */}
        <section className="light-status-section">
          <div className={`light-status-card ${currentData.lightStatus ? 'light-on' : 'light-off'}`}>
            <div className="light-icon">
              {currentData.lightStatus ? '💡' : '🔦'}
            </div>
            <div className="light-info">
              <h2>Emergency Lighting</h2>
              <p className="light-state">
                {currentData.lightStatus ? 'ACTIVATED' : 'STANDBY'}
              </p>
              <p className="light-reason">
                {currentData.lightStatus 
                  ? (
                      alertTrigger.type === 'multiple' 
                        ? `Multiple alerts: ${alertTrigger.alerts.map(a => 
                            a.type === 'temperature' ? `Temp ${a.value.toFixed(1)}°C` :
                            a.type === 'gas' ? `MQ135 ${a.value.toFixed(0)} ADC` :
                            a.type === 'mq7' ? `MQ7 ${a.value.toFixed(0)} ADC` :
                            `Humidity ${a.value.toFixed(1)}%`
                          ).join(', ')}` 
                        : alertTrigger.type === 'temperature'
                          ? `Temperature: ${alertTrigger.alerts[0].value.toFixed(1)}°C (Above ${TEMPERATURE_THRESHOLD}°C threshold)`
                          : alertTrigger.type === 'gas'
                            ? `Gas Level (MQ135): ${alertTrigger.alerts[0].value.toFixed(0)} ADC (Above ${GAS_THRESHOLD} threshold)`
                            : alertTrigger.type === 'mq7'
                              ? `CO Level (MQ7): ${alertTrigger.alerts[0].value.toFixed(0)} ADC (Above ${MQ7_THRESHOLD} threshold)`
                              : alertTrigger.type === 'humidity'
                                ? `Humidity: ${alertTrigger.alerts[0].value.toFixed(1)}% (Above ${HUMIDITY_THRESHOLD}% threshold)`
                                : `Activated`
                    )
                  : `All sensors within safe limits`
                }
              </p>
            </div>
            {currentData.lightStatus && (
              <div className="warning-badge">⚠️ ALERT</div>
            )}
          </div>
        </section>

        <section className="sensor-cards">
          <SensorCard
            title="Temperature"
            value={currentData.temperature}
            unit="°C"
            icon="🌡️"
            color={currentData.temperature > TEMPERATURE_THRESHOLD ? "#ff3838" : "#ff6b6b"}
            min={stats.minTemperature}
            max={stats.maxTemperature}
            avg={stats.avgTemperature}
            isDanger={currentData.temperature > TEMPERATURE_THRESHOLD}
            threshold={TEMPERATURE_THRESHOLD}
          />
          <SensorCard
            title="Humidity"
            value={currentData.humidity}
            unit="%"
            icon="💧"
            color={currentData.humidity > HUMIDITY_THRESHOLD ? "#ff3838" : "#4ecdc4"}
            min={stats.minHumidity}
            max={stats.maxHumidity}
            avg={stats.avgHumidity}
            isDanger={currentData.humidity > HUMIDITY_THRESHOLD}
            threshold={HUMIDITY_THRESHOLD}
          />
          <SensorCard
            title="Gas Level (MQ135)"
            value={currentData.gasLevel}
            unit="ADC"
            icon="💨"
            color={currentData.gasLevel > GAS_THRESHOLD ? "#ff3838" : "#95e1d3"}
            min={stats.minGasLevel}
            max={stats.maxGasLevel}
            avg={stats.avgGasLevel}
            isDanger={currentData.gasLevel > GAS_THRESHOLD}
            threshold={GAS_THRESHOLD}
          />
          <SensorCard
            title="CO Level (MQ7)"
            value={currentData.mq7Level}
            unit="ADC"
            icon="🔥"
            color={currentData.mq7Level > MQ7_THRESHOLD ? "#ff3838" : "#ffa726"}
            min={stats.minMq7Level}
            max={stats.maxMq7Level}
            avg={stats.avgMq7Level}
            isDanger={currentData.mq7Level > MQ7_THRESHOLD}
            threshold={MQ7_THRESHOLD}
          />
        </section>

        <section className="charts-section">
          <div className="chart-container">
            <h2>📈 Temperature & Humidity Trends</h2>
            <Chart
              data={historicalData}
              dataKeys={['temperature', 'humidity']}
              colors={['#ff6b6b', '#4ecdc4']}
              labels={['Temperature (°C)', 'Humidity (%)']}
            />
          </div>
          
          <div className="chart-container">
            <h2>🚨 Gas Level Monitor (MQ135)</h2>
            <Chart
              data={historicalData}
              dataKeys={['gasLevel']}
              colors={['#ff3838']}
              labels={['Gas Level (ADC)']}
              threshold={GAS_THRESHOLD}
            />
          </div>
        </section>

        <footer className="app-footer">
          <p>Last Updated: {new Date().toLocaleString()}</p>
          <p>Total Records: {stats.totalRecords || 0}</p>
          <p className="safety-notice">⚠️ Safety First - Monitor gas levels continuously</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
