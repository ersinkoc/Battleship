// Auth Middleware Tests

import { Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth } from '../../../src/middleware/auth.middleware';
import { AuthRequest } from '../../../src/types';
import * as jwtUtil from '../../../src/utils/jwt.util';

jest.mock('../../../src/utils/jwt.util');

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate with valid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request with no token', () => {
      mockRequest.headers = {};

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
      (jwtUtil.verifyToken as jest.Mock).mockReturnValue(null);

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token extraction errors', () => {
      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockImplementation(() => {
        throw new Error('Extraction error');
      });

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication error',
        error: 'Internal server error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token verification errors', () => {
      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('token');
      (jwtUtil.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Verification error');
      });

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication error',
        error: 'Internal server error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract user ID and email correctly', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-456',
        email: 'another@example.com',
      });

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user?.id).toBe('user-456');
      expect(mockRequest.user?.email).toBe('another@example.com');
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate with valid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (jwtUtil.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication if no token', () => {
      mockRequest.headers = {};

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication if token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
      (jwtUtil.verifyToken as jest.Mock).mockReturnValue(null);

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockImplementation(() => {
        throw new Error('Extraction error');
      });

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should not block request on verification error', () => {
      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      (jwtUtil.extractTokenFromHeader as jest.Mock).mockReturnValue('token');
      (jwtUtil.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Verification error');
      });

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
