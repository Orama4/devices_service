import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Store original res.send
  const originalSend = res.send;

  // Intercept res.send to capture response body
  res.send = function (body?: any): Response {
    const duration = Date.now() - start;

    const logPayload = {

      message: `${req.method} ${req.originalUrl} called`,
      service: 'devices_service',
      method: req.method,
      endpoint: req.originalUrl,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      statusCode: res.statusCode,
      response: typeof body === 'object' ? body : String(body),
      timestamp: new Date().toISOString(),
      durationMs: duration
    };

    axios.post('http://localhost:8888/log', logPayload).catch((error) => {
      console.error(
        'Failed to send log to log service:',
        axios.isAxiosError(error) ? error.message : (error as Error).message
      );
    });

    return originalSend.call(this, body);
  };

  next();
};
