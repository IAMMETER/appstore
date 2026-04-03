# IAMMETER Static App AI Guide

This document is intended for AI assistants generating dashboards or tools for IAMMETER devices.

## Overview

IAMMETER devices provide a local API:

```
http://<meter-ip>/api/monitorjson
```

This API returns **real-time electrical measurements** and can be accessed directly from a browser.

IAMMETER meters support **CORS**, so static dashboards can call this API directly using `fetch()` without requiring a backend server.

Typical applications include:

- custom energy dashboards
- solar monitoring pages
- smart home energy panels
- TV wall energy displays
- AI-generated monitoring tools

The full API reference is documented here:

```
/api/monitorjson
```

------

# Detect Meter Type

When parsing the API response:

```
Data  → single-phase meter
Datas → three-phase meter
```

Example detection:

```
if(json.Data){
   // single-phase meter
}

if(json.Datas){
   // three-phase meter
}
```

------

# Single-Phase Parsing Example

Example data:

```
Data:[226.85,1.31,152.0,22920.38,0.00,49.97,0.51]
```

Recommended parsing:

```
const voltage = json.Data[0]
const current = json.Data[1]
const power = json.Data[2]
const importEnergy = json.Data[3]
const exportEnergy = json.Data[4]
const frequency = json.Data[5]
const powerFactor = json.Data[6]
```

Common dashboard values:

| Parameter    | Location |
| ------------ | -------- |
| Voltage      | Data[0]  |
| Current      | Data[1]  |
| Power        | Data[2]  |
| Frequency    | Data[5]  |
| Power Factor | Data[6]  |

------

# Three-Phase Parsing Example

```
const phaseA = json.Datas[0]
const phaseB = json.Datas[1]
const phaseC = json.Datas[2]

const powerA = phaseA[2]
const powerB = phaseB[2]
const powerC = phaseC[2]

const totalPower =
powerA + powerB + powerC
```

------

# Minimal Static App Template

Below is a minimal **static monitoring dashboard**.

```
<!DOCTYPE html>
<html>

<head>

<title>IAMMETER Monitor</title>

<style>

body{
font-family:Arial;
padding:20px;
}

.card{
font-size:20px;
margin:10px 0;
}

</style>

</head>

<body>

<h2>IAMMETER Dashboard</h2>

<input id="ip" placeholder="Meter IP">
<button onclick="start()">Start</button>

<div class="card" id="power"></div>
<div class="card" id="voltage"></div>

<script>

function start(){

const ip=document.getElementById("ip").value

setInterval(async()=>{

const res=await fetch(`http://${ip}/api/monitorjson`)
const json=await res.json()

if(json.Data){

document.getElementById("power").innerText =
"Power: "+json.Data[2]+" W"

document.getElementById("voltage").innerText =
"Voltage: "+json.Data[0]+" V"

}

},2000)

}

</script>

</body>

</html>
```

------

# Recommended Refresh Rate

Typical refresh interval:

```
1–2 seconds
```

Example:

```
setInterval(update,2000)
```

------

# AI Implementation Rules

When generating dashboards for IAMMETER devices:

1. Always request data from

```
http://<meter-ip>/api/monitorjson
```

1. Detect meter type using

```
Data → single phase
Datas → three phase
```

1. Prefer browser-side `fetch()`.
2. IAMMETER meters support **CORS**, so no backend proxy is required.
3. Static apps should allow users to input the **meter IP address**.