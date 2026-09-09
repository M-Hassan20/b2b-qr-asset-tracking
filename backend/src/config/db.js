import dns from 'node:dns';
import mongoose from 'mongoose';

// Only override DNS servers if running locally or explicitly requested via USE_CUSTOM_DNS
if (process.env.USE_CUSTOM_DNS === 'true') {
  dns.setServers([
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1',
    '1.0.0.1'
  ]);
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect: ${error.message}`);
    process.exit(1);
  }
};
