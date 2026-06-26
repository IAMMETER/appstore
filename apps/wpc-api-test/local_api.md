# Local HTTP API Reference

This document describes the local HTTP APIs implemented by the firmware HTTP server.

Base URL:

```text
http://<device-ip>/<path>
```

In AP mode, the device address is typically:

```text
http://11.11.11.1/<path>
```

Unless noted otherwise, responses are JSON and include CORS headers. Most setter APIs return:

```json
{"successful":1,"message":"ok"}
```

Invalid JSON or invalid parameters usually return:

```json
{"successful":0,"message":"invalid parameter"}
```

## Notes

- The firmware matches many routes by substring. The paths below are the intended paths.
- New integrations should prefer the consolidated APIs:
  - `GET /api/monitor`
  - `GET /api/wifidata`
  - `GET /api/getadv`
  - `POST /api/setadv`
  - `POST /api/setwifiadv`
  - `GET /api/getbrand`
  - `POST /api/setbrand`
- Several legacy single-setting GET APIs still exist for compatibility.
- Some POST APIs save configuration and reboot the device after sending the HTTP response.

## Common APIs

These APIs are shared by WEM meter models and WPC controller models.

### Common GET APIs

#### `GET /api/monitor`

Returns current device status and real-time data.

For WEM meter models, the response contains meter data:

```json
{
  "ssid": "wifi-name",
  "sig": 100,
  "mac": "B0F893...",
  "version": "i.91.xxx",
  "server": "em",
  "SN": "xxxxxxxx",
  "model": "WEM3080T",
  "Datas": [
    [220.0, 9.990, 2198.0, 11.337, 11.201, 49.99, 1.00]
  ]
}
```

For WPC controller models, the response contains controller-specific fields such as `gridPower`, `maxPower`, `setPower`, `setPowerMode`, `meterAddress`, `meterOnline`, `threshold`, `hysteresis`, `startHour`, `stopHour`, `tzOffset`, `meterType`, and `meterConfig`.

If meter data is not ready yet, the response may contain null data and an upload packet index.

#### `GET /api/wifidata`

Returns Wi-Fi and network settings.

Typical response fields:

```json
{
  "version": "i.91.xxx",
  "SN": "xxxxxxxx",
  "mac": "B0F893...",
  "type": "PM",
  "ssid": "wifi-name",
  "ip": "192.168.1.100",
  "netmask": "255.255.255.0",
  "gw": "192.168.1.1",
  "dns": "192.168.1.1",
  "dhcp": 1,
  "runMode": "mqtt",
  "uploadAddress": "mqtt://example.com:1883",
  "netmeter": 0,
  "uploadinterval": 60
}
```

#### `GET /api/wifiaplist`

Scans nearby Wi-Fi networks and returns a JSON list.

```json
[
  {"ssid":"example-wifi","signal":88}
]
```

#### `GET /api/getadv`

Returns advanced settings. The response schema depends on the model type.

