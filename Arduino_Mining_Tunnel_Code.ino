/*
 * Mining Tunnel Monitoring System - Arduino Code
 * Publishes temperature, humidity, and gas level data to MQTT broker
 * Compatible with ESP8266 or ESP32
 */

#include <ESP8266WiFi.h>  // Use <WiFi.h> for ESP32
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";        // Replace with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password

// MQTT Broker settings (Mosquitto Test Broker)
const char* mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char* mqtt_user = "";  // No authentication needed
const char* mqtt_pass = "";
const char* mqtt_topic = "mining/tunnel/sensors"; // Topic to publish sensor data

// Initialize WiFi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

// Sensor pins (adjust based on your hardware)
#define DHT_PIN D4        // DHT11/DHT22 temperature & humidity sensor
#define GAS_SENSOR_PIN A0 // MQ-2/MQ-135 gas sensor (analog)

// Optional: If you have a DHT sensor, include the library
// #include <DHT.h>
// DHT dht(DHT_PIN, DHT11); // or DHT22

// Timing
unsigned long lastMsg = 0;
const long interval = 5000; // Publish every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Initialize sensors
  pinMode(GAS_SENSOR_PIN, INPUT);
  // dht.begin(); // Uncomment if using DHT sensor
  
  Serial.println("\n\n=================================");
  Serial.println("Mining Tunnel Monitoring System");
  Serial.println("=================================\n");
  
  // Connect to WiFi
  setup_wifi();
  
  // Configure MQTT
  client.setServer(mqtt_server, mqtt_port);
  
  Serial.println("Setup complete!");
}

void setup_wifi() {
  delay(10);
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    
    // Create a random client ID
    String clientId = "MiningTunnel-";
    clientId += String(random(0xffff), HEX);
    
    // Attempt to connect (no authentication needed for test.mosquitto.org)
    if (client.connect(clientId.c_str())) {
      Serial.println(" ✅ Connected!");
    } else {
      Serial.print(" ❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// Read temperature from sensor
float readTemperature() {
  // If using DHT sensor:
  // return dht.readTemperature();
  
  // Simulated data for testing (replace with actual sensor reading)
  return 20.0 + random(0, 100) / 10.0; // Random temp between 20-30°C
}

// Read humidity from sensor
float readHumidity() {
  // If using DHT sensor:
  // return dht.readHumidity();
  
  // Simulated data for testing (replace with actual sensor reading)
  return 40.0 + random(0, 300) / 10.0; // Random humidity between 40-70%
}

// Read gas level from MQ sensor
float readGasLevel() {
  int sensorValue = analogRead(GAS_SENSOR_PIN);
  
  // Convert analog reading (0-1023) to ppm
  // This conversion depends on your specific gas sensor calibration
  // Example conversion for MQ-2/MQ-135:
  float voltage = sensorValue * (3.3 / 1023.0); // For ESP8266 (3.3V)
  // float voltage = sensorValue * (5.0 / 1023.0); // For Arduino (5V)
  
  // Simple linear conversion (calibrate based on your sensor)
  float ppm = sensorValue * 0.5; // Adjust multiplier based on calibration
  
  // For testing without sensor, use random values:
  // float ppm = random(50, 600); // Random gas level
  
  return ppm;
}

void publishSensorData() {
  // Read sensor values
  float temperature = readTemperature();
  float humidity = readHumidity();
  float gasLevel = readGasLevel();
  
  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ Failed to read from sensors!");
    return;
  }
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["temperature"] = round(temperature * 100) / 100.0; // Round to 2 decimals
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["gasLevel"] = round(gasLevel * 100) / 100.0;
  
  // Serialize JSON to string
  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);
  
  // Publish to MQTT
  Serial.print("📡 Publishing: ");
  Serial.println(jsonBuffer);
  
  if (client.publish(mqtt_topic, jsonBuffer)) {
    Serial.println("✅ Published successfully!");
    
    // Print sensor readings
    Serial.println("----------------------------");
    Serial.print("🌡️  Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");
    
    Serial.print("💧 Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
    
    Serial.print("💨 Gas Level: ");
    Serial.print(gasLevel);
    Serial.print(" ppm");
    
    if (gasLevel > 300) {
      Serial.println(" ⚠️  DANGER!");
    } else {
      Serial.println(" ✅ Safe");
    }
    Serial.println("----------------------------\n");
    
  } else {
    Serial.println("❌ Failed to publish!");
  }
}

void loop() {
  // Ensure MQTT connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish sensor data at regular intervals
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    publishSensorData();
  }
}
