// MQTT Test Publisher - Simulates Arduino sending data
const mqtt = require('mqtt');

// MQTT Configuration (matches Arduino and Backend)
const MQTT_BROKER = 'mqtt://test.mosquitto.org';
const MQTT_PORT = 1883;
const MQTT_TOPIC = 'mining/tunnel/sensors';

console.log('🔌 Connecting to MQTT broker...');
const client = mqtt.connect(MQTT_BROKER, {
  port: MQTT_PORT
});

client.on('connect', () => {
  console.log('✅ Connected to test.mosquitto.org\n');
  console.log('📡 Publishing sensor data to topic:', MQTT_TOPIC);
  console.log('Press Ctrl+C to stop\n');
  console.log('='.repeat(50));
  
  let count = 0;
  let dangerMode = false;
  
  // Publish data every 5 seconds
  setInterval(() => {
    count++;
    
    // Toggle danger mode every 10 readings
    if (count % 10 === 0) {
      dangerMode = !dangerMode;
      console.log('\n' + (dangerMode ? '⚠️  DANGER MODE ACTIVATED!' : '✅ NORMAL MODE') + '\n');
    }
    
    // Generate sensor data
    const data = {
      temperature: dangerMode 
        ? (30 + Math.random() * 10).toFixed(2)  // Hot when danger
        : (20 + Math.random() * 5).toFixed(2),  // Normal
      humidity: (40 + Math.random() * 30).toFixed(2),
      gasLevel: dangerMode
        ? (300 + Math.random() * 200).toFixed(2)  // Above threshold (DANGER!)
        : (50 + Math.random() * 200).toFixed(2)   // Below threshold (Safe)
    };
    
    const payload = JSON.stringify(data);
    
    // Publish to MQTT
    client.publish(MQTT_TOPIC, payload, (err) => {
      if (err) {
        console.log('❌ Failed to publish:', err.message);
      } else {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Published:`, payload);
        
        // Visual indicator
        if (parseFloat(data.gasLevel) > 300) {
          console.log('  🚨 GAS ALERT! Emergency lighting ON!');
        } else {
          console.log('  ✅ Safe levels');
        }
      }
    });
    
  }, 5000); // Every 5 seconds
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
});

client.on('offline', () => {
  console.log('⚠️  MQTT client offline');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✋ Stopping test publisher...');
  client.end();
  process.exit(0);
});
