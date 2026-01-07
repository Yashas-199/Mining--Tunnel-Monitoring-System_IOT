const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://yashaskrishna54_db_user:xjVbpKiKU1ktNg7y@cluster2.hiflzuw.mongodb.net/iot_dashboard?retryWrites=true&w=majority&appName=Cluster2';

mongoose.connect(MONGO_URI)
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('⚠️  Continuing without MongoDB - data will still stream via WebSocket');
});

// Sensor Data Schema
const sensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  gasLevel: Number,
  mq7Level: Number, // MQ7 Carbon Monoxide sensor
  lightStatus: { type: Boolean, default: false }, // Light ON/OFF based on gas level
  timestamp: { type: Date, default: Date.now }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
// Match Arduino topic
const MQTT_TOPIC = 'iot/env/telemetry';

// Connect to MQTT Broker
const mqttOptions = {
  port: MQTT_PORT,
  reconnectPeriod: 1000
};

// Only add credentials if they exist
if (MQTT_USERNAME) {
  mqttOptions.username = MQTT_USERNAME;
}
if (MQTT_PASSWORD) {
  mqttOptions.password = MQTT_PASSWORD;
}

const mqttClient = mqtt.connect(MQTT_BROKER, mqttOptions);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected Successfully');
  console.log('📡 Subscribing to topic:', MQTT_TOPIC);
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('❌ MQTT Subscription Error:', err);
    } else {
      console.log('✅ Successfully subscribed to:', MQTT_TOPIC);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

// Handle incoming MQTT messages
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('📨 Received MQTT message:', topic, data);

    // Map Arduino field names to our schema
    // tempC -> temperature, hum -> humidity, mq135_raw -> gasLevel, mq7_raw -> mq7Level
    const temperature = data.tempC || data.temperature || 0;
    const humidity = data.hum || data.humidity || 0;
    const gasLevel = data.mq135_raw || data.gasLevel || 0;
    const mq7Level = data.mq7_raw || data.mq7Level || 0;
    
    // Thresholds for danger alerts (matching Arduino code)
    const GAS_THRESHOLD = 600; // Raw ADC value from MQ135
    const MQ7_THRESHOLD = 600; // Raw ADC value from MQ7
    const HUMIDITY_THRESHOLD = 70; // Humidity percentage
    const TEMPERATURE_THRESHOLD = 35; // Temperature in Celsius
    
    // Check if any threshold is exceeded
    const lightStatus = data.alarm || gasLevel > GAS_THRESHOLD || humidity > HUMIDITY_THRESHOLD || temperature > TEMPERATURE_THRESHOLD || mq7Level > MQ7_THRESHOLD;

    // Create sensor data object
    const sensorData = new SensorData({
      temperature: temperature,
      humidity: humidity,
      gasLevel: gasLevel,
      mq7Level: mq7Level,
      lightStatus: lightStatus
    });

    // Emit to connected clients via WebSocket FIRST (don't wait for DB)
    const dataToEmit = {
      temperature: temperature,
      humidity: humidity,
      gasLevel: gasLevel,
      mq7Level: mq7Level,
      lightStatus: lightStatus,
      timestamp: new Date()
    };
    io.emit('sensorData', dataToEmit);

    // Save to MongoDB (non-blocking)
    sensorData.save()
      .then(() => {
        console.log('💾 Data saved to MongoDB:', { temp: temperature, hum: humidity, mq135: gasLevel, mq7: mq7Level });
      })
      .catch(err => {
        console.log('❌ MongoDB save failed (continuing):', err.message);
      });
    
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('🔌 New client connected');
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected');
  });
});

// REST API Endpoints

// Get latest sensor data
app.get('/api/latest', async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    res.json(latest || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data with pagination
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    
    const data = await SensorData.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
      
    const total = await SensorData.countDocuments();
    
    res.json({
      data: data.reverse(),
      total,
      limit,
      skip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data for a specific time range
app.get('/api/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const query = {};
    if (start && end) {
      query.timestamp = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }
    
    const data = await SensorData.find(query).sort({ timestamp: 1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await SensorData.aggregate([
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          minTemperature: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          maxHumidity: { $max: '$humidity' },
          minHumidity: { $min: '$humidity' },
          avgGasLevel: { $avg: '$gasLevel' },
          maxGasLevel: { $max: '$gasLevel' },
          minGasLevel: { $min: '$gasLevel' },
          avgMq7Level: { $avg: '$mq7Level' },
          maxMq7Level: { $max: '$mq7Level' },
          minMq7Level: { $min: '$mq7Level' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);
    
    res.json(stats[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migrate old documents to add mq7Level field
app.post('/api/migrate-mq7', async (req, res) => {
  try {
    // Update all documents that don't have mq7Level field
    const result = await SensorData.updateMany(
      { mq7Level: { $exists: false } },
      { $set: { mq7Level: 0 } }
    );
    
    res.json({ 
      message: `Updated ${result.modifiedCount} documents with mq7Level field`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete old data (optional cleanup)
app.delete('/api/cleanup', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await SensorData.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    res.json({ 
      message: `Deleted ${result.deletedCount} records older than ${days} days`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    mqtt: mqttClient.connected ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
