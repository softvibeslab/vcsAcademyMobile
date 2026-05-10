import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bot } from 'lucide-react-native';
import Theme from '../../../constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
};

export default function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing || (
        <View style={styles.eyeSmall}>
          <Bot color={Theme.colors.primary.goldLight} size={34} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  copy: {
    flex: 1,
    paddingRight: Theme.spacing.sm,
  },
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.text.primary,
  },
  subtitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  eyeSmall: {
    alignItems: 'center',
    borderColor: Theme.colors.border.goldLight,
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    opacity: 0.86,
    width: 72,
  },
});
