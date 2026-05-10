/**
 * UI Component - Button
 * Accessible, animated button component with variants
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../constants/theme';

// Button variants
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onPress?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onPress,
  style,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      opacity: disabled || loading ? 0.6 : 1,
    };

    // Size variants
    switch (size) {
      case 'small':
        baseStyle.minHeight = 36;
        baseStyle.paddingHorizontal = 14;
        break;
      case 'large':
        baseStyle.minHeight = 56;
        baseStyle.paddingHorizontal = 24;
        break;
      default: // medium
        baseStyle.minHeight = 44;
        baseStyle.paddingHorizontal = 18;
    }

    // Width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return { ...styles.text, ...styles.textSmall };
      case 'large':
        return { ...styles.text, ...styles.textLarge };
      default:
        return styles.text;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' || variant === 'ghost' ? Theme.colors.primary.gold : Theme.colors.text.inverse}
          />
          <Text style={getTextStyle()}>{title}</Text>
        </>
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && <View style={styles.icon}>{icon}</View>}
        <Text style={getTextStyle()}>{title}</Text>
        {icon && iconPosition === 'right' && <View style={styles.icon}>{icon}</View>}
      </>
    );
  };

  const renderButton = () => {
    const buttonStyle = getButtonStyle();
    const gradientColors: [string, string] = disabled || loading
      ? [Theme.colors.primary.goldDark, Theme.colors.primary.gold]
      : [Theme.colors.primary.gold, Theme.colors.primary.goldLight];
    const content = renderContent();
    const touchableProps = {
      ...rest,
      onPress,
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      disabled: disabled || loading,
      activeOpacity: 0.78,
      accessibilityRole: 'button' as const,
      accessibilityState: { disabled: disabled || loading },
      accessibilityLabel: title,
    };

    switch (variant) {
      case 'primary':
        return (
          <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
            <TouchableOpacity {...touchableProps} style={fullWidth ? { width: '100%' } : undefined}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[buttonStyle, style]}
              >
                {content}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'secondary':
      case 'ghost':
        return (
          <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
            <TouchableOpacity
              {...touchableProps}
              style={[
                buttonStyle,
                variant === 'secondary' ? styles.secondaryButton : styles.ghostButton,
                style,
              ]}
            >
              {content}
            </TouchableOpacity>
          </Animated.View>
        );

      case 'danger':
        return (
          <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
            <TouchableOpacity
              {...touchableProps}
              style={[buttonStyle, styles.dangerButton, style]}
            >
              {content}
            </TouchableOpacity>
          </Animated.View>
        );

      case 'success':
        return (
          <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
            <TouchableOpacity
              {...touchableProps}
              style={[buttonStyle, styles.successButton, style]}
            >
              {content}
            </TouchableOpacity>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return renderButton();
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.buttonPadding,
    paddingVertical: 12,
    ...Theme.shadows.gold,
  },

  text: {
    ...Theme.typography.button,
    color: Theme.colors.text.inverse,
    textAlign: 'center',
  },

  textSmall: {
    ...Theme.typography.buttonSmall,
  },

  textLarge: {
    ...Theme.typography.buttonLarge,
  },

  secondaryButton: {
    backgroundColor: Theme.colors.surface.cardLight,
    borderWidth: 1,
    borderColor: Theme.colors.border.gold,
  },

  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.border.medium,
  },

  dangerButton: {
    backgroundColor: Theme.colors.semantic.error.light,
    borderWidth: 1,
    borderColor: Theme.colors.semantic.error.medium,
  },

  successButton: {
    backgroundColor: Theme.colors.semantic.success.light,
    borderWidth: 1,
    borderColor: Theme.colors.semantic.success.medium,
  },

  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
