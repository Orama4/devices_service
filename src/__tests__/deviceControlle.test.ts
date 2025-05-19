import mqttClient from "../utils/mqtt_client";
import { sendDeviceCommand } from "../services/deviceService";
import { jest } from "@jest/globals";
import { MqttClient, IClientOptions, IPublishPacket } from "mqtt";

type MqttCallback = (error: Error | null) => void;

// Mock MQTT client
jest.mock("../utils/mqtt_client", () => {
  const mockClient = {
    subscribe: jest.fn(
      (
        topic: string,
        options: IClientOptions | MqttCallback,
        callback?: MqttCallback
      ) => {
        const cb = typeof options === "function" ? options : callback;
        if (cb) cb(null);
        return mockClient;
      }
    ),
    publish: jest.fn(
      (
        topic: string,
        message: string,
        options: IClientOptions | MqttCallback,
        callback?: MqttCallback
      ) => {
        const cb = typeof options === "function" ? options : callback;
        if (cb) cb(null);
        return mockClient;
      }
    ),
    on: jest.fn(
      (
        event: "message",
        handler: (
          topic: string,
          payload: Buffer,
          packet: IPublishPacket
        ) => void
      ) => {
        /* ... */
      }
    ),
    removeListener: jest.fn(),
    unsubscribe: jest.fn(
      (
        topic: string,
        options: IClientOptions | MqttCallback,
        callback?: MqttCallback
      ) => {
        const cb = typeof options === "function" ? options : callback;
        if (cb) cb(null);
        return mockClient;
      }
    ),
    end: jest.fn(),
    connected: true,
    listenerCount: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockClient as unknown as MqttClient,
  };
});

