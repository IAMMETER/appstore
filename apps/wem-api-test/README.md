# WEM API Test

Interactive Swagger UI test tool for WEM local HTTP APIs.

## Features

- Test WEM local HTTP APIs directly from the browser.
- Save the device address in browser storage.
- Automatically add `http://` when only an IP address is entered.
- Includes public status APIs, Admin Security APIs, outbound TLS CA APIs, WEM configuration APIs, and legacy WEM endpoints.
- Supports HTTP Basic Auth through Swagger UI's **Authorize** button.

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
- `GET /api/monitorjson` and `GET /monitorjson`
- Admin Security APIs: `admin/status`, `admin/check`, `admin/recovery_challenge`, `admin/enable`, `admin/password`, and `admin/recovery`
- Outbound TLS CA APIs: `tls/ca/status`, `tls/ca/upload`, `tls/ca/select`, and `tls/ca/delete`
- WEM legacy configuration endpoints: `reactive`, `mqttha`, `ratio`, `netmetering`, `ctcratio`, `uploadinterval`, `mqtt`, and `basicauth`
- Maintenance endpoints: `restart`, `ssid`, and `info.xml`

## How to Use

1. Open the app.
2. Enter the WEM device IP, for example `192.168.1.80` or `http://192.168.1.80`.
3. Click **Apply**.
4. If Admin Security is enabled, click **Authorize** and enter the device administrator username and password.
5. Expand an API operation and use **Try it out**.

## Notes

- Some setter APIs save configuration and reboot the device after the HTTP response.
- The destructive `/api/totallyreset` endpoint is intentionally excluded.
- Public endpoints are explicitly marked as not requiring Basic Auth. Other endpoints use the configured credentials when Admin Security is enabled.
- Firmware upload and upgrade endpoints, including `/api/updateFirmware` and all OTA POST routes, are intentionally excluded.
- The app is static and requires no backend.

## Source Documentation

This app is based on `apps/wem-api/local_api.md`.