For WEM fields, see [WEM GET APIs](#wem-get-apis).

For WPC fields, see [WPC GET APIs](#wpc-get-apis).

#### `GET /api/getbrand`

Returns local Web UI branding configuration.

```json
{
  "showIammeter": 1,
  "brandText": "IAMMETER",
  "apSsid": "FactoryAP"
}
```

Branding behavior:

- `showIammeter = 1`: show IAMMETER logo/text/footer.
- `showIammeter = 0`: hide all IAMMETER logo/text/footer content. If `brandText` is set, display it in the brand position; otherwise leave that position blank.
- If the Web UI cannot read this API, the frontend defaults to hidden IAMMETER content.

#### `GET /api/sntpstatus`

Returns SNTP synchronization status. The exact fields are produced by `send_sntp_status_json()`.

#### `GET /api/energyhistory`

Returns locally stored energy history data. The exact structure is produced by `send_energy_history_json()`.

#### `GET /api/restart`

Reboots the device.

```bash
curl "http://<device-ip>/api/restart"
```

#### `GET /api/restart?reset=true`

Factory-resets user Wi-Fi/settings except the serial number, then persists the change.

```bash
curl "http://<device-ip>/api/restart?reset=true"
```

#### `GET /api/totallyreset`

Factory-resets all settings including the serial number, then reboots.

```bash
curl "http://<device-ip>/api/totallyreset"
```

Use this endpoint carefully.

#### `GET /api/ssid?value=<apSsid>`

Legacy AP SSID setter. Stores `kv_ap_ssid` and reboots.

```bash
curl "http://<device-ip>/api/ssid?value=FactoryAP"
```

For new integrations, prefer `POST /api/setbrand` with `apSsid`.

#### `GET /info.xml`

Returns UPnP-style XML device information.

#### Static File GET Paths

For non-API GET paths, the server tries to serve a file from the embedded filesystem. `/` maps to `index.html`, and if a `.gz` version exists it is served with gzip encoding.

Typical examples:

```text
GET /
GET /index.html
GET /index.html.gz
```

### Common POST APIs

#### `POST /api/setbrand`

Sets local Web UI branding fields. The body is JSON.

All fields are optional, but at least one field must be present.

| Field | Type | Description |
| --- | --- | --- |
| `showIammeter` | integer | `1` shows IAMMETER branding; `0` hides IAMMETER branding. |
| `brandText` | string | Custom brand text, ASCII only, up to 20 bytes. Empty string is accepted. |
| `apSsid` | string | Soft AP SSID factory setting, ASCII only, up to 18 bytes. |

Example:

```bash
curl -X POST "http://<device-ip>/api/setbrand" \
  -H "Content-Type: application/json" \
  -d '{"showIammeter":0,"brandText":"Factory","apSsid":"FactoryAP"}'
```

Partial update examples:

```bash
curl -X POST "http://<device-ip>/api/setbrand" \
  -H "Content-Type: application/json" \
  -d '{"showIammeter":1}'

curl -X POST "http://<device-ip>/api/setbrand" \
  -H "Content-Type: application/json" \
  -d '{"apSsid":"FactoryAP"}'
```

#### `POST /api/setadv`

Saves advanced settings. The body is JSON. The supported fields depend on the model type.

For WEM fields, see [WEM POST APIs](#wem-post-apis).

For WPC fields, see [WPC POST APIs](#wpc-post-apis).

Some `setadv` changes require reboot. The firmware sends the JSON response first, saves configuration, waits briefly, and then reboots if needed.

#### `POST /api/setwifiadv`

Saves Wi-Fi and IP settings. The body is JSON.

Supported fields are optional, but values that are present are validated before being saved.

| Field | Type | Description |
| --- | --- | --- |
| `ssid` | string | Wi-Fi SSID. |
| `pwd` | string | Wi-Fi password. |
| `dhcp` | boolean | `true` enables DHCP, `false` uses static IP settings. |
| `ip` | string | Static IPv4 address. |
| `netmask` | string | Static IPv4 netmask. |
| `gw` | string | Static IPv4 gateway. |
| `dns` | string | Static IPv4 DNS server. |

Example:

```bash
curl -X POST "http://<device-ip>/api/setwifiadv" \
  -H "Content-Type: application/json" \
  -d '{"ssid":"my-wifi","pwd":"password","dhcp":true}'
```

Static IP example:

```bash
curl -X POST "http://<device-ip>/api/setwifiadv" \
  -H "Content-Type: application/json" \
  -d '{"ssid":"my-wifi","pwd":"password","dhcp":false,"ip":"192.168.1.80","netmask":"255.255.255.0","gw":"192.168.1.1","dns":"192.168.1.1"}'
```

This endpoint saves configuration and reboots after responding.



## WEM APIs

These APIs apply to WEM meter models.

### WEM GET APIs

#### `GET /api/getadv`

Returns WEM advanced settings.

```json
{
  "runMode": 3,
  "runModeList": "IAMMETER-cloud,tcp,http,mqtt,stand alone",
  "uploadAddress": "mqtts://mqtt.iammeter.com:8883",
  "mqttUsername": "user",
  "mqttPassword": "password",
  "ntpServer": "pool.ntp.org",
  "haDiscovery": 0,
  "uploadInterval": 60,
  "netmetering": 0,
  "ctcRatio": 1,
  "reactive": 0
}
```



#### `GET /api/reactive`

Returns the reactive-energy flag.

```json
{"reactive":0}
```

#### `GET /api/reactive?x=<0|1>`

Sets the reactive-energy flag.

#### `GET /api/mqttha`

Returns the MQTT Home Assistant discovery flag.

```json
{"mqttHA":0}
```

#### `GET /api/mqttha?x=<0|1>`

Sets the MQTT Home Assistant discovery flag.

#### `GET /api/ratio`

Returns the CT ratio setting for WEM3046T-style models.

```json
{"CTratio":1}
```

#### `GET /api/ratio?x=<value>`

Sets the CT ratio setting for WEM3046T-style models.

#### `GET /api/netmetering`

Returns net metering mode.

```json
{"NEM":0}
```

#### `GET /api/netmetering?nem=<0|1>`

Sets net metering mode.

Note: older external documentation may spell this as `netmetring`; the current firmware implements `netmetering`.

#### `GET /api/ctcratio`

Returns CT-C ratio.

```json
{"ctcratio":1}
```

#### `GET /api/ctcratio?ctc=<value>`

Sets CT-C ratio.

#### `GET /api/uploadinterval`

Returns the upload interval in seconds.

```json
{"uploadinterval":60}
```

#### `GET /api/uploadinterval?x=<seconds>`

Sets the upload interval in seconds.

#### `GET /api/mqtt`

Returns MQTT username and password length.

```json
{
  "username": "user",
  "pwdlength": 6
}
```

The password itself is not returned by this legacy API.

#### `GET /api/mqtt?user=<username>&pwd=<password>`

Sets MQTT username and password.

For new integrations, prefer `POST /api/setadv`.

#### `GET /api/basicauth`

Returns the stored Basic Auth string and password length.

```json
{
  "authstring": "xxxx",
  "pwdlength": 0
}
```

#### `GET /api/basicauth?authstring=<value>`

Sets the stored Basic Auth string.

### WEM POST APIs

#### `POST /api/setadv`

Saves WEM advanced settings. The body is JSON.

Supported fields include:

| Field | Type | Description |
| --- | --- | --- |
| `runMode` | integer | `0` cloud, `1` TCP, `2` HTTP, `3` MQTT, `4` standalone. |
| `uploadAddress` | string | Upload target. Examples: `mqtt://host:1883`, `mqtts://host:8883`, `host:port`, HTTP target depending on mode. |
| `mqttUsername` | string | MQTT username. |
| `mqttPassword` | string | MQTT password. |
| `haDiscovery` | integer | Home Assistant discovery flag. |
| `uploadInterval` | integer | Upload interval in seconds. |
| `ntpServer` | string | NTP server. |
| `netmetering` | integer | Net metering mode. |
| `ctcRatio` | integer | CT-C ratio. |
| `reactive` | integer | Reactive-energy flag. |

Example:

```bash
curl -X POST "http://<device-ip>/api/setadv" \
  -H "Content-Type: application/json" \
  -d '{"runMode":3,"uploadAddress":"mqtts://mqtt.iammeter.com:8883","uploadInterval":60,"mqttUsername":"user","mqttPassword":"pass","haDiscovery":0}'
```

## WPC APIs

These APIs apply to WPC controller models.

### WPC GET APIs

#### `GET /api/getadv`

Returns WPC advanced settings.

```json
{
  "setPowerMode": 0,
  "meterConfig": "1,1,1",
  "threshold": 0,
  "hysteresis": 0,
  "tzOffset": 0,
  "startHour": 0,
  "stopHour": 23,
  "meterType": 0,
  "restorePower": 0,
  "ntpServer": "pool.ntp.org",
  "haDiscovery": 0,
  "mqttEnabled": 0,
  "mqttAddress": "mqtt://example.com:1883",
  "mqttUsername": "user",
  "mqttPassword": "password",
  "meterList": "iMeter,virtualTCP",
  "setPowerModeList": "Manual,Auto",
  "maxPower": 3600,
  "setPower": 1000,
  "meterAddress": "192.168.1.10",
  "uploadInterval": 60
}
```

#### `GET /api/setpower`

Returns the current set power.

```json
{"setpower":1000}
```

#### `GET /api/setpower?value=<watts>`

Sets the current set power.

#### `GET /api/maxpower`

Returns maximum power.

```json
{"maxpower":3600}
```

#### `GET /api/maxpower?value=<watts>`

Sets maximum power.

#### `GET /automode`

Returns auto/manual mode.

```json
{"automode":0}
```

#### `GET /automode?turn_on`

Enables automatic mode.

#### `GET /automode?turn_off`

Disables automatic mode.

### WPC POST APIs

#### `POST /api/setadv`

Saves WPC advanced settings. The body is JSON.

Supported fields include:

| Field | Type | Description |
| --- | --- | --- |
| `setPower` | integer | Current set power. |
| `setPowerMode` | integer | `0` manual, `1` auto. |
| `maxPower` | integer | Maximum power. |
| `meterAddress` | string | Meter address, optionally `host:port`. Default port is 502 if omitted. |
| `meterConfig` | string | Meter phase/ratio config, such as `1,1,1`. |
| `threshold` | integer | Auto-control threshold. |
| `hysteresis` | integer | Auto-control hysteresis. |
| `tzOffset` | integer | Timezone offset. |
| `startHour` | integer | Auto-control start hour. |
| `stopHour` | integer | Auto-control stop hour. |
| `meterType` | integer | Meter source type. |
| `restorePower` | integer | Restore power setting. |
| `ntpServer` | string | NTP server. |
| `mqttAddress` | string | MQTT upload address. |
| `mqttUsername` | string | MQTT username. |
| `mqttPassword` | string | MQTT password. |
| `uploadInterval` | integer | Upload interval in seconds. |
| `haDiscovery` | integer | Home Assistant discovery flag. |
| `mqttEnabled` | integer | MQTT enable flag. |

Example:

```bash
curl -X POST "http://<device-ip>/api/setadv" \
  -H "Content-Type: application/json" \
  -d '{"setPower":1000,"setPowerMode":0,"maxPower":3600,"meterAddress":"192.168.1.10","uploadInterval":60}'
```
