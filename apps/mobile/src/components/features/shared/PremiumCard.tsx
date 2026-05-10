import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../../constants/theme';

type PremiumCardProps = {
  children: React.ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PremiumCard({ children, accent, style }: PremiumCardProps) {
  return (
    <LinearGradient
      colors={accent ? [Theme.colors.surface.elevated, 'rgba(14,14,18,0.98)'] : [Theme.colors.surface.card, 'rgba(14,14,18,0.96)']}
      style={[styles.card, accent && styles.accent, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: Theme.colors.border.medium,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 4,
  },
  accent: {
    borderColor: Theme.colors.border.gold,
    shadowColor: Theme.colors.primary.gold,
    shadowOpacity: 0.12,
  },
});
