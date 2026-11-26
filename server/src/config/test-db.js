import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in server/.env file');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB Connected Successfully!');
    console.log('Database Name:', mongoose.connection.db.databaseName);

    const result = await mongoose.connection.db.admin().ping();
    console.log('Ping Result:', result);
    console.log('Database connection test passed!');
  } catch (error) {
    console.error('Connection Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
