# IAMMETER Local API Explorer

Interactive Swagger UI interface for testing and exploring all IAMMETER Wi-Fi Energy Meter local HTTP APIs.

## Features

- 📖 **Complete API Documentation** - Browse all available local HTTP APIs with detailed descriptions
- 🧪 **Interactive Testing** - Test API endpoints directly from your browser
- 💾 **Smart Configuration** - Meter IP address is saved to browser and persists across sessions
- 🎯 **Simple Input** - Just enter the meter IP (e.g., `10.10.30.35`), no need to type `http://` every time
- 🌐 **CORS Enabled** - Works directly with IAMMETER meters thanks to built-in CORS support
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Supported APIs

This tool provides documentation and testing for all IAMMETER local APIs:

- **GET /api/monitorjson** - Real-time measurement data (Voltage, Current, Power, Energy, Frequency, PF)
- **GET /api/monitor** - Advanced monitoring data with Wi-Fi signal information
- **GET /api/netmetering** - Get/Set Net Energy Metering (NEM) mode
- **GET /api/reactive** - Get/Set Reactive Power measurement mode
- **GET /api/uploadinterval** - Get/Set data upload interval
- **GET /api/wifidata** - Wi-Fi connection information
- **GET /api/ratio** - CT ratio configuration (WEM3046T only)
- **GET /api/ctcratio** - Phase C multiplier for split-phase scenarios

## How to Use

1. **Enter Meter IP**

   - Type your energy meter's IP address in the top input field
   - Example: `10.10.30.35` or `http://10.10.30.35`
   - The application automatically adds `http://` if not specified
2. **Click Apply**

   - Your configuration is saved to browser storage
   - The Swagger UI will reload with your meter's address
3. **Test APIs**

   - Expand any API endpoint
   - Click "Try it out"
   - Fill in parameters (if required)
   - Click "Execute"
   - View the response in real-time
4. **Reset Configuration**

   - Click "Reset" to clear saved settings and return to default

## Supported Devices

- **WEM3080T** - Three-phase Wi-Fi energy meter
- **WEM3080** - Single-phase Wi-Fi energy meter
- **WEM3046T** - Three-phase Wi-Fi energy meter with external CT support
- **WEM3050T** - Three-phase Wi-Fi energy meter (compact)

## Technical Details

- **Runtime**: Static (browser-only, no backend required)
- **Dependencies**: Swagger UI (loaded from CDN)
- **Storage**: LocalStorage for meter IP persistence
- **CORS**: Requires IAMMETER meter with CORS enabled (default on all IAMMETER devices)

## Requirements

- IAMMETER Wi-Fi energy meter on the same network
- Modern web browser with JavaScript enabled
- Network access to the meter's IP address

## Use Cases

- **API Development** - Reference and test APIs while building integrations
- **Troubleshooting** - Debug API responses and verify meter behavior
- **Learning** - Explore available APIs and understand their parameters
- **Configuration** - Quickly configure meter settings via API
- **Testing** - Validate API functionality before implementing in production

## Related Documentation

- [IAMMETER Local API Documentation](https://www.iammeter.com/newsshow/blog-fw-features#5-local-api-http-over-lan)
- [IAMMETER Wi-Fi Energy Meter Overview](https://www.iammeter.com/products/three-phase-meter)
- [JSON Data Format](https://www.iammeter.com/newsshow/energy-meter-json-value)

## License

Open Source

## Version History

### v1.0.0 (2026-03-11)

- Initial release
- Complete API documentation for all local endpoints
- Browser storage for meter IP configuration
- Auto-add http:// prefix feature
- English interface
- Responsive Swagger UI integration
