[toc]

# `/api/monitorjson` – Real-time Measurement Data

## Overview

`/api/monitorjson` is a **local API** provided by IAMMETER devices to return real-time electrical measurements.

The API returns:

- Device information (SN, MAC, firmware version)
- Real-time electrical parameters
- Optional net-metering data (when **NEM mode** is enabled)
- Optional reactive power data (when **Reactive Measurement** is enabled)

This API works within the **local network (LAN)** and does **not require IAMMETER-Cloud**.

This API is the primary data source used by:

- IAMMETER Cloud
-  Home Assistant integrations
-  Node-RED flows
- Custom dashboards
- IAMMETER Static Apps
- AI-generated monitoring tools

------

# API Request

## Endpoint

```
http://<device-ip>/api/monitorjson
```

Example

```
http://192.168.1.120/api/monitorjson
```

------

## Method

```
HTTP GET
```

------

## Authentication

No authentication is required when accessing the API within the **local network (LAN)**.

------

## Example Request

Open in browser:

```
http://192.168.1.120/api/monitorjson
```

Example using curl:

```
curl http://192.168.1.120/api/monitorjson
```

------

## Example Using Python

```
import requests

url = "http://192.168.1.120/api/monitorjson"

response = requests.get(url)
data = response.json()

print(data)
```

------

## Refresh Rate

The API returns **real-time measurement data** from the meter.

Typical refresh interval:

```
~1 second
```

This API is commonly used for integration with:

- Home Assistant
- Node-RED
- Grafana
- Custom energy monitoring systems

------

# Response Structure

## Common Fields

| Field        | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| method       | string | Data format identifier      |
| mac          | string | Device MAC address          |
| version      | string | Firmware version            |
| server       | string | Internal service identifier |
| SN           | string | Device serial number        |
| Data / Datas | array  | Measurement data            |

------

# Single-Phase Meter

## Example

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

## Data Array Format

`Data` contains **7 measurement values**.

| Index | Field        | Description    | Unit |
| ----- | ------------ | -------------- | ---- |
| 0     | voltage      | Voltage        | V    |
| 1     | current      | Current        | A    |
| 2     | activePower  | Active power   | W    |
| 3     | importEnergy | Import energy  | kWh  |
| 4     | exportEnergy | Export energy  | kWh  |
| 5     | frequency    | Grid frequency | Hz   |
| 6     | powerFactor  | Power factor   | —    |

------

# Three-Phase Meter (Normal Mode)

## Example

```
{
 "method":"2-9",
 "mac":"849DC2CEC3A6",
 "version":"i.91.063T2",
 "server":"em",
 "SN":"5DB50BF4",
 "Datas":[
   [226.2,1.420,197.0,423.676,0.000,50.03,0.61],
   [226.6,1.420,197.0,423.527,0.000,50.03,0.61],
   [226.1,1.420,199.0,427.346,0.000,50.03,0.62]
 ]
}
```

## Datas Structure

```
Datas[0] → Phase A
Datas[1] → Phase B
Datas[2] → Phase C
```

Each row contains:

| Index | Field        | Description    | Unit |
| ----- | ------------ | -------------- | ---- |
| 0     | voltage      | Phase voltage  | V    |
| 1     | current      | Phase current  | A    |
| 2     | activePower  | Active power   | W    |
| 3     | importEnergy | Import energy  | kWh  |
| 4     | exportEnergy | Export energy  | kWh  |
| 5     | frequency    | Grid frequency | Hz   |
| 6     | powerFactor  | Power factor   | —    |

------

# Three-Phase Meter with NEM (Net Energy Metering)

When **NEM mode** is enabled, `Datas` contains **4 rows**.

```
Datas[0] → Phase A
Datas[1] → Phase B
Datas[2] → Phase C
Datas[3] → Net Metering result
```

## Example

```
{
 "Datas":[
   [225.8,1.420,198.0,423.678,0.000,50.00,0.61],
   [226.2,1.420,197.0,423.528,0.000,50.00,0.61],
   [225.8,1.430,199.0,427.348,0.000,50.00,0.62],
   [226.0,0.000,594.0,1275.075,0.000,50.00,0.62]
 ]
}
```

------

# Datas[3] – Net Metering Data

This row represents the **net measurement result of the three-phase system**.

| Index | Field        | Description                        |
| ----- | ------------ | ---------------------------------- |
| 0     | voltage      | Reference voltage                  |
| 1     | current      | Total current (not typically used) |
| 2     | activePower  | Algebraic sum of three-phase power |
| 3     | importEnergy | Net import energy                  |
| 4     | exportEnergy | Net export energy                  |
| 5     | frequency    | Grid frequency                     |
| 6     | powerFactor  | System power factor                |

------

# Net Metering Calculation

First calculate total power

```
P_total = Pa + Pb + Pc
```

Energy accumulation rule

