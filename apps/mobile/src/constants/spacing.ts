/**
 * Design System - Spacing
 * Consistent spacing scale based on 4px grid
 */

export const Spacing = {
  // Base spacing (4px grid)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Micro spacing
  micro: 2,
  tiny: 4,

  // Special spacing
  cardPadding: 24,
  screenPadding: 20,
  listPadding: 14,
  inputPadding: 12,
  buttonPadding: 18,

  // Layout spacing
  sectionSpacing: 32,
  groupSpacing: 24,
  itemSpacing: 16,
  elementSpacing: 12,
  tightSpacing: 8,

  // Border radius
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 999,
  },

  // Icon sizes
  icon: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 52,
  },

  // Screen dimensions
  screen: {
    minWidth: 320,
    maxWidth: 1180,
    containerWidth: 1400,
    breakpoint: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  // Component-specific spacing
  component: {
    button: {
      minHeight: 44,
      paddingHorizontal: 18,
      paddingVertical: 12,
      gap: 8,
    },
    input: {
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    card: {
      padding: 24,
      marginBottom: 18,
      gap: 12,
    },
    list: {
      itemPadding: 14,
      itemGap: 10,
      marginBottom: 18,
    },
    modal: {
      padding: 24,
      gap: 16,
    },
  },
} as const;

// Spacing utilities
export const SpacingUtils = {
  // Get spacing value by key
  getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'micro' | 'tiny'): number => {
    return Spacing[size] || Spacing.md;
  },

  // Calculate responsive spacing
  getResponsiveSpacing: (baseSpacing: number, screenWidth: number): number => {
    const baseWidth = 375;
    const scaleFactor = Math.min(screenWidth / baseWidth, 1.2);
    return Math.round(baseSpacing * scaleFactor);
  },

  // Get spacing multiple
  getMultiple: (base: number, multiplier: number): number => {
    return base * multiplier;
  },

  // Create margin/padding object
  createInsets: (top?: number, right?: number, bottom?: number, left?: number) => ({
    top: top ?? 0,
    right: right ?? 0,
    bottom: bottom ?? 0,
    left: left ?? 0,
  }),

  // Create symmetric spacing
  createSymmetric: (horizontal?: number, vertical?: number) => ({
    horizontal: horizontal ?? 0,
    vertical: vertical ?? 0,
  }),
};

// Common spacing presets
export const SpacingPresets = {
  // Screen padding
  screenPadding: {
    horizontal: Spacing.screenPadding,
    vertical: Spacing.lg,
  },

  // Card spacing
  cardPadding: {
    padding: Spacing.cardPadding,
    gap: Spacing.md,
  },

  // List item spacing
  listItem: {
    padding: Spacing.listPadding,
    gap: Spacing.sm,
  },

  // Form spacing
  formGroup: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // Button spacing
  buttonSpacing: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.buttonPadding,
    paddingVertical: 12,
  },
} as const;

export default Spacing;
