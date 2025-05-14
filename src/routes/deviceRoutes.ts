import express from 'express';
import {
  // Device CRUD Operations
  getAllDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  
  // Device Status & Control
  controlDevice,
  requestDeviceStatus,
  subscribeDeviceUpdates,
  
  // Heartbeat & Monitoring
  getDeviceHeartbeat,
  refreshDeviceHeartbeat,
  getRiskyDevices,
  
  // Notifications
  getNotificationsForDevice,
  markNotificationAsRead
} from "../controllers/deviceController";

const router = express.Router();

function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
/**
 * Device CRUD Routes
 */
router.route("/")
  .get(getAllDevices)    // GET /devices?page=1&pageSize=5
  .post(createDevice);   // POST /devices

router.route("/:id")
  .get(getDevice)        // GET /devices/:id
  .put(updateDevice)     // PUT /devices/:id
  .delete(deleteDevice); // DELETE /devices/:id

/**
 * Device Control & Status Routes
 */
router.post('/control',asyncHandler(controlDevice));            // POST /devices/control
router.get('/status/:deviceId', requestDeviceStatus); // GET /devices/status/:deviceId
router.post('/subscribe/:deviceId', subscribeDeviceUpdates); // POST /devices/subscribe/:deviceId

/**
 * Heartbeat & Monitoring Routes
 */
router.get('/heartbeat/:macAddress', asyncHandler(getDeviceHeartbeat));  // GET /devices/heartbeat/:macAddress
router.post('/heartbeat-refresh/:macAddress', refreshDeviceHeartbeat); // POST /devices/heartbeat-refresh/:macAddress
router.get('/risky-devices', asyncHandler(getRiskyDevices));            // GET /devices/risky-devices

/**
 * Notification Routes
 */
router.get('/notifications/:deviceId', asyncHandler(getNotificationsForDevice));  // GET /devices/notifications/:deviceId
router.put('/notifications/:notificationId', asyncHandler(markNotificationAsRead)); // PUT /devices/notifications/:notificationId

export default router;