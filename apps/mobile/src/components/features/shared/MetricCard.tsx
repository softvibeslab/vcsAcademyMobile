import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Theme from '../../../constants/theme';

type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  trend?: string;
  positive?: boolean;
};

export default function MetricCard({ label, value, caption, trend, positive }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
      {trend ? <Text style={[styles.trend, positive ? styles.positive : styles.negative]}>{trend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: Theme.colors.border.light,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    flex: 1,
    padding: Theme.spacing.sm,
  },
  label: {
    ...Theme.typography.captionStrong,
    color: Theme.colors.text.primary,
  },
  value: {
    ...Theme.typography.metric,
    color: Theme.colors.text.primary,
    marginVertical: Theme.spacing.xs,
  },
  caption: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
  },
  progressTrack: {
    backgroundColor: Theme.colors.overlay.light,
    borderRadius: Theme.borderRadius.sm,
    height: 8,
    marginVertical: Theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: Theme.borderRadius.sm,
    height: '100%',
    width: '62%',
  },
  trend: {
    ...Theme.typography.captionStrong,
  },
  positive: {
    color: Theme.colors.semantic.success.primary,
  },
  negative: {
    color: Theme.colors.semantic.error.primary,
  },
});
