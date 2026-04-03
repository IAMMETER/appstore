# IAMMETER Data Integration Guide

## Overview

This guide explains how to integrate with IAMMETER devices using a **unified data format (monitorjson)**.

IAMMETER uses a **consistent JSON payload structure** across all interfaces. Whether you access data locally or receive it from the cloud, the structure remains the same.

Supported integration methods include:

- Local API (`/api/monitorjson`)
- HTTP / HTTPS push
- MQTT / MQTTS publish
- TCP / TLS streaming

> The key idea: **one data format, multiple transport methods**.

------

## Why This Matters

Because the payload format is unified, you can:

- Parse data once and reuse your logic everywhere
- Switch between local and cloud integration without rewriting code
- Easily integrate with platforms like Home Assistant, Node-RED, or custom systems

------

## Integration Methods

### 1. Local API (LAN)

**Endpoint**

```
http://<device-ip>/api/monitorjson
```

**Method**

```
HTTP GET
```

**Features**

- Real-time data (~1 second refresh)
- No authentication required
- Works within local network

------

### 2. HTTP / HTTPS Push

Devices can push measurement data to your server using HTTP or HTTPS.

- Same JSON payload format as local API
- Suitable for cloud ingestion
- Easy to integrate with web backends

------

### 3. MQTT / MQTTS

IAMMETER can publish data via MQTT.

- Topic-based messaging
- Same payload structure (monitorjson)
- Ideal for Home Assistant, Node-RED, IoT platforms

------

### 4. TCP / TLS

For advanced integrations, devices support TCP/TLS streaming.

- Continuous data stream
- Same JSON structure
- Suitable for industrial or custom systems

------

## Unified Data Format (monitorjson)

All integration methods return or transmit the same JSON structure.

### Common Fields

| Field        | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| method       | string | Data format identifier      |
| mac          | string | Device MAC address          |
| version      | string | Firmware version            |
| server       | string | Internal service identifier |
| SN           | string | Device serial number        |
| Data / Datas | array  | Measurement data            |

------

## Single-Phase Example

```
{
 "method":"1-272",
 "mac":"B0F8932A295C",
 "version":"i.91.063T2",
 "server":"em",
 "SN":"DA2BED94",
 "Data":[226.85,1.31,152.0,22920.38,0.00,49.97,0.51]
}
```

### Data Format

| Index | Field        | Unit |
| ----- | ------------ | ---- |
| 0     | voltage      | V    |
| 1     | current      | A    |
| 2     | activePower  | W    |
| 3     | importEnergy | kWh  |
| 4     | exportEnergy | kWh  |
| 5     | frequency    | Hz   |
| 6     | powerFactor  | —    |

------

## Three-Phase Example

```
{
 "Datas":[
   [226.2,1.420,197.0,423.676,0.000,50.03,0.61],
   [226.6,1.420,197.0,423.527,0.000,50.03,0.61],
   [226.1,1.420,199.0,427.346,0.000,50.03,0.62]
 ]
}
```

### Structure

```
Datas[0] → Phase A
Datas[1] → Phase B
Datas[2] → Phase C
```

------

## Net Energy Metering (NEM)

When enabled, an additional row is included:

```
Datas[3] → Net result
```

This represents the **combined system result**, not a simple sum of energies.

------

## Reactive Measurement

When enabled, additional reactive data is provided:

```
{
 "EA":{
   "Reactive":[
     [-119.0,0.000,258.703],
     [-120.0,0.000,260.278],
     [-118.0,0.007,256.485]
   ]
 }
}
```

------

## Units Summary

| Parameter       | Unit  |
| --------------- | ----- |
| Voltage         | V     |
| Current         | A     |
| Active Power    | W     |
| Energy          | kWh   |
| Frequency       | Hz    |
| Power Factor    | —     |
| Reactive Power  | kvar  |
| Reactive Energy | kvarh |

------

## Parsing Tips

```
if(json.Data){
   // single-phase
}

if(json.Datas){
   // three-phase
}

const phases = json.Datas?.slice(0,3)
const net = json.Datas?.length > 3 ? json.Datas[3] : null
const reactive = json.EA?.Reactive
```

------

## Summary

IAMMETER provides a **unified data model** for all integrations.

- Same JSON format everywhere
- Multiple transport options
- Easy to integrate and scale

This design allows developers to focus on **data usage**, not protocol differences.