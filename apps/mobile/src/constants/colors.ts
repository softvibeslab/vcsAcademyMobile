/**
 * Design System - Color Palette
 * WCAG 2.1 AA compliant color system for high-performance sales academy
 */

export const Colors = {
  // Primary brand colors
  primary: {
    gold: '#f2ca50',
    goldLight: '#ffe088',
    goldDark: '#e6b840',
    goldPale: 'rgba(255, 194, 26, 0.12)',
    goldMedium: 'rgba(255, 194, 26, 0.3)',
    goldStrong: 'rgba(255, 194, 26, 0.6)',
  },

  // Surface colors (dark theme)
  surface: {
    background: '#131317',
    backgroundLight: '#1b1b20',
    card: 'rgba(27, 27, 32, 0.96)',
    cardLight: 'rgba(35, 31, 23, 0.86)',
    elevated: 'rgba(31, 27, 19, 0.98)',
    elevatedLight: 'rgba(56, 52, 43, 0.76)',
    input: 'rgba(14, 14, 18, 0.86)',
    inputLight: 'rgba(17, 14, 7, 0.74)',
  },

  // Text colors (WCAG AA compliant)
  text: {
    primary: '#f8fafc',
    secondary: '#d0c5af',
    tertiary: '#dce3ea',
    muted: '#7c8791',
    disabled: 'rgba(248, 250, 252, 0.38)',
    inverse: '#020506',
  },

  // Semantic colors
  semantic: {
    success: {
      primary: '#29e35f',
      light: 'rgba(41, 227, 95, 0.15)',
      medium: 'rgba(41, 227, 95, 0.3)',
      strong: 'rgba(41, 227, 95, 0.6)',
    },
    error: {
      primary: '#ff4141',
      light: 'rgba(255, 65, 65, 0.14)',
      medium: 'rgba(255, 65, 65, 0.35)',
      strong: 'rgba(255, 65, 65, 0.6)',
    },
    warning: {
      primary: '#ff9500',
      light: 'rgba(255, 149, 0, 0.15)',
      medium: 'rgba(255, 149, 0, 0.3)',
      strong: 'rgba(255, 149, 0, 0.6)',
    },
    info: {
      primary: '#38bdff',
      light: 'rgba(56, 189, 248, 0.12)',
      medium: 'rgba(56, 189, 248, 0.3)',
      strong: 'rgba(56, 189, 248, 0.6)',
    },
  },

  // Status colors
  status: {
    completed: '#29e35f',
    current: '#f2ca50',
    locked: '#7c8791',
    pending: '#ff9500',
    rejected: '#ff4141',
    approved: '#29e35f',
    needsPractice: '#ff9500',
  },

  // Border colors
  border: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(77, 70, 53, 0.24)',
    strong: 'rgba(255, 255, 255, 0.16)',
    gold: 'rgba(242, 202, 80, 0.4)',
    goldLight: 'rgba(242, 202, 80, 0.28)',
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.25)',
    medium: 'rgba(0, 0, 0, 0.45)',
    strong: 'rgba(0, 0, 0, 0.65)',
    gold: 'rgba(242, 202, 80, 0.2)',
    goldStrong: 'rgba(242, 202, 80, 0.55)',
  },

  // Gradient definitions
  gradients: {
    gold: ['rgba(255, 194, 26, 0.14)', 'transparent'] as const,
    blue: ['rgba(56, 189, 248, 0.12)', 'transparent'] as const,
    button: ['#d4af37', '#f2ca50'] as const,
    buttonPressed: ['#e6b840', '#f2ca50'] as const,
    background: [
      'radial-gradient(circle at 12% 4%, rgba(255, 194, 26, 0.14), transparent 26rem)',
      'radial-gradient(circle at 86% 10%, rgba(56, 189, 248, 0.12), transparent 30rem)',
      '#020506'
    ] as const,
  },

  // Accessibility helpers
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(0, 0, 0, 0.3)',
    strong: 'rgba(0, 0, 0, 0.7)',
  },

  // Smart Agent specific
  agent: {
    eye: '#f2ca50',
    eyeGlow: 'rgba(242, 202, 80, 0.2)',
    eyeBorder: 'rgba(255, 229, 138, 0.28)',
    thinking: 'rgba(242, 202, 80, 0.5)',
    listening: 'rgba(255, 194, 26, 0.8)',
  },
} as const;

// Color utilities
export const ColorUtils = {
  // Get alpha variant of a color
  withAlpha: (color: string, alpha: number): string => {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${alpha})`);
    }
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  },

  // Check contrast ratio (simplified)
  getContrastColor: (bgColor: string): string => {
    const darkBg = ['#020506', '#0a0f12', 'rgba(7, 16, 20, 0.84)'];
    if (darkBg.includes(bgColor)) {
      return Colors.text.primary;
    }
    return Colors.text.inverse;
  },

  // Get status color
  getStatusColor: (status: string): string => {
    const statusMap: Record<string, string> = {
      completed: Colors.status.completed,
      current: Colors.status.current,
      locked: Colors.status.locked,
      pending: Colors.status.pending,
      approved: Colors.status.approved,
      rejected: Colors.status.rejected,
      needs_practice: Colors.status.needsPractice,
    };
    return statusMap[status] || Colors.status.locked;
  },
};

export default Colors;
