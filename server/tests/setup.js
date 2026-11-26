import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB(env.mongodbTestUri);
});

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectDB();
});