```
if P_total > 0
    ImportEnergy += P_total × dt
else
    ExportEnergy += |P_total| × dt
```

Therefore

```
NetImportEnergy ≠ Ea_import + Eb_import + Ec_import
```

Net metering is **not simply the sum of three-phase energy**.

------

# Reactive Power Measurement

When **reactive measurement** is enabled, the API returns `EA.Reactive`.

## Example

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

## Structure

```
Reactive[0] → Phase A
Reactive[1] → Phase B
Reactive[2] → Phase C
```

| Index | Field            | Description                | Unit  |
| ----- | ---------------- | -------------------------- | ----- |
| 0     | reactivePower    | Reactive power             | kvar  |
| 1     | inductiveEnergy  | Inductive reactive energy  | kvarh |
| 2     | capacitiveEnergy | Capacitive reactive energy | kvarh |

Reactive power sign:

| Value    | Meaning    |
| -------- | ---------- |
| positive | inductive  |
| negative | capacitive |

------

# Units Summary

| Parameter       | Unit  |
| --------------- | ----- |
| Voltage         | V     |
| Current         | A     |
| Active Power    | W     |
| Import Energy   | kWh   |
| Export Energy   | kWh   |
| Frequency       | Hz    |
| Power Factor    | —     |
| Reactive Power  | kvar  |
| Reactive Energy | kvarh |

------

# Parsing Recommendation

```
// Detect meter type
if(json.Data){
   // single-phase meter
}

if(json.Datas){
   // three-phase meter
}

// Extract three phases
const phases = json.Datas?.slice(0,3)

// Net metering row (optional)
const net = json.Datas?.length > 3
    ? json.Datas[3]
    : null

// Reactive data (optional)
const reactive = json.EA?.Reactive
```

------

# JSON Schema

### Single Phase

```
Data[7]
```

### Three Phase

```
Datas[3]
```

### Three Phase + NEM

```
Datas[4]
```

### Reactive Enabled

```
EA.Reactive[3][3]
```

