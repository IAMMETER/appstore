# IAM WiFi Provisioner

IAM WiFi Provisioner is a Windows desktop utility for batch provisioning IAMMETER devices onto a target Wi-Fi network. It continuously scans for device hotspots, connects to matching SSIDs, submits Wi-Fi credentials to the device provisioning API, and records each successful device SN.

## What It Does

- Batch provisions multiple IAMMETER meters without opening each hotspot manually
- Scans Windows Wi-Fi adapters and matches device SSIDs by prefix
- Connects to the device hotspot automatically with `netsh`
- Sends provisioning data to `http://11.11.11.1/api/setwifiadv`
- Extracts and records SN values from hotspot names
- Saves run logs and success records for later auditing

## Included Files

- `iam_wifi_provisioner_en.exe` - Ready-to-run Windows executable
- `iam_wifi_provisioner_en.py` - Python source code
- `requirements.txt` - Python dependencies
- `frontend/index.html` - App Center landing page with direct download links

## Direct Downloads

- EXE (GitHub blob): https://github.com/IAMMETER/appstore/blob/main/apps/iam-wifi-provisioner/iam_wifi_provisioner_en.exe
- EXE (direct raw download): https://raw.githubusercontent.com/IAMMETER/appstore/main/apps/iam-wifi-provisioner/iam_wifi_provisioner_en.exe
- Python source: https://github.com/IAMMETER/appstore/blob/main/apps/iam-wifi-provisioner/iam_wifi_provisioner_en.py

If you open this app from GitHub Pages, the landing page also exposes direct buttons to download the EXE and source locally.

## Requirements

- Windows with Wi-Fi enabled
- Permission to use `netsh wlan`
- IAMMETER devices broadcasting hotspots with a common prefix such as `iMeter`
- Devices reachable on the default provisioning address `11.11.11.1`

## Default Parameters

- Device hotspot SSID prefix: `iMeter`
- Target Wi-Fi SSID: `iammeter`
- Target Wi-Fi password: `12345678`
- Provisioning API path: `/api/setwifiadv`

All of these can be adjusted in the UI before starting a scan.

## How To Use

1. Launch `iam_wifi_provisioner_en.exe`.
2. Set the device SSID prefix used by the meters you want to provision.
3. Enter the target Wi-Fi SSID and password that the meters should join.
4. Set the scan interval and retry parameters.
5. Click `Start Scan`.
6. Watch the run log and the provisioned-device table.
7. Export or review results in `log/success_records.csv`.

## Output Files

When the tool runs, it creates:

- `config/settings.json` - persisted UI settings
- `log/run_YYYYMMDD_HHMMSS.log` - session log file
- `log/success_records.csv` - success history with time, device SSID, and SN

## Run From Python

Install dependencies:

```bash
pip install -r requirements.txt
```

Run:

```bash
python iam_wifi_provisioner_en.py
```

## Build EXE

From the project directory:

```bash
pyinstaller --clean --onefile --windowed --name iam_wifi_provisioner_en iam_wifi_provisioner_en.py
```

The packaged file is generated at:

```text
dist/iam_wifi_provisioner_en.exe
```

## Notes

- This tool is designed for Windows because it depends on `wlanapi.dll` and `netsh wlan`.
- The current UI and source file are the English build: `iam_wifi_provisioner_en.py`.
- Provisioning success is determined by the device response JSON containing `successful == 1`.

## Version

- App version: `v1.0`
- App Center package version: `1.0.0`
