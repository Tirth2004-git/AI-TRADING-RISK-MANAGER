import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(env.port, env.host, () => {
      console.log(`Server listening on http://${env.host}:${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
