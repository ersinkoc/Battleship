// Main server entry point

import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { setupSocketServer } from './socket';
import { databaseService } from './services/database.service';
import { redisService } from './services/redis.service';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

// Create HTTP server
const httpServer = http.createServer(app);

// Setup Socket.io
const io = setupSocketServer(httpServer);

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close HTTP server (stops accepting new connections)
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ HTTP server closed');

    // Close Socket.io connections
    io.close();
    console.log('✅ Socket.io server closed');

    // Disconnect from database
    await databaseService.disconnect();

    // Disconnect from Redis
    await redisService.disconnect();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
async function startServer() {
  try {
    // Wait for database connection
    let attempts = 0;
    while (!databaseService.getConnectionStatus() && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!databaseService.getConnectionStatus()) {
      throw new Error('Failed to connect to database');
    }

    // Wait for Redis connection
    attempts = 0;
    while (!redisService.getConnectionStatus() && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!redisService.getConnectionStatus()) {
      throw new Error('Failed to connect to Redis');
    }

    // Start listening
    httpServer.listen(PORT, () => {
      console.log('\n🚀 Voxel Battleship Server Started');
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🎮 Socket.io ready for connections`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\nPress Ctrl+C to stop\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
export { httpServer, io };