describe("sendDeviceCommand - Complete Unit Tests", () => {
  const originalConsole = console;
  const mockMqtt = mqttClient as jest.Mocked<typeof mqttClient>;
  const validMac = "00:11:22:33:44:55";
  const invalidMacs = [
    "00-11-22-33-44", // Wrong size
    "00:11:22:33:44:5G", // Non-hex character
    "invalid_mac_address", // Completely invalid format
    "001122334455", // Correct but unformatted (should be accepted)
  ];


  beforeAll(() => {
    jest.useFakeTimers();
    global.console = { ...console, log: jest.fn(), error: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    global.console = originalConsole;
    jest.useRealTimers();
  });

  // 1. MAC Address Format Tests
  describe("MAC Address Sanitization", () => {
    const testCases = [
      { input: "00:11:22:33:44:55", expected: "001122334455" },
      { input: "00-11-22-33-44-55", expected: "001122334455" }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should properly sanitize ${input} to ${expected}`, async () => {
        const testPromise = sendDeviceCommand(input, "activate");

        expect(mockMqtt.subscribe).toHaveBeenCalledWith(
          `device${expected}/response`,
          expect.any(Function)
        );

        const messageHandler = mockMqtt.on.mock.calls.find(
          (call: any[]) => call[0] === "message"
        )?.[1];
        if (messageHandler) {
          (messageHandler as any)(
            `device${expected}/response`,
            Buffer.from('{"status":"ok"}')
          );
        }

        await expect(testPromise).resolves.toEqual({ status: "ok" });
      });
    });

    invalidMacs.forEach((mac) => {
      it(`should reject invalid MAC address ${mac}`, async () => {
        await expect(sendDeviceCommand(mac, "activate")).resolves.toMatchObject(
          {
            error: true,
            message: expect.stringContaining("Invalid MAC address"),
          }
        );
      });
    });
  });

  // 2. Main Function Flow Tests
  describe("Main Function Flow", () => {
    it("should complete full lifecycle successfully", async () => {
      const testPromise = sendDeviceCommand(validMac, "activate", {
        param: "value",
      });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        "device001122334455/response",
        expect.any(Function)
      );

      expect(mockMqtt.publish).toHaveBeenCalledWith(
        "device001122334455/request",
        JSON.stringify({ command: "activate", param: "value" }),
        expect.any(Function)
      );

      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];
      if (messageHandler) {
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from('{"status":"success"}')
        );
      }

      await expect(testPromise).resolves.toEqual({ status: "success" });

      expect(mockMqtt.unsubscribe).toHaveBeenCalledWith(
        "device001122334455/response",
        expect.any(Function)
      );
      expect(mockMqtt.removeListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );
    });

    it("should handle multiple responses (only first matters)", async () => {
      const testPromise = sendDeviceCommand(validMac, "activate");
      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];

      if (messageHandler) {
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from('{"status":"first"}')
        );
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from('{"status":"second"}')
        );
      }

      await expect(testPromise).resolves.toEqual({ status: "first" });
    });
  });

  // 3. Error Handling Tests
  describe("Error Handling", () => {
    it("should handle publish errors", async () => {
      const mockPublish = mockMqtt.publish as jest.Mock;
      mockPublish.mockImplementationOnce(
        ((
          topic: string,
          message: string,
          options: IClientOptions | MqttCallback,
          callback?: MqttCallback
        ) => {
          const cb = typeof options === "function" ? options : callback;
          if (cb) cb(new Error("Network failure"));
          return mockMqtt;
        }) as any
      );

      await expect(
        sendDeviceCommand(validMac, "activate")
      ).resolves.toMatchObject({
        error: true,
        message: "Publish failed: Network failure",
      });
    });

    it("should handle subscription errors", async () => {
      const mockSubscribe = mockMqtt.subscribe as jest.Mock;
      mockSubscribe.mockImplementationOnce(
        ((
          topic: string,
          options: IClientOptions | MqttCallback,
          callback?: MqttCallback
        ) => {
          const cb = typeof options === "function" ? options : callback;
          if (cb) cb(new Error("Access denied"));
          return mockMqtt;
        }) as any
      );

      await expect(
        sendDeviceCommand(validMac, "activate")
      ).resolves.toMatchObject({
        error: true,
        message: "Subscription failed: Access denied",
      });
    });

    it("should handle message parsing errors", async () => {
      const testPromise = sendDeviceCommand(validMac, "activate");
      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];

      if (messageHandler) {
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from("invalid-json")
        );
      }

      await expect(testPromise).resolves.toMatchObject({
        error: true,
        message: expect.stringContaining("Failed to parse response"),
      });
    });
  });

  // 4. Special Behavior Tests
  describe("Special Behaviors", () => {
    it("should handle timeout when no response received", async () => {
      const testPromise = sendDeviceCommand(validMac, "activate");

      jest.advanceTimersByTime(5000);

      await expect(testPromise).resolves.toMatchObject({
        error: true,
        message: "ODB is not activated or not responding",
      });
    });

    it("should handle connection loss", async () => {
      (mockMqtt as any).connected = false;

      await expect(
        sendDeviceCommand(validMac, "activate")
      ).resolves.toMatchObject({
        error: true,
        message: "MQTT client not connected",
      });
    });

    it("should handle simultaneous commands", async () => {
      const promise1 = sendDeviceCommand(validMac, "command1");
      const promise2 = sendDeviceCommand(validMac, "command2");

      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];

      if (messageHandler) {
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from('{"responseTo":"command2"}')
        );
        (messageHandler as any)(
          "device001122334455/response",
          Buffer.from('{"responseTo":"command1"}')
        );
      }

      await expect(promise1).resolves.toEqual({ responseTo: "command1" });
      await expect(promise2).resolves.toEqual({ responseTo: "command2" });

      expect(mockMqtt.unsubscribe).toHaveBeenCalledTimes(2);
      expect(mockMqtt.removeListener).toHaveBeenCalledTimes(2);
    });
  });

  // 5. Security Tests
  describe("Security Tests", () => {
    

    it("should sanitize command payload", async () => {
      const maliciousPayload = { cmd: "rm -rf /*" };
      const testPromise = sendDeviceCommand(
        validMac,
        "execute",
        maliciousPayload
      );

      expect(mockMqtt.publish).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('"cmd":"rm -rf /*"'),
        expect.anything()
      );

      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];
      if (messageHandler) {
        (messageHandler as any)(
          `device001122334455/response`,
          Buffer.from('{"status":"filtered"}')
        );
      }

      await testPromise;
    });
  });

  // 6. Logging Tests
  describe("Logging Tests", () => {
    it("should log successful commands", async () => {
      const testPromise = sendDeviceCommand(validMac, "log-test");

      const messageHandler = mockMqtt.on.mock.calls.find(
        (call: any[]) => call[0] === "message"
      )?.[1];
      if (messageHandler) {
        (messageHandler as any)(
          `device001122334455/response`,
          Buffer.from('{"log":"OK"}')
        );
      }

      await testPromise;

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Command 'log-test' sent to device")
      );
      expect(console.log).toHaveBeenCalledWith(
        "Response received:", expect.any(Object)
      );
    });

    it("should log errors appropriately", async () => {
      const mockPublish = mockMqtt.publish as jest.Mock;
      mockPublish.mockImplementationOnce(
        ((
          topic: string,
          message: string,
          options: IClientOptions | MqttCallback,
          callback?: MqttCallback
        ) => {
          const cb = typeof options === "function" ? options : callback;
          if (cb) cb(new Error("Log me"));
          return mockMqtt;
        })as any
      );

      await sendDeviceCommand(validMac, "error-command");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to send command 'error-command' to device`),
        expect.anything()
      );
    });
  });
});
