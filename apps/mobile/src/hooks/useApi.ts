/**
 * Custom Hook - useApi
 * API communication with error handling and loading states
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './useAuth';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
const SESSION_KEY = 'vcsa_token';

export interface ApiOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
}

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Get token from storage
  const getToken = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(SESSION_KEY) || '';
    }
    return (await SecureStore.getItemAsync(SESSION_KEY)) || '';
  }, []);

  // Make API request
  const request = useCallback(async <T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> => {
    const {
      token,
      skipAuth = false,
      headers = {},
      ...restOptions
    } = options;

    // Show loading state
    setLoading(true);
    setError(null);

    try {
      // Get auth token if not provided
      const authToken = token || (skipAuth ? '' : await getToken());

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(headers as Record<string, string>),
      };

      // Add auth header if not skipping auth
      if (!skipAuth && authToken) {
        requestHeaders.Authorization = `Bearer ${authToken}`;
      }

      // Create abort controller for this request
      const controller = new AbortController();
      const requestId = `${endpoint}_${Date.now()}`;
      abortControllersRef.current.set(requestId, controller);

      // Make request
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...restOptions,
        headers: requestHeaders,
        signal: controller.signal,
      });

      // Clean up abort controller
      abortControllersRef.current.delete(requestId);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        await logout();
        throw new Error('Session expired. Please login again.');
      }

      // Parse response
      const payload = await response.json();

      // Handle error responses
      if (!response.ok) {
        throw new Error(payload.detail || payload.error?.message || 'Request failed');
      }

      return payload.data as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken, logout]);

  // GET request
  const get = useCallback(<T = any>(
    endpoint: string,
    options?: Omit<ApiOptions, 'method'>
  ): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'GET' });
  }, [request]);

  // POST request
  const post = useCallback(<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [request]);

  // PUT request
  const put = useCallback(<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [request]);

  // PATCH request
  const patch = useCallback(<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [request]);

  // DELETE request
  const del = useCallback(<T = any>(
    endpoint: string,
    options?: Omit<ApiOptions, 'method'>
  ): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  }, [request]);

  // Cancel all pending requests
  const cancelAllRequests = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      controller.abort();
    });
    abortControllersRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllRequests();
    };
  }, [cancelAllRequests]);

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    cancelAllRequests,
  };
};

// Hook for fetching data
export const useFetch = <T = any>(
  endpoint: string,
  options?: ApiOptions & {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const { request } = useApi();
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await request<T>(endpoint, options);
      if (isMountedRef.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'An error occurred',
        });
      }
    }
  }, [endpoint, request, options]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  // Initial fetch and interval
  useEffect(() => {
    if (options?.enabled === false) return;

    fetchData();

    if (options?.refetchInterval) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.enabled, options?.refetchInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refetch,
  };
};

// Hook for mutations
export const useMutation = <T = any, P = any>(
  mutationFn: (variables: P) => Promise<T>
) => {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (variables: P): Promise<T> => {
    setState({ data: null, loading: true, error: null });

    try {
      const data = await mutationFn(variables);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Mutation failed',
      });
      throw err;
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
};

export default useApi;
