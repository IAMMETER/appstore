# WPC API Test

Interactive Swagger UI test tool for WPC local HTTP APIs.

## Features

- Test WPC local HTTP APIs directly from the browser.
- Save the controller address in browser storage.
- Automatically add `http://` when only an IP address is entered.
- Includes common APIs, advanced controller settings, Wi-Fi settings, branding, power control, auto mode, and maintenance endpoints.

## Included APIs

- `GET /api/monitor`
- `GET /api/wifidata`
- `GET /api/wifiaplist`
- `GET /api/getadv`
- `POST /api/setadv`
- `POST /api/setwifiadv`
- `GET /api/getbrand`
- `POST /api/setbrand`
- `GET /api/setpower`
- `GET /api/maxpower`
- `GET /automode`
- `GET /api/sntpstatus`
- `GET /api/energyhistory`
- Maintenance endpoints: `restart`, `totallyreset`, `ssid`, and `info.xml`

## How to Use

1. Open the app.
2. Enter the WPC device IP, for example `192.168.1.80` or `http://192.168.1.80`.
3. Click **Apply**.
4. Expand an API operation and use **Try it out**.

## Notes

- Some setter APIs save configuration and reboot the device after the HTTP response.
- Factory reset endpoints are included for completeness. Use them carefully.
- The app is static and requires no backend.

## Source Documentation

This app is based on the WPC section in `apps/wem-api/local_api.md`.
