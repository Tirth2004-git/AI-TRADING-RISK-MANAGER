import env from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export default function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation error';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.code === 11000) {
    statusCode = 409;
    const fields = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    message = `Duplicate value for ${fields}`;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  if (env.nodeEnv !== 'test' && statusCode >= 500) {
    console.error(err);
  }

  return sendError(res, message, statusCode, details);
}
