/**
 * Design System - Theme Configuration
 * Main theme file that combines all design tokens
 */

import { TextStyle, ViewStyle } from 'react-native';
import Colors from './colors';
import Typography from './typography';
import Spacing from './spacing';

// Main theme object
export const Theme = {
  // Color palette
  colors: Colors,

  // Typography scale
  typography: Typography,

  // Spacing scale
  spacing: Spacing,

  // Border radius
  borderRadius: {
    sm: Spacing.radius.sm,
    md: Spacing.radius.md,
    lg: Spacing.radius.lg,
    xl: Spacing.radius.xl,
    full: Spacing.radius.full,
  },

  // Shadows
  shadows: {
    small: {
      shadowColor: Colors.shadow.light,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: Colors.shadow.medium,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: Colors.shadow.strong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    gold: {
      shadowColor: Colors.shadow.gold,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  // Animation durations
  animation: {
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
  },

  // Z-index scale
  zIndex: {
    base: 0,
    overlay: 100,
    modal: 200,
    popover: 300,
    tooltip: 400,
    notification: 500,
  },

  // Breakpoints
  breakpoints: {
    small: Spacing.screen.breakpoint.sm,
    medium: Spacing.screen.breakpoint.md,
    large: Spacing.screen.breakpoint.lg,
    xlarge: Spacing.screen.breakpoint.xl,
  },
} as const;

// Style presets
export const ThemePresets = {
  // Screen container
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.surface.background,
  } as ViewStyle,

  // Card container
  card: {
    backgroundColor: Theme.colors.surface.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.cardPadding,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  } as ViewStyle,

  // Input field
  input: {
    backgroundColor: Theme.colors.surface.input,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border.medium,
    color: Theme.colors.text.primary,
    fontSize: Theme.typography.body.fontSize,
    fontWeight: Theme.typography.body.fontWeight,
    minHeight: Theme.spacing.component.input.minHeight,
    paddingHorizontal: Theme.spacing.component.input.paddingHorizontal,
    paddingVertical: Theme.spacing.component.input.paddingVertical,
  } as ViewStyle,

  // Button primary
  buttonPrimary: {
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Theme.spacing.component.button.minHeight,
    paddingHorizontal: Theme.spacing.component.button.paddingHorizontal,
    paddingVertical: Theme.spacing.component.button.paddingVertical,
    gap: Theme.spacing.component.button.gap,
  } as ViewStyle,

  // Button secondary (ghost)
  buttonSecondary: {
    backgroundColor: Theme.colors.overlay.light,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Theme.spacing.component.button.minHeight,
    paddingHorizontal: Theme.spacing.component.button.paddingHorizontal,
    paddingVertical: Theme.spacing.component.button.paddingVertical,
    gap: Theme.spacing.component.button.gap,
    borderWidth: 1,
    borderColor: Theme.colors.border.medium,
  } as ViewStyle,

  // Metric display
  metricContainer: {
    backgroundColor: Theme.colors.surface.inputLight,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
  } as ViewStyle,

  // Text styles with colors
  text: {
    primary: {
      ...Theme.typography.body,
      color: Theme.colors.text.primary,
    } as TextStyle,
    secondary: {
      ...Theme.typography.body,
      color: Theme.colors.text.secondary,
    } as TextStyle,
    muted: {
      ...Theme.typography.body,
      color: Theme.colors.text.muted,
    } as TextStyle,
    error: {
      ...Theme.typography.body,
      color: Theme.colors.semantic.error.primary,
    } as TextStyle,
    success: {
      ...Theme.typography.body,
      color: Theme.colors.semantic.success.primary,
    } as TextStyle,
    heading: {
      ...Theme.typography.h2,
      color: Theme.colors.text.primary,
    } as TextStyle,
    label: {
      ...Theme.typography.label,
      color: Theme.colors.text.tertiary,
    } as TextStyle,
  },
} as const;

// Status utilities
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    completed: Theme.colors.status.completed,
    current: Theme.colors.status.current,
    locked: Theme.colors.status.locked,
    pending: Theme.colors.status.pending,
    approved: Theme.colors.status.approved,
    rejected: Theme.colors.status.rejected,
    needs_practice: Theme.colors.status.needsPractice,
  };
  return statusMap[status] || Theme.colors.status.locked;
};

export const getStatusStyle = (status: string) => {
  const color = getStatusColor(status);
  return {
    backgroundColor: color + '26', // 15% opacity
    color: color,
  };
};

// Platform-specific adjustments
export const getPlatformTheme = () => {
  // Add platform-specific theme overrides here
  return Theme;
};

export default Theme;