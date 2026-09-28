import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.routes.js';
import authRoutes from './routes/auth.routes.js';
import assetRoutes from './routes/asset.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import locationRoutes from './routes/location.routes.js';
import { errorHandler, ApiError } from './middlewares/errorHandler.js';
import { PingerService } from './services/pingerService.js';

export const createApp = () => {
  const app = express();

  // Cross-origin Resource Sharing
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // JSON Body Parser
  app.use(express.json());

  // Health check & keep-alive monitor
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      pinger: PingerService.getStats()
    });
  });

  // API Routes
  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/locations', locationRoutes);

  // 404 Route Handler
  app.use('*', (req, res, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint does not exist.'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
