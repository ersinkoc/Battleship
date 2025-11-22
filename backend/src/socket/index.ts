// Socket.io server setup

import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types';
import { socketAuthMiddleware } from '../middleware/socket.middleware';
import { handleConnection } from './handlers/connection.handler';
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom } from './handlers/room.handler';

export function setupSocketServer(httpServer: HTTPServer): Server {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', (socket) => {
    // Connection handler
    handleConnection(socket);

    // Room events
    socket.on('createRoom', () => handleCreateRoom(socket));
    socket.on('joinRoom', (roomCode) => handleJoinRoom(socket, roomCode));
    socket.on('leaveRoom', () => handleLeaveRoom(socket));

    // Additional game events will be added in Step 3
  });

  console.log('✅ Socket.io server configured');

  return io;
}
