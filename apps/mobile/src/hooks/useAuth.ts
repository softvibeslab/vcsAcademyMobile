/**
 * Custom Hook - useAuth
 * Authentication management with secure token storage
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Theme from '../constants/theme';

const SESSION_KEY = 'vcsa_token';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';

export type UserRole = 'visitor' | 'sales_rep' | 'trainer' | 'coach' | 'manager' | 'to_manager' | 'admin';

export interface User {
  id: string;
  email: string;
  display_name: string;
  roles: UserRole[];
  permissions?: string[];
  team_id?: string;
  status: string;
}

export interface AuthState {
  token: string;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    token: '',
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Save token securely
  const saveToken = useCallback(async (token: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(SESSION_KEY, token);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, token);
    }
  }, []);

  // Get token from secure storage
  const getToken = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(SESSION_KEY) || '';
    }
    return (await SecureStore.getItemAsync(SESSION_KEY)) || '';
  }, []);

  // Remove token from secure storage
  const removeToken = useCallback(async () => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  }, []);

  // Load authentication state on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          // Fetch user data
          const response = await fetch(`${API_BASE}/api/mobile/me`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            setAuthState({
              token,
              user: payload.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Token invalid, clear it
            await removeToken();
            setAuthState({
              token: '',
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setAuthState({
          token: '',
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load authentication',
        });
      }
    };

    loadAuth();
  }, [getToken, removeToken]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || 'Login failed');
      }

      const { token, user } = payload.data;
      await saveToken(token);

      setAuthState({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState({
        token: '',
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  }, [saveToken]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (authState.token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authState.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await removeToken();
      setAuthState({
        token: '',
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [authState.token, removeToken]);

  // Update user data
  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }));
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;

    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => authState.user?.roles.includes(r));
  }, [authState.user]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    return authState.user?.permissions?.includes(permission) || false;
  }, [authState.user]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authState.token) return;

    try {
      const response = await fetch(`${API_BASE}/api/mobile/me`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        setAuthState(prev => ({
          ...prev,
          user: payload.data.user,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [authState.token]);

  return {
    ...authState,
    login,
    logout,
    updateUser,
    hasRole,
    hasPermission,
    refreshUser,
  };
};

export default useAuth;