// Socket Middleware Tests

import { Socket } from 'socket.io';
import { socketAuthMiddleware } from '../../../src/middleware/socket.middleware';
import * as jwtUtil from '../../../src/utils/jwt.util';
import { SocketData } from '../../../src/types';

jest.mock('../../../src/utils/jwt.util');

describe('Socket Auth Middleware', () => {
  let mockSocket: Partial<Socket<any, any, any, SocketData>>;
  let mockNext: jest.Mock<void, [err?: Error]>;

  const createMockSocket = (authData: any = {}) => {
    const socket: any = {
      id: 'socket-123',
      data: {} as SocketData,
    };

    Object.defineProperty(socket, 'handshake', {
      value: { auth: authData },
      writable: true,
      configurable: true,
    });

    return socket;
  };

  beforeEach(() => {
    mockSocket = createMockSocket({});
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('socketAuthMiddleware', () => {
    it('should authenticate socket with valid token', () => {
      mockSocket = createMockSocket({ token: 'valid-token' });

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
      mockSocket = createMockSocket({});

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext.mock.calls[0][0] as Error).message).toBe('Authentication token required');
    });

    it('should reject connection with invalid token', () => {
      mockSocket = createMockSocket({ token: 'invalid-token' });

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue(null);

      socketAuthMiddleware(
        mockSocket as Socket<any, any, any, SocketData>,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext.mock.calls[0][0] as Error).message).toBe('Invalid or expired token');
    });

    it('should handle token verification errors', () => {
      mockSocket = createMockSocket({ token: 'token' });

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
      mockSocket = createMockSocket({ token: 'valid-token' });

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
      mockSocket = createMockSocket({ token: 'valid-token' });

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
      mockSocket = createMockSocket({ token: 'valid-token' });

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
