/**
 * UI Component - Input
 * Accessible text input with validation and error states
 */

import React, { useRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import Theme from '../../constants/theme';

// Input variants
type InputVariant = 'default' | 'outlined' | 'filled';
type InputSize = 'small' | 'medium' | 'large';
type InputStatus = 'default' | 'error' | 'success' | 'warning';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
  size?: InputSize;
  status?: InputStatus;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'medium',
  status = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  testID,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...styles.input,
    };

    // Size variants
    switch (size) {
      case 'small':
        baseStyle.minHeight = 36;
        baseStyle.fontSize = Theme.typography.bodySmall.fontSize;
        baseStyle.paddingHorizontal = Theme.spacing.sm;
        break;
      case 'large':
        baseStyle.minHeight = 56;
        baseStyle.fontSize = Theme.typography.bodyLarge.fontSize;
        baseStyle.paddingHorizontal = Theme.spacing.lg;
        break;
      default: // medium
        baseStyle.minHeight = 46;
        baseStyle.fontSize = Theme.typography.body.fontSize;
        baseStyle.paddingHorizontal = Theme.spacing.md;
    }

    // Variant styles
    switch (variant) {
      case 'outlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        break;
      case 'filled':
        baseStyle.backgroundColor = Theme.colors.surface.inputLight;
        baseStyle.borderWidth = 0;
        break;
      default: // default
        baseStyle.backgroundColor = Theme.colors.surface.input;
        baseStyle.borderWidth = 1;
    }

    // Status colors
    if (error || status === 'error') {
      baseStyle.borderColor = Theme.colors.semantic.error.primary;
      baseStyle.borderWidth = 1;
    } else if (status === 'success') {
      baseStyle.borderColor = Theme.colors.semantic.success.primary;
      baseStyle.borderWidth = 1;
    } else if (status === 'warning') {
      baseStyle.borderColor = Theme.colors.semantic.warning.primary;
      baseStyle.borderWidth = 1;
    } else if (isFocused) {
      baseStyle.borderColor = Theme.colors.primary.gold;
      baseStyle.borderWidth = 1;
    } else {
      baseStyle.borderColor = Theme.colors.border.medium;
    }

    // Padding for icons
    if (leftIcon) {
      baseStyle.paddingLeft = 40;
    }
    if (rightIcon) {
      baseStyle.paddingRight = 40;
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {label && (
        <Text
          style={[
            styles.label,
            (error || status === 'error') && styles.labelError,
          ]}
        >
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={inputRef}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[getInputStyle(), inputStyle]}
          placeholderTextColor={Theme.colors.text.disabled}
          selectionColor={Theme.colors.primary.gold}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {!error && helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

// TextArea component
export const TextArea: React.FC<InputProps> = ({
  size = 'medium',
  numberOfLines = 4,
  ...rest
}) => (
  <Input
    {...rest}
    multiline
    numberOfLines={numberOfLines}
    textAlignVertical="top"
    inputStyle={{ minHeight: numberOfLines * 24 + 24 }}
  />
);

// SearchInput component
export const SearchInput: React.FC<Omit<InputProps, 'leftIcon'> & {
  onClear?: () => void;
}> = ({
  value = '',
  onClear,
  ...rest
}) => (
  <Input
    {...rest}
    value={value}
    leftIcon={<Search size={18} color={Theme.colors.text.secondary} />}
    rightIcon={
      value ? (
        <TouchableOpacity onPress={onClear} activeOpacity={0.7}>
          <X size={18} color={Theme.colors.text.secondary} />
        </TouchableOpacity>
      ) : null
    }
  />
);

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },

  label: {
    ...Theme.typography.label,
    color: Theme.colors.text.tertiary,
    marginBottom: Theme.spacing.sm,
  },

  labelError: {
    color: Theme.colors.semantic.error.primary,
  },

  inputContainer: {
    position: 'relative',
  },

  input: {
    backgroundColor: Theme.colors.surface.input,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border.medium,
    color: Theme.colors.text.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },

  leftIcon: {
    position: 'absolute',
    left: Theme.spacing.sm,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightIcon: {
    position: 'absolute',
    right: Theme.spacing.sm,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    ...Theme.typography.caption,
    color: Theme.colors.semantic.error.primary,
    marginTop: Theme.spacing.xs,
  },

  helperText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.muted,
    marginTop: Theme.spacing.xs,
  },
});

export default Input;
