import mqtt, { MqttClient } from "mqtt";

// Configuration
const MQTT_CONFIG = {
  BROKER_URL: "mqtts://9f6d6fadb82c4fcba6aebc53d4b6cdf7.s1.eu.hivemq.cloud",
  CREDENTIALS: {
    username: "Esp_8266",
    password: "Esp_8266",
    clientId: `nodejs-client-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 1000
  }
};

// MQTT Client Setup
const mqttClient: MqttClient = mqtt.connect(
  MQTT_CONFIG.BROKER_URL, 
  MQTT_CONFIG.CREDENTIALS
);

// Event Handlers
mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");
});

mqttClient.on("error", (err) => {
  console.error("MQTT connection error:", err.message);
});

/**
 * Subscribes to an MQTT topic and sets up message handling
 * @param topic - Topic to subscribe to
 * @param callback - Function to handle incoming messages
 */
export function subscribe(topic: string, callback: (payload: any) => void): void {
  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error(`Subscription failed for ${topic}:`, err.message);
      return;
    }
    console.log(`Subscribed to ${topic}`);
  });

  mqttClient.on("message", (receivedTopic, message) => {
    if (receivedTopic === topic) {
      try {
        callback(JSON.parse(message.toString()));
      } catch (error) {
        console.error(`Message parsing error for ${topic}:`, error);
      }
    }
  });
}

/**
 * Publishes a message to an MQTT topic
 * @param topic - Topic to publish to
 * @param message - Message payload (will be stringified)
 */
export function publish(topic: string, message: object): void {
  mqttClient.publish(topic, JSON.stringify(message), (err) => {
    if (err) {
      console.error(`Publish failed for ${topic}:`, err.message);
      return;
    }
    console.log(`Published to ${topic}`);
  });
}

export const disconnectClient = () => {
  if (mqttClient && mqttClient.connected) {
    mqttClient.end(true, () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('🔌 MQTT client disconnected');
      }
    });
  }
};
export default mqttClient;