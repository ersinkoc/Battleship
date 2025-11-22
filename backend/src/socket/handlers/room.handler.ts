// Room management event handlers

import { Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../types';
import { redisService } from '../../services/redis.service';

/**
 * Generate a random 6-character room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Handle room creation
 */
export async function handleCreateRoom(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<void> {
  const user = socket.data.user;

  if (!user) {
    socket.emit('error', 'User not authenticated');
    return;
  }

  try {
    // Check if user is already in a room
    const existingRoom = await redisService.getUserRoom(user.id);
    if (existingRoom) {
      socket.emit('error', 'You are already in a room');
      return;
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (await redisService.roomExists(roomCode) && attempts < 10) {
      roomCode = generateRoomCode();
      attempts++;
    }

    if (attempts >= 10) {
      socket.emit('error', 'Failed to generate unique room code');
      return;
    }

    // Create room in Redis
    await redisService.createGameRoom(roomCode, user.id);

    // Join socket room
    socket.join(roomCode);

    // Store user-room mapping
    await redisService.setUserRoom(user.id, roomCode);
    await redisService.addUserToRoom(roomCode, user.id);

    // Store room code in socket data
    socket.data.roomCode = roomCode;

    console.log(`🏠 Room created: ${roomCode} by ${user.email}`);

    // Notify user
    socket.emit('roomCreated', roomCode);
  } catch (error) {
    console.error('Error creating room:', error);
    socket.emit('error', 'Failed to create room');
  }
}

/**
 * Handle room joining
 */
export async function handleJoinRoom(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomCode: string
): Promise<void> {
  const user = socket.data.user;

  if (!user) {
    socket.emit('error', 'User not authenticated');
    return;
  }

  try {
    // Validate room code format
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      socket.emit('error', 'Invalid room code format');
      return;
    }

    // Check if user is already in a room
    const existingRoom = await redisService.getUserRoom(user.id);
    if (existingRoom) {
      socket.emit('error', 'You are already in a room');
      return;
    }

    // Check if room exists
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Check if room is full
    if (room.player2Id) {
      socket.emit('error', 'Room is full');
      return;
    }

    // Check if user is trying to join their own room
    if (room.player1Id === user.id) {
      socket.emit('error', 'Cannot join your own room');
      return;
    }

    // Add player 2 to room
    room.player2Id = user.id;
    room.status = 'setup';
    await redisService.updateGameRoom(roomCode, room);

    // Join socket room
    socket.join(roomCode);

    // Store user-room mapping
    await redisService.setUserRoom(user.id, roomCode);
    await redisService.addUserToRoom(roomCode, user.id);

    // Store room code in socket data
    socket.data.roomCode = roomCode;

    console.log(`🚪 ${user.email} joined room: ${roomCode}`);

    // Notify both players
    socket.to(roomCode).emit('playerJoined', {
      playerId: user.id,
      email: user.email,
    });

    socket.emit('gameStarted', {
      message: 'Game is ready to start!',
    });

    socket.to(roomCode).emit('gameStarted', {
      message: 'Opponent joined! Game is ready to start!',
    });
  } catch (error) {
    console.error('Error joining room:', error);
    socket.emit('error', 'Failed to join room');
  }
}

/**
 * Handle leaving room
 */
export async function handleLeaveRoom(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<void> {
  const user = socket.data.user;

  if (!user) {
    socket.emit('error', 'User not authenticated');
    return;
  }

  try {
    const roomCode = await redisService.getUserRoom(user.id);

    if (!roomCode) {
      socket.emit('error', 'You are not in a room');
      return;
    }

    // Leave socket room
    socket.leave(roomCode);

    // Remove from Redis
    await redisService.removeUserFromRoom(roomCode, user.id);
    await redisService.deleteUserRoom(user.id);

    // Remove room code from socket data
    delete socket.data.roomCode;

    console.log(`🚪 ${user.email} left room: ${roomCode}`);

    // Notify other players
    socket.to(roomCode).emit('opponentLeft', {
      message: 'Your opponent has left the game',
    });

    // Check if room is empty and clean up
    const roomUsers = await redisService.getRoomUsers(roomCode);
    if (roomUsers.length === 0) {
      await redisService.deleteGameRoom(roomCode);
      console.log(`🗑️  Room deleted: ${roomCode}`);
    }
  } catch (error) {
    console.error('Error leaving room:', error);
    socket.emit('error', 'Failed to leave room');
  }
}