Draft: JSON Schema 2020-12

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://www.iammeter.com/schemas/monitorjson.schema.json",
  "title": "IAMMETER /api/monitorjson response",
  "description": "Schema for IAMMETER local API /api/monitorjson",
  "oneOf": [
    { "$ref": "#/$defs/singlePhaseResponse" },
    { "$ref": "#/$defs/threePhaseResponse" },
    { "$ref": "#/$defs/threePhaseNemResponse" },
    { "$ref": "#/$defs/threePhaseReactiveResponse" },
    { "$ref": "#/$defs/threePhaseNemReactiveResponse" }
  ],
  "$defs": {
    "baseFields": {
      "type": "object",
      "properties": {
        "method": {
          "type": "string",
          "description": "Data format identifier"
        },
        "mac": {
          "type": "string",
          "description": "Device MAC address"
        },
        "version": {
          "type": "string",
          "description": "Firmware version"
        },
        "server": {
          "type": "string",
          "description": "Internal service identifier"
        },
        "SN": {
          "type": "string",
          "description": "Device serial number"
        }
      },
      "required": ["method", "mac", "version", "server", "SN"]
    },

    "singlePhaseDataArray": {
      "type": "array",
      "description": "Single-phase measurement data: [voltage, current, activePower, importEnergy, exportEnergy, frequency, powerFactor]",
      "minItems": 7,
      "maxItems": 7,
      "prefixItems": [
        {
          "type": "number",
          "title": "voltage",
          "description": "Voltage (V)"
        },
        {
          "type": "number",
          "title": "current",
          "description": "Current (A)"
        },
        {
          "type": "number",
          "title": "activePower",
          "description": "Active power (W)"
        },
        {
          "type": "number",
          "title": "importEnergy",
          "description": "Import energy (kWh)"
        },
        {
          "type": "number",
          "title": "exportEnergy",
          "description": "Export energy (kWh)"
        },
        {
          "type": "number",
          "title": "frequency",
          "description": "Grid frequency (Hz)"
        },
        {
          "type": "number",
          "title": "powerFactor",
          "description": "Power factor"
        }
      ]
    },

    "phaseDataArray": {
      "type": "array",
      "description": "Per-phase measurement data: [voltage, current, activePower, importEnergy, exportEnergy, frequency, powerFactor]",
      "minItems": 7,
      "maxItems": 7,
      "prefixItems": [
        {
          "type": "number",
          "title": "voltage",
          "description": "Phase voltage (V)"
        },
        {
          "type": "number",
          "title": "current",
          "description": "Phase current (A)"
        },
        {
          "type": "number",
          "title": "activePower",
          "description": "Active power (W)"
        },
        {
          "type": "number",
          "title": "importEnergy",
          "description": "Import energy (kWh)"
        },
        {
          "type": "number",
          "title": "exportEnergy",
          "description": "Export energy (kWh)"
        },
        {
          "type": "number",
          "title": "frequency",
          "description": "Grid frequency (Hz)"
        },
        {
          "type": "number",
          "title": "powerFactor",
          "description": "Power factor"
        }
      ]
    },

    "nemDataArray": {
      "type": "array",
      "description": "Net metering data: [voltage, current, algebraicActivePower, netImportEnergy, netExportEnergy, frequency, powerFactor]",
      "minItems": 7,
      "maxItems": 7,
      "prefixItems": [
        {
          "type": "number",
          "title": "voltage",
          "description": "Reference voltage"
        },
        {
          "type": "number",
          "title": "current",
          "description": "Total current or placeholder value"
        },
        {
          "type": "number",
          "title": "activePower",
          "description": "Algebraic sum of three-phase active power (W)"
        },
        {
          "type": "number",
          "title": "importEnergy",
          "description": "Net import energy in NEM mode (kWh)"
        },
        {
          "type": "number",
          "title": "exportEnergy",
          "description": "Net export energy in NEM mode (kWh)"
        },
        {
          "type": "number",
          "title": "frequency",
          "description": "Grid frequency (Hz)"
        },
        {
          "type": "number",
          "title": "powerFactor",
          "description": "System power factor"
        }
      ]
    },

    "reactivePhaseArray": {
      "type": "array",
      "description": "Reactive measurement data per phase: [reactivePower, inductiveReactiveEnergy, capacitiveReactiveEnergy]",
      "minItems": 3,
      "maxItems": 3,
      "prefixItems": [
        {
          "type": "number",
          "title": "reactivePower",
          "description": "Reactive power (kvar), positive = inductive, negative = capacitive"
        },
        {
          "type": "number",
          "title": "inductiveReactiveEnergy",
          "description": "Inductive reactive energy (kvarh)"
        },
        {
          "type": "number",
          "title": "capacitiveReactiveEnergy",
          "description": "Capacitive reactive energy (kvarh)"
        }
      ]
    },

    "reactiveObject": {
      "type": "object",
      "properties": {
        "Reactive": {
          "type": "array",
          "minItems": 3,
          "maxItems": 3,
          "items": { "$ref": "#/$defs/reactivePhaseArray" },
          "description": "Reactive data for phases A, B, and C"
        }
      },
      "required": ["Reactive"],
      "additionalProperties": false
    },

    "singlePhaseResponse": {
      "allOf": [
        { "$ref": "#/$defs/baseFields" },
        {
          "type": "object",
          "properties": {
            "Data": { "$ref": "#/$defs/singlePhaseDataArray" }
          },
          "required": ["Data"],
          "additionalProperties": true
        }
      ]
    },

    "threePhaseResponse": {
      "allOf": [
        { "$ref": "#/$defs/baseFields" },
        {
          "type": "object",
          "properties": {
            "Datas": {
              "type": "array",
              "description": "Three-phase data for phases A, B, C",
              "minItems": 3,
              "maxItems": 3,
              "items": { "$ref": "#/$defs/phaseDataArray" }
            }
          },
          "required": ["Datas"],
          "additionalProperties": true
        }
      ]
    },

    "threePhaseNemResponse": {
      "allOf": [
        { "$ref": "#/$defs/baseFields" },
        {
          "type": "object",
          "properties": {
            "Datas": {
              "type": "array",
              "description": "Three-phase data for phases A, B, C, plus NEM data",
              "minItems": 4,
              "maxItems": 4,
              "prefixItems": [
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/nemDataArray" }
              ]
            }
          },
          "required": ["Datas"],
          "additionalProperties": true
        }
      ]
    },

    "threePhaseReactiveResponse": {
      "allOf": [
        { "$ref": "#/$defs/baseFields" },
        {
          "type": "object",
          "properties": {
            "Datas": {
              "type": "array",
              "description": "Three-phase data for phases A, B, C",
              "minItems": 3,
              "maxItems": 3,
              "items": { "$ref": "#/$defs/phaseDataArray" }
            },
            "EA": { "$ref": "#/$defs/reactiveObject" }
          },
          "required": ["Datas", "EA"],
          "additionalProperties": true
        }
      ]
    },

    "threePhaseNemReactiveResponse": {
      "allOf": [
        { "$ref": "#/$defs/baseFields" },
        {
          "type": "object",
          "properties": {
            "Datas": {
              "type": "array",
              "description": "Three-phase data for phases A, B, C, plus NEM data",
              "minItems": 4,
              "maxItems": 4,
              "prefixItems": [
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/phaseDataArray" },
                { "$ref": "#/$defs/nemDataArray" }
              ]
            },
            "EA": { "$ref": "#/$defs/reactiveObject" }
          },
          "required": ["Datas", "EA"],
          "additionalProperties": true
        }
      ]
    }
  }
}
```

