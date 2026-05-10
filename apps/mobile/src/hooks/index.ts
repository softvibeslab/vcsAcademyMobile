/**
 * Custom Hooks - Index
 * Centralized exports for all custom hooks
 */

export { default as useTheme } from './useTheme';
export { default as useAuth } from './useAuth';
export type { User, UserRole, LoginCredentials, AuthState } from './useAuth';

export { default as useApi, useFetch, useMutation } from './useApi';
export type { ApiOptions, ApiState } from './useApi';

// Additional hooks can be added here as they are created
// export { default as useDebounce } from './useDebounce';
// export { default as useLocalStorage } from './useLocalStorage';
// export { default as useAsyncStorage } from './useAsyncStorage';