import { Request, Response } from "express";
import { 
  sendDeviceCommand, 
  sendStatusRequest, 
  subscribeToDeviceCommunication, 
  deviceHeartbeatStore,
  riskyDevices,
  requestHeartbeatData,
  getLastHeartbeatData ,
  getAndMarkDeviceAlerts,
  marknotificationAsRead,
  getAllEndUsersService, 
  getEndUserByIdService 
} from '../services/deviceService';

import { 
  getDeviceService,
  getAllDevicesService, 
  createDeviceService,
  updateDeviceService,
  deleteDeviceService,

} from '../services/deviceService';

export const getAllDevices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    
    const { devices, total } = await getAllDevicesService(page, pageSize);
    
    res.status(200).json({
      devices,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
};

export const getNotificationsForDevice = async (req: Request, res: Response) => {
  const deviceId = Number(req.params.deviceId);
  
  if (isNaN(deviceId)) {
    return res.status(400).json({ error: "Invalid device ID" });
  }

  try {
    const alerts = await getAndMarkDeviceAlerts(deviceId);
    return res.status(200).json(alerts);
  } catch (error) {
    console.error("❌ Failed to fetch notifications:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = Number(req.params.notificationId || "0")
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }
    const marked = await marknotificationAsRead(notificationId)
    if (!marked) {
      return res.status(404).json({ error: "Notification not found" });
    }
    return res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({error : true , message : "Failed to mark notification as read"});
  }
}

export const getDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = Number(req.params.id);
    if (isNaN(deviceId)) {
      res.status(400).json({ error: "Invalid device ID" });
      return;
    }

    const device = await getDeviceService(deviceId);
    res.json(device);
  } catch (error) {
    if (error instanceof Error && error.message === "Device not found") {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error in getDevice:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const createDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const device = await createDeviceService(req.body);
    res.status(201).json(device);
  } catch (error) {
    console.error('Error in creating a device:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create device' 
    });
  }
};

export const updateDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = Number(req.params.id);
    if (isNaN(deviceId)) {
      res.status(400).json({ success: false, error: "Invalid device ID" });
      return;
    }

    const result = await updateDeviceService(deviceId, req.body);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.device,
      message: "Device updated successfully"
    });
  } catch (error) {
    console.error("Update error", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update device' 
    });
  }
};

export const deleteDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = Number(req.params.id);
    if (isNaN(deviceId)) {
      res.status(400).json({ success: false, error: "Invalid device ID" });
      return;
    }
    const device = await deleteDeviceService(deviceId);
    res.status(201).json(device);
  } catch (error) {
    console.error('Error in deleting the device:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete device' 
    });
  }
};


export const controlDevice = async (req: Request, res: Response) => {
  const { macAddress, action } = req.body;

  // Validate the action
  if (!['activer', 'desactiver', 'set_defective', 'set_maintenance'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const deviceResponse = await sendDeviceCommand(macAddress, action);

    if (deviceResponse.error) {
      return res.status(500).json({ error: true, message: deviceResponse.message });
    }

    return res.json({ status: 'ok', message: `Command ${action} executed`, response: deviceResponse });
  } catch (err) {
    return res.status(500).json({ error: true, message: 'Failed to control device.' });
  }
};

// Handle device status request
export const requestDeviceStatus = (req: Request, res: Response) => {
  const { macAddress } = req.params;
  sendStatusRequest(macAddress);
  res.json({ message: `Status request sent to ${macAddress}` });
};

// Subscribe to device heartbeat and status updates
export const subscribeDeviceUpdates = (req: Request, res: Response) => {
  const { deviceId } = req.params;
  subscribeToDeviceCommunication(Number(deviceId));
  res.json({ message: `Subscribed to ${deviceId}'s updates` });
};

// Get last known heartbeat for a device from memory
export const getDeviceHeartbeat = async (req: Request, res: Response) => {
  const { macAddress } = req.params;
  
  // First, check if we have the data in memory
  /*const heartbeatData = getLastHeartbeatData(numDeviceId);
  
  if (heartbeatData) {
    return res.json({
      deviceId: numDeviceId,
      heartbeat: heartbeatData,
      lastUpdated: new Date(heartbeatData.timestamp * 1000).toISOString()
    });
  }
  

  */
  // If not in memory, request it from the device
  //requestHeartbeatData(numDeviceId);
  try {
    const response = await sendDeviceCommand(macAddress, 'status');
    return res.json({
      macAddress: macAddress,
      heartbeat: response,
      lastUpdated: new Date(response.timestamp * 1000).toISOString()
    });
  } catch (error) {
    return res.status(202).json({ 
      message: `No heartbeat data available. Request sent to device ${macAddress}. Try again shortly.` 
    });
  }
};


// Get all risky devices
export const getRiskyDevices = (_req: Request, res: Response) => {
  return res.json({
    riskyDevices: riskyDevices,
    count: Object.keys(riskyDevices).length,
    timestamp: new Date().toISOString()
  });
  
};

// Force refresh of device heartbeat
export const refreshDeviceHeartbeat = (req: Request, res: Response) => {
  const { macAddress } = req.params;
  requestHeartbeatData(macAddress);
  res.json({ message: `Heartbeat refresh request sent to ${macAddress}` });
};


export const getAllEndUsers = async (req: Request, res: Response) => {
  try {
    const endUsers = await getAllEndUsersService();
    res.status(200).json(endUsers);
  } catch (error) {
    console.error('Error in getAllEndUsers controller:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch end users' 
    });
  }
};


export const getEndUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const endUserId = parseInt(req.params.id);
    if (isNaN(endUserId)) {
      res.status(400).json({ error: 'Invalid end user ID' });
      return;
    }

    const endUser = await getEndUserByIdService(endUserId);
    res.status(200).json(endUser);
  } catch (error) {
    if (error instanceof Error && error.message === 'End user not found') {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error in getEndUserById controller:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch end user' 
      });
    }
  }
};