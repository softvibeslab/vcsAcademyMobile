/**
 * Design System - Typography
 * Consistent type scale for mobile-first design
 */

import { TextStyle } from 'react-native';

export const Typography = {
  // Display typography
  display: {
    fontSize: 42,
    fontWeight: '900' as const,
    lineHeight: 48,
    letterSpacing: 0,
  },

  displayLarge: {
    fontSize: 52,
    fontWeight: '900' as const,
    lineHeight: 58,
    letterSpacing: 0,
  },

  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '900' as const,
    lineHeight: 38,
    letterSpacing: 0,
  },

  h2: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  h4: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },

  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },

  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },

  // UI text
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },

  captionStrong: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },

  overline: {
    fontSize: 11,
    fontWeight: '800' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },

  // Button text
  button: {
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  buttonLarge: {
    fontSize: 18,
    fontWeight: '900' as const,
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  buttonSmall: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
  },

  // Label text
  label: {
    fontSize: 13,
    fontWeight: '800' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },

  labelLarge: {
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Code text
  code: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
    fontFamily: 'monospace' as const,
  },

  // Special typography
  agent: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  metric: {
    fontSize: 28,
    fontWeight: '900' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  metricLarge: {
    fontSize: 42,
    fontWeight: '900' as const,
    lineHeight: 48,
    letterSpacing: 0,
  },

  // Helper text
  hint: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },

  error: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
} as const;

// Typography utilities
export const TypographyUtils = {
  // Create text style with color
  withColor: (style: TextStyle, color: string): TextStyle => ({
    ...style,
    color,
  }),

  // Create text style with custom font size
  withSize: (style: TextStyle, size: number): TextStyle => ({
    ...style,
    fontSize: size,
  }),

  // Create text style with custom weight
  withWeight: (style: TextStyle, weight: TextStyle['fontWeight']): TextStyle => ({
    ...style,
    fontWeight: weight,
  }),

  // Get responsive font size
  getResponsiveSize: (baseSize: number, _screenWidth: number): number => {
    return baseSize;
  },

  // Get line height for font size
  getLineHeight: (fontSize: number, multiplier: number = 1.5): number => {
    return Math.round(fontSize * multiplier);
  },
};

// Font families
export const FontFamily = {
  default: 'Inter',
  ios: 'Inter',
  android: 'Inter',
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  monospace: 'SF Mono, ui-monospace, Menlo, Monaco, "Cascadia Code", "Courier New", monospace',
} as const;

// Text alignment presets
export const TextAlignment = {
  left: 'left' as const,
  center: 'center' as const,
  right: 'right' as const,
  justify: 'justify' as const,
} as const;

// Text transform presets
export const TextTransform = {
  none: 'none' as const,
  uppercase: 'uppercase' as const,
  lowercase: 'lowercase' as const,
  capitalize: 'capitalize' as const,
} as const;

export default Typography;
