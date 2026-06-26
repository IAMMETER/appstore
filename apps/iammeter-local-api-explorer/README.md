# IAMMETER Local API Explorer

Top-level selector page for IAMMETER local API test tools.

## Features

- Enter one IAMMETER device IP address from the same local network.
- Automatically add `http://` when only an IP address is entered.
- Choose the product type before opening the dedicated test page.
- Pass the IP address into the selected WEM or WPC Swagger API tester through browser storage.

## How to Use

1. Open the app.
2. Enter the device IP address, for example `192.168.1.80` or `http://192.168.1.80`.
3. Choose **WEM API Test** for WEM meter models, or **WPC API Test** for WPC controller models.
4. The selected test page opens with the same device IP already applied.

## Target Apps

- `apps/wem-api-test` for WEM local HTTP APIs.
- `apps/wpc-api-test` for WPC local HTTP APIs.

## Requirements

- The browser and IAMMETER device must be on the same LAN.
- The selected target device must allow browser access to its local HTTP APIs.
- Modern browser with JavaScript enabled.

## Version History

### v1.0.0

- Initial top-level selector page for WEM and WPC API test tools.
