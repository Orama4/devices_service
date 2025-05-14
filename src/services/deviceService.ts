import mqttClient from "../utils/mqtt_client";
import { PrismaClient } from "@prisma/client";
import { DeviceStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Interface for heartbeat data
interface HeartbeatData {
  status: string;
  metrics: {
    cpu_percent: number;
    ram_used: number;
    ram_total: number;
    ram_percent: number;
    temperature: number;
  };
  timestamp: number;
  device_id: string;
  online: boolean;
}
interface EndUserBasicInfo {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

// Interface for device heartbeat tracking
interface DeviceHeartbeatStore {
  [deviceId: string]: HeartbeatData;
}

// Interface for risky devices tracking
interface RiskyDevices {
  [deviceId: string]: {
    timestamp: number;
    reason: string;
  };
}

// Store of latest heartbeat data per device
const deviceHeartbeatStore: DeviceHeartbeatStore = {};

// Tracking risky devices
const riskyDevices: RiskyDevices = {};

// Thresholds for metrics
const THRESHOLDS = {
  temperature: 70, // °C
  cpu_percent: 95, // %
  ram_percent: 90, // %
};

// Time settings (in milliseconds)
const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MONITOR_INTERVAL = 60 * 10;

/**
 * Function that processes and stores heartbeat messages from IoT devices.
 * Updates the device's heartbeat data in memory and logs the reception time.
 * Used for monitoring device health and status.
 *
 * @param deviceId - Unique identifier of the device
 * @param heartbeatData - Device's heartbeat data including timestamp and metrics
 */
const handleHeartbeatMessage = (
  deviceId: string,
  heartbeatData: HeartbeatData
) => {
  // Store the complete heartbeat data
  deviceHeartbeatStore[deviceId] = heartbeatData;

  console.log(
    `📡 Received heartbeat from ${deviceId} at ${new Date(
      heartbeatData.timestamp * 1000
    ).toLocaleString()}`
  );

  // Analyze metrics for risk factors
  // analyzeMetrics(deviceId, heartbeatData);
};

/**
 * Function that analyzes device metrics to detect potential risks and issues.
 * Monitors temperature, CPU usage, and RAM usage against predefined thresholds.
 * Updates the risky devices registry when metrics exceed safe limits.
 *
 * @param deviceId - Unique identifier of the device
 * @param heartbeatData - Device's heartbeat data containing metrics and status
 *
 * @description
 * Checks three main metrics:
 * - Temperature (high temperature warning)
 * - CPU usage (high CPU usage warning)
 * - RAM usage (high RAM usage warning)
 *
 * If any metric exceeds its threshold, the device is marked as risky
 * and added to the riskyDevices registry with the reason.
 * If metrics return to normal, the device is removed from the risky registry.
 */
const analyzeMetrics = (deviceId: string, heartbeatData: HeartbeatData) => {
  const { metrics, status } = heartbeatData;

  // Skip analysis if device is already marked as defective
  if (status === "Defectueux") {
    return;
  }

  // Check metrics against thresholds
  let isRisky = false;
  let riskReason = "";

  if (metrics.temperature >= THRESHOLDS.temperature) {
    console.warn(`⚠️ ${deviceId} high temperature: ${metrics.temperature}°C`);
    isRisky = true;
    riskReason = `High temperature: ${metrics.temperature}°C`;
  }
  if (metrics.cpu_percent >= THRESHOLDS.cpu_percent) {
    console.warn(`⚠️ ${deviceId} high CPU usage: ${metrics.cpu_percent}%`);
    isRisky = true;
    riskReason = riskReason || `High CPU usage: ${metrics.cpu_percent}%`;
  }
  if (metrics.ram_percent >= THRESHOLDS.ram_percent) {
    console.warn(`⚠️ ${deviceId} high RAM usage: ${metrics.ram_percent}%`);
    isRisky = true;
    riskReason = riskReason || `High RAM usage: ${metrics.ram_percent}%`;
  }

  // Update risky devices tracking
  if (isRisky) {
    riskyDevices[deviceId] = {
      timestamp: Date.now(),
      reason: riskReason,
    };
  } else {
    // Remove from risky devices if metrics are now normal
    if (riskyDevices[deviceId]) {
      delete riskyDevices[deviceId];
      console.log(`✅ ${deviceId} metrics returned to normal range`);
    }
  }
};

/**
 * Function that handles MQTT communication with an IoT device.
 * Sends a command to the device and waits for its response with a 5-second timeout.
 * Automatically manages MQTT topic subscription/unsubscription and resource cleanup.
 *
 * @param macAddress - Device's MAC address
 * @param command - Command to send (activate, deactivate, etc.)
 * @param payloadData - Optional additional data
 * @returns Promise with device response or error
 */
export const sendDeviceCommand = (
  macAddress: string,
  command: string,
  payloadData: object = {}
): Promise<any> => {
  return new Promise((resolve) => {
    const sanitized = macAddress.replace(/[:\-]/g, "").toUpperCase();
    const requestTopic = `device${sanitized}/request`;
    const responseTopic = `device${sanitized}/response`;
    const payload = JSON.stringify({ command, ...payloadData });
    console.log(requestTopic);

    let isHandled = false;

    const cleanup = () => {
      mqttClient.removeListener("message", messageHandler);
      mqttClient.unsubscribe(responseTopic, (err) => {
        if (err) {
          console.error(`Failed to unsubscribe from ${responseTopic}`, err);
        } else {
          console.log(`Unsubscribed from ${responseTopic}`);
        }
      });
    };

    const messageHandler = (topic: string, message: Buffer) => {
      if (topic === responseTopic && !isHandled) {
        isHandled = true;
        clearTimeout(timeout);
        const response = JSON.parse(message.toString());
        console.log("📨 Response received:", response);
        cleanup();
        resolve(response); // Respond normally
      }
    };

    mqttClient.subscribe(responseTopic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${responseTopic}`, err);
        isHandled = true;
        cleanup();
        return resolve({
          error: true,
          message: `Subscription failed: ${err.message}`,
        });
      }
      console.log(`✅ Subscribed to ${responseTopic}`);
    });

    mqttClient.publish(requestTopic, payload, (err) => {
      if (err) {
        console.error(
          `❌ Failed to send command '${command}' to device ${macAddress}`,
          err
        );
        isHandled = true;
        cleanup();
        return resolve({
          error: true,
          message: `Publish failed: ${err.message}`,
        });
      }
      console.log(`📡 Command '${command}' sent to device ${macAddress}`);
    });

    mqttClient.on("message", messageHandler);

    const timeout = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        console.warn(`⚠️ Timeout: ODB not responding for device ${macAddress}`);
        resolve({
          error: true,
          message: "ODB is not activated or not responding",
        });
      }
    }, 5000);
  });
};

/**
 * Commands a device to send its current status
 * @param macAddress - Device's network identifier
 */

export const sendStatusRequest = (macAddress: string) => {
  sendDeviceCommand(macAddress, "status");
};

/**
 * Requests heartbeat data from a specific device
 * @param macAddress - The MAC address of the target device
 */
export const requestHeartbeatData = (macAddress: string) => {
  sendDeviceCommand(macAddress, "get_heartbeat_data");
};

/**
 * Establishes MQTT subscriptions for device communication and status monitoring
 * @param deviceId - The ID of the device to monitor
 */
export const subscribeToDeviceCommunication = (deviceId: number) => {
  // Subscribe to status responses
  const statusTopic = `device${deviceId}/request`;
  mqttClient.subscribe(statusTopic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${deviceId}'s status`, err);
    } else {
      console.log(`📢 Subscribed to ${deviceId}'s status`);
    }
  });

  // Subscribe to heartbeats
  const heartbeatTopic = `device${deviceId}/response`;
  mqttClient.subscribe(heartbeatTopic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${deviceId}'s heartbeat`, err);
    } else {
      console.log(`📢 Subscribed to ${deviceId}'s heartbeat`);
    }
  });

  // Listen for messages on both topics
  mqttClient.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      if (topic === statusTopic) {
        console.log(`📥 Received status from ${deviceId}:`, data);
        handleStatusMessage(deviceId.toString(), data);
      } else if (topic === heartbeatTopic) {
        handleHeartbeatMessage(deviceId.toString(), data);
        console.log(`📡 Heartbeat data:`, data);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${topic}:`, error);
    }
  });
};

/**
 * Processes a device status message and handles heartbeat data if metrics are present
 * @param deviceId - ID of the device sending the status
 * @param status - Status payload containing potential metrics data
 */
const handleStatusMessage = (deviceId: string, status: any) => {
  // Update heartbeat data if it contains metrics
  if (status.metrics) {
    const heartbeatData: HeartbeatData = {
      status: status.status,
      metrics: status.metrics,
      timestamp: status.timestamp || Math.floor(Date.now() / 1000),
      device_id: deviceId,
      online: status.online,
    };

    handleHeartbeatMessage(deviceId, heartbeatData);
  }
};

/**
 * Checks all devices for missed heartbeats and takes appropriate action:
 * - Marks as defective if device had prior risk factors
 * - Marks as out of service for simple disconnections
 * - Cleans up stored data after handling
 */
export const monitorDeviceHeartbeats = () => {
  const now = Date.now();

  for (const deviceId in deviceHeartbeatStore) {
    const heartbeatData = deviceHeartbeatStore[deviceId];
    const lastHeartbeatTime = heartbeatData.timestamp * 1000; // Convert to milliseconds
    const timeSinceLastHeartbeat = now - lastHeartbeatTime;

    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.warn(
        `⚠️ Device ${deviceId} has missed heartbeats for ${Math.round(
          timeSinceLastHeartbeat / 1000 / 60
        )} minutes`
      );

      if (riskyDevices[deviceId]) {
        // Device was already showing risk factors before going offline
        setDeviceDefective(Number(deviceId), riskyDevices[deviceId].reason);
      } else {
        // Device just went offline without prior risk factors
        setDeviceOutOfService(Number(deviceId));
      }

      // Clean up after marking
      delete deviceHeartbeatStore[deviceId];
      delete riskyDevices[deviceId];
    }
  }
};

/**
 * Returns the latest heartbeat data for a device
 * @param deviceId - ID of the device to check
 * @returns The heartbeat data if available, otherwise null
 */
export const getLastHeartbeatData = (
  deviceId: number
): HeartbeatData | null => {
  return deviceHeartbeatStore[deviceId.toString()] || null;
};

/**
 * Updates a device's status in the database
 * @param deviceId - ID of device to update
 * @param status - New status from allowed states
 * @returns Updated device record
 * @throws Error if update fails
 */
export async function updateDeviceStatusInDB(
  deviceId: number,
  status:
    | "connected"
    | "disconnected"
    | "under_maintenance"
    | "out_of_service"
    | "defective"
    | "broken_down"
) {
  try {
    console.log("Attempting to set status:", status);
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: { status },
    });
    return updatedDevice;
  } catch (error) {
    console.error("❌ Failed to update device status:", error);
    throw new Error("Error updating device status");
  }
}

/**
 * Creates a maintenance intervention record
 * @param type - 'preventive' or 'curative'
 * @param deviceId - Device ID to service
 * @param maintainerId - Technician ID
 * @param priority - Priority level (string)
 * @param isRemote - Remote capable? (default: false)
 * @param planDate - Scheduled date (default: now)
 */
export async function createIntervention(
  type: "preventive" | "curative",
  deviceId: number,
  maintainerId: number,
  Priority: string,
  isRemote: boolean = false,
  planDate: Date = new Date()
) {
  try {
    const intervention = await prisma.intervention.create({
      data: {
        type,
        Device: { connect: { id: deviceId } },
        Maintainer: { connect: { id: maintainerId } },
        Priority,
        isRemote,
        planDate,
      },
    });
    return intervention;
  } catch (error) {
    console.error("❌ Failed to create intervention:", error);
    throw new Error("Error creating intervention");
  }
}

// --- Device State Setters ---

/**
 * Marks a device as defective and creates a maintenance ticket
 * @param macAddress - Device identifier
 * @param reason - Optional description of the defect
 */
const setDeviceDefective = async (macAddress: number, reason: string = "") => {
  console.error(
    `🚨 Device ${macAddress} is now marked as Défectueux (defective). Reason: ${reason}`
  );
  sendDeviceCommand(macAddress.toString(), "set_defective");
  await updateDeviceStatusInDB(macAddress, "defective");
  await createIntervention(
    "curative",
    macAddress,
    1, // Maintainer ID
    "1", // Priority (high)
    false,
    new Date()
  );
};

/**
 * Marks a device as out of service and creates a maintenance intervention
 * @param deviceId - ID of the broken device
 */
const setDeviceOutOfService = async (deviceId: number) => {
  console.warn(
    `⚠️ Device ${deviceId} is now marked as Hors service (offline).`
  );
  await updateDeviceStatusInDB(deviceId, "broken_down");
  await createIntervention(
    "curative",
    deviceId,
    1, // Maintainer ID
    "1", // Priority (high)
    true,
    new Date()
  );
};

// --- Start the Heartbeat Monitor ---
setInterval(monitorDeviceHeartbeats, MONITOR_INTERVAL);

// Export functions for API endpoints
export { deviceHeartbeatStore, riskyDevices };

interface CreateDeviceData {
  nom: string;
  macAdresse: string;
  status: DeviceStatus;
  peripheriques?: any;
  localisation?: any;
  cpuUsage?: number;
  ramUsage?: number;
  userId?: number | null;
  maintainerId?: number | null;
  price?: number | null;
  manufacturingCost?: number | null;
  type?: string;
}

interface UpdateDeviceData {
  nom?: string;
  macAdresse?: string;
  status?: DeviceStatus;
  peripheriques?: any;
  localisation?: any;
  cpuUsage?: number;
  ramUsage?: number;
  userId?: number | null;
  maintainerId?: number | null;
  price?: number | null;
  manufacturingCost?: number | null;
  type?: string;
}

/**
 * Gets paginated devices with relations.
 * @param page - Current page (default: 1)
 * @param pageSize - Items per page (default: 10)
 * @returns {devices, total} - Paginated results
 */
export const getAllDevicesService = async (page = 1, pageSize = 10) => {
  try {
    const skip = (page - 1) * pageSize;

    const devices = await prisma.device.findMany({
      skip: skip,
      take: pageSize,
      include: {
        EndUser: true,
        Maintainer: true,
      },
    });

    const total = await prisma.device.count();

    return { devices, total };
  } catch (error) {
    console.error("Error fetching devices:", error);
    throw error;
  }
};

/**
 * Retrieves a device by ID including associated EndUser and Maintainer.
 * @param deviceId - The ID of the device to fetch
 * @returns Promise<Device> - The device object with relations
 * @throws Error if device not found or database error occurs
 * @example
 * const device = await getDeviceService(123);
 * // Returns: Device object with EndUser and Maintainer relations
 */
export const getDeviceService = async (deviceId: number) => {
  try {
    const device = await prisma.device.findUnique({
      where: {
        id: deviceId,
      },
      include: {
        EndUser: true,
        Maintainer: true,
      },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    return device;
  } catch (error) {
    console.error("Error fetching device:", error);
    throw error;
  }
};

/**
 * Creates a new device with the provided data.
 * @param data - Device properties (type defaults to 'default_type' if not specified)
 * @returns Promise<{success: boolean, device: Device}> - Contains the created device
 * @throws On database error
 * @note Sets default type if not provided in data
 */
export const createDeviceService = async (data: CreateDeviceData) => {
  try {
    const newDevice = await prisma.device.create({
      data: {
        nom: data.nom,
        macAdresse: data.macAdresse,
        status: data.status,
        peripheriques: data.peripheriques,
        localisation: data.localisation,
        cpuUsage: data.cpuUsage,
        ramUsage: data.ramUsage,
        userId: data.userId,
        maintainerId: data.maintainerId,
        price: data.price,
        manufacturingCost: data.manufacturingCost,
        type: data.type || "default_type", // Provide a default type if not specified
      },
    });

    return { success: true, device: newDevice };
  } catch (error) {
    console.error("Error creating device:", error);
    throw error;
  }
};

/**
 * Updates device data by ID. Returns update result.
 * @param id - Device ID to update
 * @param data - Fields to update
 * @returns {success, message|device} - Update status
 * @throws On DB error
 */
export const updateDeviceService = async (
  id: number,
  data: UpdateDeviceData
) => {
  try {
    const deviceExists = await prisma.device.findUnique({
      where: { id },
    });

    if (!deviceExists) {
      return { success: false, message: "Device not found" };
    }

    const updatedDevice = await prisma.device.update({
      where: { id },
      data: {
        ...data,
      },
    });

    return { success: true, device: updatedDevice };
  } catch (error) {
    console.error("Error updating device:", error);
    throw error;
  }
};

/**
 * Deletes a device by ID if it exists.
 * @param id - Device ID to delete
 * @returns Promise<{success: boolean, message: string}>
 *         - success: true if deleted, false if not found
 *         - message: Status message
 * @throws On database error
 * @example
 * const result = await deleteDeviceService(123);
 * // { success: true, message: "Device deleted successfully" }
 */
export const deleteDeviceService = async (id: number) => {
  try {
    const deviceExists = await prisma.device.findUnique({
      where: { id },
    });

    if (!deviceExists) {
      return { success: false, message: "Device not found" };
    }

    await prisma.device.delete({
      where: { id },
    });

    return { success: true, message: "Device deleted successfully" };
  } catch (error) {
    console.error("Error deleting device:", error);
    throw error;
  }
};

/**
 * Creates a notification for a device alert's associated user.
 * @param alert - Object containing deviceId (string)
 * @param content - Notification message content
 * @returns Promise<void> - No return value (side-effect only)
 * @example
 * await createNotificationForDeviceAlert({ deviceId: "123" }, "Low battery");
 */
export async function createNotificationForDeviceAlert(
  alert: { deviceId: string },
  content: string
) {
  try {
    const device = await prisma.device.findUnique({
      where: { id: parseInt(alert.deviceId) },
      include: { EndUser: { include: { User: true } } },
    });

    if (device?.EndUser?.User?.id) {
      await prisma.notification.create({
        data: {
          content,
          userId: device.EndUser.User.id,
        },
      });
      console.log("✅ Notification enregistrée en base de données.");
    } else {
      console.warn("⚠️ Aucun utilisateur lié à ce dispositif.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la création de la notification:", error);
  }
}

/**
 * Fetches unread alerts for a device's user and returns them.
 * @param deviceId - ID of the device to check
 * @returns Promise<Notification[]> - Array of unread notifications (empty if no user found)
 * @throws On database error
 * @example
 * const alerts = await getAndMarkDeviceAlerts(123); // Returns unread notifications
 */
export async function getAndMarkDeviceAlerts(deviceId: number) {
  try {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { EndUser: { select: { userId: true } } },
    });

    console.log("Device:", device); // Log the device object for debugging
    if (!device?.EndUser?.userId) {
      console.warn("⚠️ Aucun utilisateur trouvé pour ce dispositif.");
      return [];
    }

    const userId = device.EndUser.userId;

    const alerts = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
    return alerts;
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération ou mise à jour des notifications:",
      error
    );
    throw error;
  }
}

/**
 * Marks a notification as read by ID.
 * @param notificationId - ID of the notification to update
 * @returns Promise<boolean> - true if successful, false if failed
 * @example
 * const success = await markNotificationAsRead(1); // true if updated
 */
export const marknotificationAsRead = async (notificationId: number) => {
  try {
    await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Fetches all end users with their basic info (id, first name, last name).
 * Names may be null if no profile exists.
 * @returns Promise<EndUserBasicInfo[]>
 * @throws On database error
 * @example
 * const users = await getAllEndUsersService(); // [{ id: 1, firstName: "John", lastName: "Doe" }]
 */
export const getAllEndUsersService = async (): Promise<EndUserBasicInfo[]> => {
  try {
    const endUsers = await prisma.endUser.findMany({
      select: {
        id: true,
        User: {
          select: {
            Profile: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
    });

    return endUsers.map((endUser) => ({
      id: endUser.id,
      firstName: endUser.User.Profile?.firstname || null,
      lastName: endUser.User.Profile?.lastname || null,
    }));
  } catch (error) {
    console.error("Error in getAllEndUsersService:", error);
    throw error;
  }
};

/**
 * Service function that retrieves basic information about an end user by their ID.
 * Fetches user data from the database including their profile information.
 *
 * @param endUserId - The unique identifier of the end user
 * @returns Promise<EndUserBasicInfo> - Object containing user's ID, first name, and last name
 * @throws Error if end user is not found or if database query fails
 *
 * @example
 * // Returns: { id: 1, firstName: "John", lastName: "Doe" }
 * const userInfo = await getEndUserByIdService(1);
 */
export const getEndUserByIdService = async (
  endUserId: number
): Promise<EndUserBasicInfo> => {
  try {
    const endUser = await prisma.endUser.findUnique({
      where: {
        id: endUserId,
      },
      select: {
        id: true,
        User: {
          select: {
            Profile: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
    });

    if (!endUser) {
      throw new Error("End user not found");
    }

    return {
      id: endUser.id,
      firstName: endUser.User.Profile?.firstname || null,
      lastName: endUser.User.Profile?.lastname || null,
    };
  } catch (error) {
    console.error(`Error in getEndUserByIdService for ID ${endUserId}:`, error);
    throw error;
  }
};
