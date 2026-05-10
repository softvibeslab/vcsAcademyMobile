/**
 * UI Component - Error states
 * Reusable error state components with retry functionality
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react-native';
import { Text } from 'react-native';
import Button from './Button';
import Theme from '../../constants/theme';

export type ErrorType = 'network' | 'server' | 'unauthorized' | 'notFound' | 'generic';

export interface ErrorStateProps {
  error?: string | Error;
  type?: ErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  fullscreen?: boolean;
  style?: ViewStyle;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  type = 'generic',
  onRetry,
  onDismiss,
  fullscreen = false,
  style,
}) => {
  const getErrorContent = () => {
    const errorMap = {
      network: {
        icon: <WifiOff size={48} color={Theme.colors.semantic.error.primary} />,
        title: 'Network Error',
        message: 'Please check your internet connection and try again.',
      },
      server: {
        icon: <ServerCrash size={48} color={Theme.colors.semantic.error.primary} />,
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again.',
      },
      unauthorized: {
        icon: <ShieldAlert size={48} color={Theme.colors.semantic.error.primary} />,
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
      },
      notFound: {
        icon: <AlertCircle size={48} color={Theme.colors.semantic.error.primary} />,
        title: 'Not Found',
        message: 'The requested resource could not be found.',
      },
      generic: {
        icon: <AlertCircle size={48} color={Theme.colors.semantic.error.primary} />,
        title: 'Something went wrong',
        message: error?.toString() || 'An unexpected error occurred.',
      },
    };

    return errorMap[type];
  };

  const content = getErrorContent();

  if (fullscreen) {
    return (
      <View style={[styles.fullscreenContainer, style]}>
        <View style={styles.fullscreenContent}>
          {content.icon}
          <Text style={styles.fullscreenTitle}>{content.title}</Text>
          <Text style={styles.fullscreenMessage}>{content.message}</Text>

          <View style={styles.fullscreenActions}>
            {onRetry && (
              <Button
                title="Try Again"
                icon={<RefreshCw size={18} color={Theme.colors.text.inverse} />}
                onPress={onRetry}
              />
            )}
            {onDismiss && (
              <Button
                title="Dismiss"
                variant="ghost"
                onPress={onDismiss}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {content.icon}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
        </View>
      </View>

      {(onRetry || onDismiss) && (
        <View style={styles.actions}>
          {onRetry && (
            <Button
              title="Retry"
              size="small"
              icon={<RefreshCw size={16} color={Theme.colors.text.inverse} />}
              onPress={onRetry}
            />
          )}
          {onDismiss && (
            <Button
              title="Dismiss"
              variant="ghost"
              size="small"
              onPress={onDismiss}
            />
          )}
        </View>
      )}
    </View>
  );
};

// Inline error component
export const InlineError: React.FC<{
  error: string;
  onDismiss?: () => void;
}> = ({ error, onDismiss }) => (
  <View style={styles.inlineError}>
    <AlertCircle size={16} color={Theme.colors.semantic.error.primary} />
    <Text style={styles.inlineErrorText}>{error}</Text>
    {onDismiss && (
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Text style={styles.inlineErrorDismiss}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Toast error component
export const ToastError: React.FC<{
  error: string;
  visible: boolean;
  onDismiss: () => void;
}> = ({ error, visible, onDismiss }) => {
  if (!visible) return null;

  return (
    <View style={styles.toastError}>
      <AlertCircle size={20} color={Theme.colors.semantic.error.primary} />
      <Text style={styles.toastErrorText}>{error}</Text>
    </View>
  );
};

// Error boundary component
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <ErrorState
          error={this.state.error}
          type="generic"
          onRetry={this.retry}
          fullscreen
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.semantic.error.light,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.semantic.error.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  textContainer: {
    flex: 1,
    gap: Theme.spacing.xs,
  },

  title: {
    ...Theme.typography.h4,
    color: Theme.colors.semantic.error.primary,
  },

  message: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text.secondary,
  },

  actions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },

  fullscreenContainer: {
    flex: 1,
    backgroundColor: Theme.colors.surface.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },

  fullscreenContent: {
    alignItems: 'center',
    maxWidth: 400,
    gap: Theme.spacing.lg,
  },

  fullscreenTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.semantic.error.primary,
    textAlign: 'center',
  },

  fullscreenMessage: {
    ...Theme.typography.body,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },

  fullscreenActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    width: '100%',
    justifyContent: 'center',
  },

  inlineError: {
    backgroundColor: Theme.colors.semantic.error.light,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.semantic.error.medium,
    padding: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },

  inlineErrorText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.semantic.error.primary,
    flex: 1,
  },

  inlineErrorDismiss: {
    ...Theme.typography.caption,
    color: Theme.colors.semantic.error.primary,
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: Theme.spacing.micro,
  },

  toastError: {
    position: 'absolute',
    top: Theme.spacing.md,
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    backgroundColor: Theme.colors.semantic.error.light,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.semantic.error.medium,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    zIndex: Theme.zIndex.notification,
    ...Theme.shadows.medium,
  },

  toastErrorText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.semantic.error.primary,
    flex: 1,
  },
});

export default ErrorState;