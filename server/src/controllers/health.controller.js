import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getHealth(_req, res) {
  const readyState = mongoose.connection.readyState;
  return sendSuccess(res, {
    status: 'ok',
    db: DB_STATES[readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
