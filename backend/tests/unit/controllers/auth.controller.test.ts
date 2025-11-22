// Auth Controller Tests

import { Response } from 'express';
import { register, login, getProfile, healthCheck } from '../../../src/controllers/auth.controller';
import { AuthRequest } from '../../../src/types';
import { authService } from '../../../src/services/auth.service';
import * as validationUtil from '../../../src/utils/validation.util';

jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/utils/validation.util');

describe('Auth Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockRequest.body = registerData;

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: true,
        data: registerData,
      });

      (authService.register as jest.Mock).mockResolvedValue({
        success: true,
        message: 'User registered successfully',
        token: 'jwt-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      await register(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'jwt-token',
        })
      );
    });

    it('should return 400 on validation failure', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'weak',
      };

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: false,
        errors: ['Invalid email', 'Password too weak'],
      });

      await register(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Invalid email', 'Password too weak'],
      });
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'Password123',
      };

      mockRequest.body = registerData;

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: true,
        data: registerData,
      });

      (authService.register as jest.Mock).mockResolvedValue({
        success: false,
        message: 'User with this email already exists',
      });

      await register(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
      });
    });

    it('should handle internal server errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (validationUtil.validate as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await register(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Registration failed',
        error: 'Internal server error',
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockRequest.body = loginData;

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: true,
        data: loginData,
      });

      (authService.login as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Login successful',
        token: 'jwt-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      await login(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'jwt-token',
        })
      );
    });

    it('should return 400 on validation failure', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: '',
      };

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: false,
        errors: ['Invalid email', 'Password is required'],
      });

      await login(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Invalid email', 'Password is required'],
      });
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should return 401 on invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      mockRequest.body = loginData;

      (validationUtil.validate as jest.Mock).mockReturnValue({
        success: true,
        data: loginData,
      });

      (authService.login as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Invalid email or password',
      });

      await login(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should handle internal server errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (validationUtil.validate as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await login(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Login failed',
        error: 'Internal server error',
      });
    });
  });

  describe('getProfile', () => {
    it('should retrieve user profile successfully', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        gamesPlayed: 10,
        gamesWon: 6,
        gamesLost: 4,
        totalShots: 100,
        totalHits: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved',
        user: mockUser,
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
      expect(authService.getUserById).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      mockRequest.user = {
        id: 'nonexistent-user',
        email: 'test@example.com',
      };

      (authService.getUserById as jest.Mock).mockResolvedValue(null);

      await getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should handle internal server errors', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (authService.getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve profile',
        error: 'Internal server error',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return 200 with health status', async () => {
      await healthCheck(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Server is running',
        timestamp: expect.any(String),
      });
    });

    it('should include ISO timestamp', async () => {
      await healthCheck(mockRequest as AuthRequest, mockResponse as Response);

      const call = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });
  });
});
