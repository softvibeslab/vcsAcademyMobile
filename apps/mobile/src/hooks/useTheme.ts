/**
 * Custom Hook - useTheme
 * Provides access to the theme system with responsive utilities
 */

import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import Theme from '../constants/theme';

type ResponsiveTheme = typeof Theme & {
  responsive: {
    spacing: (baseSpacing: number) => number;
    fontSize: (baseSize: number) => number;
    isBreakpoint: (breakpoint: keyof typeof Theme.breakpoints) => boolean;
    getCurrentBreakpoint: () => keyof typeof Theme.breakpoints;
    isTablet: () => boolean;
    platform: typeof Platform.OS;
  };
};

export const useTheme = (): ResponsiveTheme => {
  const { width } = useWindowDimensions();

  // Responsive theme utilities
  const responsive = useMemo(() => ({
    // Get responsive spacing
    spacing: (baseSpacing: number): number => {
      const scaleFactor = Math.min(width / 375, 1.2);
      return Math.round(baseSpacing * scaleFactor);
    },

    // Get responsive font size
    fontSize: (baseSize: number): number => {
      const scaleFactor = Math.min(width / 375, 1.2);
      return Math.round(baseSize * scaleFactor);
    },

    // Check if current breakpoint matches
    isBreakpoint: (breakpoint: keyof typeof Theme.breakpoints): boolean => {
      return width >= Theme.breakpoints[breakpoint];
    },

    // Get current breakpoint
    getCurrentBreakpoint(): keyof typeof Theme.breakpoints {
      if (width >= Theme.breakpoints.xlarge) return 'xlarge';
      if (width >= Theme.breakpoints.large) return 'large';
      if (width >= Theme.breakpoints.medium) return 'medium';
      return 'small';
    },

    // Check if device is tablet
    isTablet: (): boolean => {
      return width >= 768;
    },

    // Check platform
    platform: Platform.OS,
  }), [width]);

  return {
    ...Theme,
    responsive,
  };
};

export default useTheme;
