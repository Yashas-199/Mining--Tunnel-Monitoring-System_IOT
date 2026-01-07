// Test Data Generator for Mining Tunnel Monitoring System
// This simulates MQTT data for testing purposes

const axios = require('axios');

const API_URL = 'http://localhost:5000';
const GAS_THRESHOLD = 300;

// Simulate sensor readings
function generateSensorData(isDanger = false) {
  return {
    temperature: isDanger ? 
      (30 + Math.random() * 10).toFixed(2) : // Hot when danger
      (20 + Math.random() * 5).toFixed(2),   // Normal temp
    humidity: (40 + Math.random() * 30).toFixed(2),
    gasLevel: isDanger ?
      (GAS_THRESHOLD + Math.random() * 200).toFixed(2) : // Above threshold
      (50 + Math.random() * 200).toFixed(2)   // Below threshold
  };
}

// Simulate data publishing
let isDangerMode = false;
let dataCount = 0;

async function publishData() {
  try {
    // Toggle danger mode every 10 readings for testing
    if (dataCount % 10 === 0) {
      isDangerMode = !isDangerMode;
      console.log(`\n${isDangerMode ? '⚠️  DANGER MODE ACTIVATED' : '✅ NORMAL MODE'}\n`);
    }

    const data = generateSensorData(isDangerMode);
    
    console.log(`📊 Publishing sensor data [${new Date().toLocaleTimeString()}]:`, data);
    
    // In real scenario, this would be published via MQTT
    // For testing, you can manually send it to the backend if needed
    
    dataCount++;
  } catch (error) {
    console.error('Error publishing data:', error.message);
  }
}

// Start simulation
console.log('🚀 Mining Tunnel Test Data Generator Started');
console.log('📡 Generating sensor data every 5 seconds...\n');

// Initial data
publishData();

// Continue publishing every 5 seconds
setInterval(publishData, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✋ Stopping test data generator...');
  process.exit(0);
});
