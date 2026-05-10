/**
 * UI Component - Loading states
 * Various loading indicators for different contexts
 */

import React from 'react';
import { ActivityIndicator, DimensionValue, View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../constants/theme';

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullscreen?: boolean;
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  color = Theme.colors.primary.gold,
  fullscreen = false,
  text,
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return undefined;
    }
  };

  if (fullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={styles.fullscreenContent}>
          <ActivityIndicator size={getSize()} color={color} />
          {text && <Text style={styles.fullscreenText}>{text}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={getSize()} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

// Skeleton loader
export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  variant?: 'rectangular' | 'circular' | 'text';
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 40,
  variant = 'rectangular',
  style,
}) => {
  const getStyle = () => {
    const baseStyle: any = {
      backgroundColor: Theme.colors.overlay.light,
    };

    switch (variant) {
      case 'circular':
        baseStyle.width = typeof width === 'number' ? width : 40;
        baseStyle.height = typeof height === 'number' ? height : 40;
        baseStyle.borderRadius = baseStyle.width / 2;
        break;
      case 'text':
        baseStyle.width = width;
        baseStyle.height = 16;
        baseStyle.borderRadius = 4;
        break;
      default: // rectangular
        baseStyle.width = width;
        baseStyle.height = height;
        baseStyle.borderRadius = Theme.borderRadius.sm;
    }

    return [baseStyle, style];
  };

  return <View style={getStyle()} />;
};

// Shimmer effect
export const Shimmer: React.FC<{ width?: DimensionValue; height?: number }> = ({
  width = '100%',
  height = 100,
}) => (
  <View style={[styles.shimmerContainer, { width, height }]}>
    <View style={styles.shimmerEffect} />
  </View>
);

// Skeleton card
export const SkeletonCard: React.FC = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <Skeleton variant="circular" width={40} height={40} />
      <View style={styles.skeletonHeaderContent}>
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={14} />
      </View>
    </View>
    <View style={styles.skeletonContent}>
      <Skeleton variant="text" width="100%" height={16} />
      <Skeleton variant="text" width="80%" height={16} />
      <Skeleton variant="text" width="90%" height={16} />
    </View>
    <View style={styles.skeletonFooter}>
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </View>
  </View>
);

// Loading screen
export const LoadingScreen: React.FC<{ text?: string }> = ({
  text = 'Loading...',
}) => (
  <View style={styles.loadingScreenContainer}>
    <LinearGradient
      colors={[Theme.colors.primary.gold, Theme.colors.primary.goldLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.logoContainer}
    >
      <ActivityIndicator size="large" color={Theme.colors.text.inverse} />
    </LinearGradient>
    {text && <Text style={styles.loadingScreenText}>{text}</Text>}
  </View>
);

// Pulse loader
export const PulseLoader: React.FC<{ size?: number }> = ({ size = 20 }) => {
  // This would need animation library, simplified version
  return (
    <View style={[styles.pulseContainer, { width: size, height: size }]}>
      <View style={styles.pulseCore} />
    </View>
  );
};

// Dots loader
export const DotsLoader: React.FC<{ size?: number }> = ({ size = 8 }) => (
  <View style={styles.dotsContainer}>
    <View style={[styles.dot, { width: size, height: size }]} />
    <View style={[styles.dot, { width: size, height: size }]} />
    <View style={[styles.dot, { width: size, height: size }]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
  },

  text: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.sm,
  },

  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.overlay.strong,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Theme.zIndex.overlay,
  },

  fullscreenContent: {
    alignItems: 'center',
    gap: Theme.spacing.md,
  },

  fullscreenText: {
    ...Theme.typography.body,
    color: Theme.colors.text.primary,
  },

  shimmerContainer: {
    backgroundColor: Theme.colors.surface.inputLight,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },

  shimmerEffect: {
    flex: 1,
    backgroundColor: Theme.colors.overlay.light,
  },

  skeletonCard: {
    backgroundColor: Theme.colors.surface.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },

  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },

  skeletonHeaderContent: {
    flex: 1,
    gap: Theme.spacing.xs,
  },

  skeletonContent: {
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },

  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  loadingScreenContainer: {
    flex: 1,
    backgroundColor: Theme.colors.surface.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.lg,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingScreenText: {
    ...Theme.typography.body,
    color: Theme.colors.text.secondary,
  },

  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulseCore: {
    width: '100%',
    height: '100%',
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: 1000,
  },

  dotsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },

  dot: {
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: Theme.borderRadius.full,
  },
});

export default Loading;
