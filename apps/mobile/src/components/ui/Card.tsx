/**
 * UI Component - Card
 * Versatile card component with variants and elevation levels
 */

import React, { useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  Animated,
} from 'react-native';
import Theme from '../../constants/theme';

// Card variants
type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
type CardElevation = 'none' | 'small' | 'medium' | 'large';
type CardPadding = 'none' | 'small' | 'medium' | 'large';

export interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: CardPadding;
  borderRadius?: number;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  elevation = 'none',
  padding = 'medium',
  borderRadius = Theme.borderRadius.md,
  fullWidth = false,
  onPress,
  style,
  testID,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.card,
      borderRadius,
    };

    // Variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.backgroundColor = Theme.colors.surface.elevated;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Theme.colors.border.goldLight;
        break;
      case 'outlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Theme.colors.border.medium;
        break;
      case 'filled':
        baseStyle.backgroundColor = Theme.colors.surface.cardLight;
        baseStyle.borderWidth = 0;
        break;
      default: // default
        baseStyle.backgroundColor = Theme.colors.surface.card;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Theme.colors.border.light;
    }

    // Elevation styles
    switch (elevation) {
      case 'small':
        Object.assign(baseStyle, Theme.shadows.small);
        break;
      case 'medium':
        Object.assign(baseStyle, Theme.shadows.medium);
        break;
      case 'large':
        Object.assign(baseStyle, Theme.shadows.large);
        break;
      default: // none
        break;
    }

    // Padding
    switch (padding) {
      case 'none':
        baseStyle.padding = 0;
        break;
      case 'small':
        baseStyle.padding = Theme.spacing.sm;
        break;
      case 'large':
        baseStyle.padding = Theme.spacing.lg;
        break;
      default: // medium
        baseStyle.padding = Theme.spacing.md;
    }

    // Width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const cardContent = (
    <Animated.View
      style={[
        getCardStyle(),
        onPress && { transform: [{ scale: scaleAnim }] },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        {...rest}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        style={fullWidth ? { width: '100%' } : undefined}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

// Card subcomponents
export const CardHeader: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
}) => (
  <View style={styles.header}>
    {icon && <View style={styles.headerIcon}>{icon}</View>}
    <View style={styles.headerContent}>
      <View style={styles.headerTitleRow}>
        {icon && <View style={styles.headerIconPlaceholder} />}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  </View>
);

export const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.content}>{children}</View>
);

export const CardActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.actions}>{children}</View>
);

export const CardMetric: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, icon, trend }) => (
  <View style={styles.metricContainer}>
    <View style={styles.metricHeader}>
      {icon && <View style={styles.metricIcon}>{icon}</View>}
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    {trend && (
      <View style={[styles.metricTrend, metricTrendStyles[trend]]}>
        <Text style={styles.metricTrendText}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </Text>
      </View>
    )}
  </View>
);

const metricTrendStyles = {
  up: {
    backgroundColor: Theme.colors.semantic.success.light,
  },
  down: {
    backgroundColor: Theme.colors.semantic.error.light,
  },
  neutral: {
    backgroundColor: Theme.colors.overlay.light,
  },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface.card,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },

  header: {
    marginBottom: Theme.spacing.md,
  },

  headerIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
  },

  headerIconPlaceholder: {
    width: 32,
  },

  headerContent: {
    flex: 1,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.primary.gold,
    marginBottom: Theme.spacing.micro,
  },

  headerSubtitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text.secondary,
  },

  content: {
    flex: 1,
  },

  actions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },

  metricContainer: {
    backgroundColor: Theme.colors.surface.inputLight,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
    flex: 1,
  },

  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },

  metricIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  metricValue: {
    ...Theme.typography.metric,
    color: Theme.colors.primary.goldLight,
    marginTop: Theme.spacing.xs,
  },

  metricTrend: {
    alignSelf: 'flex-start',
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: Theme.spacing.micro,
    borderRadius: Theme.borderRadius.sm,
  },

  metricTrendText: {
    ...Theme.typography.captionStrong,
    fontSize: 10,
  },
});

export default Card;
