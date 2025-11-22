// Socket.io authentication middleware

import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.util';
import { SocketData } from '../types';

/**
 * Socket.io middleware to authenticate connections
 * Expects token in handshake auth: { token: 'jwt_token' }
 */
export function socketAuthMiddleware(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
): void {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    // Attach user data to socket
    socket.data.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    console.log(`✅ Socket authenticated: ${decoded.email} (${socket.id})`);
    next();
  } catch (error) {
    console.error('Socket auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
}
