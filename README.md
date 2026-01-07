# 🏭 Mining Tunnel Monitoring System

A real-time IoT monitoring system for mining tunnel safety using ESP8266, DHT11, MQ-135 gas sensors, MQTT protocol, Node.js backend, and React dashboard.

---

##  Table of Contents
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Hardware Requirements](#hardware-requirements)
- [Software Requirements](#software-requirements)
- [Circuit Diagram](#circuit-diagram)
- [Setup Instructions](#setup-instructions)
- [How to Run](#how-to-run)
- [Applications](#applications)
- [Troubleshooting](#troubleshooting)
- [Conclusion](#conclusion)

---

## 📖 Project Overview

This IoT system monitors critical environmental parameters in mining tunnels:
- 🌡️ **Temperature** - Real-time temperature monitoring (DHT11/DHT22)
- 💧 **Humidity** - Environmental humidity tracking
- 💨 **Gas Levels** - Hazardous gas detection (MQ-135, MQ-7)
- 🚨 **Alerts** - LED indicator for dangerous gas levels
- 📊 **Dashboard** - Live web interface with charts and real-time data

**Technology Stack:**
- **Hardware:** ESP8266 NodeMCU, DHT11, MQ-135, MQ-7 sensors
- **Communication:** MQTT Protocol (test.mosquitto.org)
- **Backend:** Node.js, Express, Socket.IO, MongoDB
- **Frontend:** React, Recharts, Socket.IO Client

---

##  System Architecture

```
┌─────────────────┐      MQTT       ┌──────────────┐     WebSocket    ┌─────────────┐
│  ESP8266/ESP32  │ ═══════════════> │   Node.js    │ ═══════════════> │   React     │
│   + Sensors     │   (Publisher)    │   Backend    │   (Real-time)    │  Dashboard  │
│  DHT11, MQ-135  │                  │  + MongoDB   │                  │   + Charts  │
└─────────────────┘                  └──────────────┘                  └─────────────┘

Data Flow:
1. Sensors read temperature, humidity, gas levels
2. ESP8266 publishes data to MQTT broker (every 5 seconds)
3. Backend subscribes to MQTT topic and stores in MongoDB
4. Backend broadcasts to frontend via WebSocket
5. Dashboard displays real-time data with charts
```

---

##  Hardware Requirements

| Component | Specification | Qty | Purpose |
|-----------|--------------|-----|---------|
| ESP8266 NodeMCU | WiFi microcontroller | 1 | Main controller |
| DHT11 or DHT22 | Temperature/Humidity sensor | 1 | Environmental monitoring |
| MQ-135 | Air quality gas sensor | 1 | Gas detection (NH3, NOx, smoke) |
| MQ-7 (Optional) | Carbon monoxide sensor | 1 | CO detection |
| LED (Red) | 5mm LED | 1 | Alert indicator |
| Resistor | 220Ω | 1 | LED current limiting |
| Breadboard | Standard | 1 | Circuit assembly |
| Jumper Wires | M-M, M-F | 15-20 | Connections |
| USB Cable | Micro USB | 1 | Power & programming |

---

##  Software Requirements

### Arduino/ESP8266
- Arduino IDE 1.8.x or 2.x
- ESP8266 Board Package
- Libraries: `ESP8266WiFi`, `PubSubClient`, `ArduinoJson`, `DHT sensor library`

### Backend
- Node.js v16+ and npm
- MongoDB (local or Atlas cloud)

### Frontend
- Node.js v16+ and npm
- Modern web browser

---

##  Circuit Diagram

### Complete Wiring Diagram

```
                        ┌──────────────────┐
                        │   ESP8266 NodeMCU│
                        ├──────────────────┤
DHT11/DHT22                                │
┌──────────┐            │  D4 (GPIO2)  ●───┼──● Data Pin
│   DHT11  │            │  3.3V        ●───┼──● VCC (Pin 1)
│  ┌────┐  │            │  GND         ●───┼──● GND (Pin 3)
│  └────┘  │            │                  │
└──────────┘            │                  │
                        │                  │
MQ-135 Sensor           │  A0 (ADC)    ●───┼──● AO (Analog Out)
┌──────────┐            │  5V/3.3V     ●───┼──● VCC
│  MQ-135  │            │  GND         ●───┼──● GND
│  ┌────┐  │            │                  │
│  └────┘  │            │                  │
└──────────┘            │                  │
                        │                  │
MQ-7 Sensor             │  A0 (ADC)    ●───┼──● AO (Shared)
┌──────────┐            │  5V/3.3V     ●───┼──● VCC
│   MQ-7   │            │  GND         ●───┼──● GND
│  ┌────┐  │            │                  │
│  └────┘  │            │                  │
└──────────┘            │                  │
                        │                  │
LED Alert               │  D5 (GPIO14) ●───┼──[220Ω]──●─┬─ LED + (Long leg)
  ─┴─                   │                  │           │
  \ / Red               │  GND         ●───┼───────────●─ LED - (Short leg)
                        │                  │
                        │  [USB Port]      │
                        └──────────────────┘
```

### Connection Table

| Component | Pin | ESP8266 Pin | Wire Color (Suggested) |
|-----------|-----|-------------|------------------------|
| DHT11 VCC | 1 | 3.3V | Red |
| DHT11 Data | 2 | D4 (GPIO2) | Yellow/Green |
| DHT11 GND | 3 | GND | Black |
| MQ-135 VCC | - | 5V or 3.3V | Red |
| MQ-135 AO | - | A0 | Orange |
| MQ-135 GND | - | GND | Black |
| MQ-7 VCC | - | 5V or 3.3V | Red |
| MQ-7 AO | - | A0 (Shared) | Purple |
| MQ-7 GND | - | GND | Black |
| LED + (Anode) | - | D5 → 220Ω → LED | - |
| LED - (Cathode) | - | GND | Black |

### ESP8266 NodeMCU Pinout Reference

```
        NodeMCU (Top View)
    ┌──────[USB]──────┐
    │                 │
Left Side:       Right Side:
D0  GPIO16       A0  (Analog) ← MQ Sensors
D1  GPIO5        GND
D2  GPIO4        VV (5V)
D3  GPIO0        S3
D4  GPIO2  ←DHT  S2
3V3 (3.3V) ←PWR  S1
GND        ←GND  SC
D5  GPIO14 ←LED  S0
D6  GPIO12       SK
D7  GPIO13       G (GND)
D8  GPIO15       3V (3.3V)
RX              EN
TX              RST
GND             GND
3V3             Vin (5V)
```

**Important Notes:**
-  ESP8266 has only ONE analog pin (A0) - both MQ sensors share it
-  All GND connections MUST be common
-  MQ sensors need 2-3 minutes warm-up time
-  Use 2.4GHz WiFi only (ESP8266 doesn't support 5GHz)

---

##  Setup Instructions

### 1. Arduino IDE Setup

**Install Arduino IDE:**
1. Download from [arduino.cc/en/software](https://www.arduino.cc/en/software)
2. Install for your OS

**Add ESP8266 Board:**
1. Go to **File** → **Preferences**
2. Add to "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Go to **Tools** → **Board** → **Boards Manager**
4. Search "esp8266" and install **ESP8266 by ESP8266 Community**

**Install Required Libraries:**
1. **Sketch** → **Include Library** → **Manage Libraries**
2. Install:
   - `PubSubClient` by Nick O'Leary
   - `ArduinoJson` by Benoit Blanchon (v6.x)
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`

### 2. Hardware Assembly

1. **Connect Power Rails:**
   - ESP8266 3.3V → Breadboard + rail
   - ESP8266 GND → Breadboard - rail

2. **Connect DHT11:**
   - VCC → 3.3V
   - Data → D4
   - GND → GND

3. **Connect MQ-135:**
   - VCC → 5V/3.3V
   - AO → A0
   - GND → GND

4. **Connect MQ-7 (Optional):**
   - VCC → 5V/3.3V
   - AO → A0 (shared with MQ-135)
   - GND → GND

5. **Connect LED:**
   - D5 → 220Ω Resistor → LED + (long leg)
   - LED - (short leg) → GND

### 3. Upload Arduino Code

1. Open `Arduino_Mining_Tunnel_Code.ino`
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Select: **Tools** → **Board** → **NodeMCU 1.0 (ESP-12E Module)**
4. Select: **Tools** → **Port** → Your COM port
5. Click **Upload** (→)
6. Open **Serial Monitor** (115200 baud) to verify connection

### 4. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start server
npm start
```

Expected output:
```
 MongoDB Connected Successfully
 MQTT Connected Successfully
 Server running on port 5000
```

### 5. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Dashboard opens at: `http://localhost:3000`

---

## How to Run

### Complete Startup Sequence

**1. Power Up Hardware:**
```
- Connect ESP8266 to computer via USB
- Wait for sensors to initialize
- Check Serial Monitor for "WiFi connected" and "MQTT Connected"
```

**2. Start Backend (Terminal 1):**
```bash
cd backend
npm start
```

**3. Start Frontend (Terminal 2):**
```bash
cd frontend
npm start
```

**4. Open Dashboard:**
```
Browser automatically opens: http://localhost:3000
```

**5. Verify Data Flow:**
-  Serial Monitor shows "Published successfully"
-  Backend logs show "Received MQTT message"
-  Dashboard displays real-time sensor readings
-  Charts update every 5 seconds

---

##  Applications

### 1. **Mining Industry**
- Real-time monitoring of underground tunnel conditions
- Early warning system for gas leaks (methane, CO)
- Worker safety enhancement
- Compliance with mining safety regulations

### 2. **Industrial Safety**
- Factory floor air quality monitoring
- Chemical plant safety systems
- Warehouse environmental control
- Worker health and safety compliance

### 3. **Smart Buildings**
- HVAC system optimization
- Indoor air quality monitoring
- Energy efficiency management
- Occupant comfort and health

### 4. **Environmental Monitoring**
- Air pollution tracking
- Urban air quality monitoring
- Research and data collection
- Climate studies

### 5. **Transportation**
- Parking garage ventilation control
- Tunnel ventilation systems
- Subway station air quality
- Vehicle cabin monitoring

---

##  Troubleshooting

| Issue | Solution |
|-------|----------|
| **ESP8266 won't connect to WiFi** | • Check SSID/password<br>• Use 2.4GHz WiFi (not 5GHz)<br>• Move closer to router |
| **Can't upload code to ESP8266** | • Install CH340/CP2102 USB drivers<br>• Check USB cable (must be data cable)<br>• Select correct COM port |
| **No data on dashboard** | • Check Serial Monitor for errors<br>• Verify backend is running<br>• Check MQTT connection<br>• Try `node mqtt-test-publisher.js` |
| **Sensors read NaN or 0** | • Wait 2-3 minutes for sensor warm-up<br>• Check wiring connections<br>• Verify sensor power supply |
| **LED doesn't light** | • Check LED polarity (long leg = +)<br>• Verify resistor connection<br>• Test with lower gas threshold in code |
| **MQTT connection failed** | • Check internet connection<br>• Try alternative broker: `broker.hivemq.com`<br>• Verify firewall settings |
| **MongoDB connection error** | • Backend works without MongoDB (live data only)<br>• Check MongoDB Atlas whitelist<br>• Verify connection string |

---

##  Conclusion

This **Mining Tunnel Monitoring System** demonstrates a complete IoT solution combining:
-  **Hardware:** ESP8266 microcontroller with multiple sensors
-  **Communication:** MQTT protocol for efficient IoT messaging
-  **Backend:** Node.js server with real-time data processing
-  **Frontend:** React dashboard with live visualization
-  **Database:** MongoDB for historical data storage

### Key Achievements:
-  Real-time environmental monitoring with 5-second updates
-  Scalable architecture (easily add more sensors/locations)
-  Web-based dashboard accessible from any device
-  Alert system for dangerous conditions
-  Historical data logging and analysis
-  Low-cost implementation 

---



