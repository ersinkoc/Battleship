// Authentication controllers for HTTP routes

import { Response } from 'express';
import { AuthRequest, RegisterDTO, LoginDTO } from '../types';
import { authService } from '../services/auth.service';
import { validate, registerSchema, loginSchema } from '../utils/validation.util';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = validate<RegisterDTO>(registerSchema, req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
      return;
    }

    // Register user
    const result = await authService.register(validation.data!);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Register controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: 'Internal server error',
    });
  }
}

/**
 * Login a user
 * POST /api/auth/login
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = validate<LoginDTO>(loginSchema, req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
      return;
    }

    // Login user
    const result = await authService.login(validation.data!);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Login controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: 'Internal server error',
    });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const user = await authService.getUserById(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved',
      user,
    });
  } catch (error) {
    console.error('Get profile controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: 'Internal server error',
    });
  }
}

/**
 * Health check endpoint
 * GET /api/health
 */
export async function healthCheck(_req: AuthRequest, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
}
