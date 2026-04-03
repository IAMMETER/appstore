

1. Change the **DEVICE_SN**, **MQTT_USERNAME** and **MQTT_PASSWORD** in "iammeter-realtime.js" to yours( [How to get the mqtt credentials from IAMMETER-Cloud](https://www.iammeter.com/blog/subscribe-real-time-energy-data-mqtt) ).

```
  const DEVICE_SN = "CB0A0CFB";
  const MQTT_USERNAME = "lewei";
  const MQTT_PASSWORD = "123456";
```

2. Configure [mqtt mode](https://www.iammeter.com/blog/subscribe-real-time-energy-data-mqtt#configure-iammeter-meter-to-use-mqtt-mode) on IAMMETER`s products.

![Set meter to MQTT upload mode and configure IAMMETER MQTT Broker parameters](https://iammeterglobal.oss-accelerate.aliyuncs.com/img/image-20251126121416299.png)

