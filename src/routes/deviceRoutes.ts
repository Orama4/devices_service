import express from 'express';
import { 
  controlDevice, 
  requestDeviceStatus, 
  subscribeDeviceUpdates, 
  getDeviceHeartbeat, 
  refreshDeviceHeartbeat,
  getRiskyDevices,
  markNotificationAsRead
} from "../controllers/deviceController";

import {getAllDevices,getDevice,createDevice,updateDevice, deleteDevice,getNotificationsForDevice} from "../controllers/deviceController";

const router = express.Router();

// Control device (send command)
router.post('/control', controlDevice);

//status and subscribtion
router.get('/status/:deviceId', requestDeviceStatus);  //sends a new request to the device for its status
router.post('/subscribe/:deviceId', subscribeDeviceUpdates); // Subscribe to device updates
router.put('/markNotification/:notificationId', markNotificationAsRead); // Mark notification as read

// Heartbeat data routes
router.get('/heartbeat/:deviceId', getDeviceHeartbeat);  //first checks cached data, then requests new data if needed
router.get('/risky-devices', getRiskyDevices);      // Get all risky devices
router.get('/notifications/:deviceId',getNotificationsForDevice);

router.get("/",getAllDevices);//http://localhost:5002/devices?page=1&pageSize=5
router.get("/:id",getDevice);//http://localhost:5002/devices/3
router.post("/", createDevice);//http://localhost:5002/devices
router.put("/:id", updateDevice);//http://localhost:5002/devices/3
router.delete("/:id",deleteDevice);//http://localhost:5002/devices/3


export default router; // Export the router to be used in your main app file


