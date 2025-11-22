// Socket connection event handlers

import { Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../types';
import { redisService } from '../../services/redis.service';

export function handleConnection(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  const user = socket.data.user;

  if (!user) {
    console.error('Socket connection without user data');
    socket.disconnect();
    return;
  }

  console.log(`🔌 User connected: ${user.email} (${socket.id})`);

  // Store socket mapping in Redis
  redisService.setSocketUser(socket.id, user.id, user.email);
  redisService.setUserSocket(user.id, socket.id);

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`🔌 User disconnected: ${user.email} (${socket.id})`);

    try {
      // Get user's room if they're in one
      const roomCode = await redisService.getUserRoom(user.id);

      if (roomCode) {
        // Leave the socket room
        socket.leave(roomCode);

        // Remove user from room in Redis
        await redisService.removeUserFromRoom(roomCode, user.id);
        await redisService.deleteUserRoom(user.id);

        // Notify other player
        socket.to(roomCode).emit('opponentLeft', {
          message: 'Your opponent has left the game',
        });

        // Check if room is empty and clean up
        const roomUsers = await redisService.getRoomUsers(roomCode);
        if (roomUsers.length === 0) {
          await redisService.deleteGameRoom(roomCode);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    } finally {
      // Always clean up socket mappings, even if room cleanup fails
      try {
        await redisService.deleteSocketUser(socket.id);
        await redisService.deleteUserSocket(user.id);
      } catch (cleanupError) {
        console.error('Error cleaning up socket mappings:', cleanupError);
      }
    }
  });

  // Send welcome message
  socket.emit('error', 'Connected to Voxel Battleship server!');
}
