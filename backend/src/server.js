import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  try {
    await connectDB();
    const app = createApp();
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0';

    app.listen(PORT, HOST, () => {
      console.log(`=========================================`);
      console.log(`  Vision71 B2B Asset Tracking API Server  `);
      console.log(`  Local:   http://localhost:${PORT}       `);
      console.log(`  Network: http://0.0.0.0:${PORT}         `);
      console.log(`  Env:     ${process.env.NODE_ENV || 'development'}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
