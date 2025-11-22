// Socket Middleware Tests

import { Socket } from 'socket.io';
import { socketAuthMiddleware } from '../../../src/middleware/socket.middleware';
import * as jwtUtil from '../../../src/utils/jwt.util';
import { SocketData } from '../../../src/types';

jest.mock('../../../src/utils/jwt.util');

describe('Socket Auth Middleware', () => {
  let mockSocket: Partial<Socket<any, any, any, SocketData>>;
  let mockNext: jest.Mock<void, [err?: Error]>;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
      } as any,
      data: {} as SocketData,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('socketAuthMiddleware', () => {
    it('should authenticate socket with valid token', () => {
      mockSocket.handshake = {
        auth: { token: 'valid-token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockSocket.data?.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject connection with no token', () => {
      mockSocket.handshake = {
        auth: {},
      } as any;

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext.mock.calls[0][0] as Error).message).toBe('Authentication token required');
    });

    it('should reject connection with invalid token', () => {
      mockSocket.handshake = {
        auth: { token: 'invalid-token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue(null);

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext.mock.calls[0][0] as Error).message).toBe('Invalid or expired token');
    });

    it('should handle token verification errors', () => {
      mockSocket.handshake = {
        auth: { token: 'token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Verification error');
      });

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext.mock.calls[0][0] as Error).message).toBe('Authentication failed');
    });

    it('should extract user ID and email correctly', () => {
      mockSocket.handshake = {
        auth: { token: 'valid-token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-456',
        email: 'another@example.com',
      });

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockSocket.data?.user?.id).toBe('user-456');
      expect(mockSocket.data?.user?.email).toBe('another@example.com');
    });

    it('should call next without error on success', () => {
      mockSocket.handshake = {
        auth: { token: 'valid-token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should attach user data to socket.data', () => {
      mockSocket.handshake = {
        auth: { token: 'valid-token' },
      } as any;

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockSocket.data).toBeDefined();
      expect(mockSocket.data?.user).toBeDefined();
      expect(mockSocket.data?.user?.id).toBe('user-123');
      expect(mockSocket.data?.user?.email).toBe('test@example.com');
    });
  });
});
