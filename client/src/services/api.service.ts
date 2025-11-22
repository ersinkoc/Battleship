// API service for HTTP requests

import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

class ApiService {
  private token: string | null = null;

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('battleship_token', token);
  }

  /**
   * Get authentication token
   */
  public getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('battleship_token');
    }
    return this.token;
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('battleship_token');
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Request failed',
      }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  /**
   * Register a new user
   */
  public async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Login user
   */
  public async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Get current user profile
   */
  public async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/auth/me', {
      method: 'GET',
    });
  }

  /**
   * Check server health
   */
  public async checkHealth(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/health', {
      method: 'GET',
    });
  }

  /**
   * Logout user
   */
  public logout(): void {
    this.clearToken();
  }
}

// Export singleton instance
export const apiService = new ApiService();
