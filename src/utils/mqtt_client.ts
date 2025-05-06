import mqtt, { MqttClient} from "mqtt";

const MQTT_BROKER_URL = "mqtts://9f6d6fadb82c4fcba6aebc53d4b6cdf7.s1.eu.hivemq.cloud";
const MQTT_USERNAME = "Esp_8266";
const MQTT_PASSWORD = "Esp_8266";
const CLIENT_ID = `nodejs-client-${Math.random().toString(16).slice(2, 8)}`;

const client: MqttClient = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: CLIENT_ID,
  reconnectPeriod: 1000,
});

client.on("connect", () => {
  console.log("✅ Connected to HiveMQ from Node.js!");
});

client.on("error", (err) => {
  console.error("❌ MQTT Connection error:", err.message);
});

export function subscribe(topic: string, callback: (payload: any) => void): void {
  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${topic}:`, err.message);
    } else {
      console.log(`📡 Subscribed to topic: ${topic}`);
    }
  });

  client.on("message", (receivedTopic, message) => {
    if (receivedTopic === topic) {
      try {
        const payload = JSON.parse(message.toString());
        callback(payload);
      } catch (error) {
        console.error("❌ Failed to parse MQTT message:", error);
      }
    }
  });
}

export function publish(topic: string, message: object): void {
  client.publish(topic, JSON.stringify(message), (err) => {
    if (err) {
      console.error(`❌ Failed to publish to ${topic}:`, err.message);
    } else {
      console.log(`📤 Message published to ${topic}:`, message);
    }
  });
}

export default client;
