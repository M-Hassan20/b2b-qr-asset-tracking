import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.routes.js';
import authRoutes from './routes/auth.routes.js';
import assetRoutes from './routes/asset.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import locationRoutes from './routes/location.routes.js';
import { errorHandler, ApiError } from './middlewares/errorHandler.js';

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

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/locations', locationRoutes);

  // 404 Route Handler
  app.use('*', (req, res, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'Endpoint does not exist.'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
