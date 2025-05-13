import request from 'supertest';
import express from 'express';
import deviceRouter from '../routes/deviceRoutes';

// Mock the controller
/*
jest.mock('../controllers/deviceController', () => ({
  controlDevice: jest.fn(async (req, res) => {
    const { macAddress, action } = req.body;
    if (!macAddress) return res.status(400).json({ error: 'macAddress is required' });
    if (!action) return res.status(400).json({ error: 'action is required' });
    if (!['activer', 'desactiver', 'set_defective', 'set_maintenance'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    // Simulate success
    return res.status(200).json({ success: true, macAddress, action });
  }),

requestDeviceStatus: jest.fn((req, res) => res.status(200).json({})),
  subscribeDeviceUpdates: jest.fn((req, res) => res.status(200).json({})),
  markNotificationAsRead: jest.fn((req, res) => res.status(200).json({})),
  getDeviceHeartbeat: jest.fn((req, res) => res.status(200).json({})),
  getRiskyDevices: jest.fn((req, res) => res.status(200).json({})),
  getNotificationsForDevice: jest.fn((req, res) => res.status(200).json({})),
  getAllDevices: jest.fn((req, res) => res.status(200).json([])),
  getDevice: jest.fn((req, res) => res.status(200).json({})),
  createDevice: jest.fn((req, res) => res.status(201).json({})),
  updateDevice: jest.fn((req, res) => res.status(200).json({})),
  deleteDevice: jest.fn((req, res) => res.status(204).end()),
}));
*/

const app = express();
app.use(express.json());
app.use('/devices', deviceRouter);

describe('POST /devices/control', () => {
  it('should succeed with valid payload', async () => {
    const res = await request(app)
      .post('/devices/control')
      .send({ macAddress: 'E4:5F:01:08:18:C8', action: 'activer' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      macAddress: 'E4:5F:01:08:18:C8',
      action: 'activer'
    });
  });

  it('should fail if macAddress is missing', async () => {
    const res = await request(app)
      .post('/devices/control')
      .send({ action: 'activer' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'macAddress is required');
  });

  it('should fail if action is missing', async () => {
    const res = await request(app)
      .post('/devices/control')
      .send({ macAddress: 'AA:BB:CC:DD:EE:FF' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'action is required');
  });

  it('should fail if action is invalid', async () => {
    const res = await request(app)
      .post('/devices/control')
      .send({ macAddress: 'AA:BB:CC:DD:EE:FF', action: 'invalid_action' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid action');
  });

  it('should handle controller errors gracefully', async () => {
    // Temporarily override mock to throw
    const { controlDevice } = require('../controllers/deviceController');
    controlDevice.mockImplementationOnce(async (_req: any, res: any) => {
      throw new Error('Unexpected error');
    });
    const res = await request(app)
      .post('/devices/control')
      .send({ macAddress: 'AA:BB:CC:DD:EE:FF', action: 'activer' });
    // Express error handler may return 500 or custom error
    expect([500, 400]).toContain(res.status);
  });
});