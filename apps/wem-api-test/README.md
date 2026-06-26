# WEM API Test

Interactive Swagger UI test tool for WEM local HTTP APIs.

## Features

- Test WEM local HTTP APIs directly from the browser.
- Save the device address in browser storage.
- Automatically add `http://` when only an IP address is entered.
- Includes common WEM APIs, advanced settings APIs, branding APIs, Wi-Fi settings APIs, and legacy WEM configuration endpoints.

## Included APIs

- `GET /api/monitor`
- `GET /api/wifidata`
- `GET /api/wifiaplist`
- `GET /api/getadv`
- `POST /api/setadv`
- `POST /api/setwifiadv`
- `GET /api/getbrand`
- `POST /api/setbrand`
- `GET /api/sntpstatus`
- `GET /api/energyhistory`
- WEM legacy configuration endpoints: `reactive`, `mqttha`, `ratio`, `netmetering`, `ctcratio`, `uploadinterval`, `mqtt`, and `basicauth`
- Maintenance endpoints: `restart`, `totallyreset`, `ssid`, and `info.xml`

## How to Use

1. Open the app.
2. Enter the WEM device IP, for example `192.168.1.80` or `http://192.168.1.80`.
3. Click **Apply**.
4. Expand an API operation and use **Try it out**.

## Notes

- Some setter APIs save configuration and reboot the device after the HTTP response.
- Factory reset endpoints are included for completeness. Use them carefully.
- The app is static and requires no backend.

## Source Documentation

This app is based on `apps/wem-api/local_api.md`.
