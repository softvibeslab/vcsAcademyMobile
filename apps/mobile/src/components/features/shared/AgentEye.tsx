import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Eye, Sparkles } from 'lucide-react-native';
import Theme from '../../../constants/theme';

type AgentEyeState = 'idle' | 'listening' | 'thinking' | 'answered';

type AgentEyeProps = {
  state?: AgentEyeState;
  size?: 'small' | 'large';
  onPress?: () => void;
};

export default function AgentEye({ state = 'idle', size = 'large', onPress }: AgentEyeProps) {
  const isLarge = size === 'large';
  const active = state === 'listening' || state === 'thinking';
  const dimension = isLarge ? 152 : 76;
  const radius = dimension / 2;

  return (
    <View style={[styles.shell, isLarge ? styles.shellLarge : styles.shellSmall]}>
      <View style={[styles.orbitOuter, active && styles.orbitActive, { borderRadius: radius + 30, height: dimension + 60, width: dimension + 60 }]} />
      <View style={[styles.orbitMiddle, { borderRadius: radius + 12, height: dimension + 24, width: dimension + 24 }]} />
      <TouchableOpacity
        accessibilityLabel="Smart Agent eye"
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPress}
        style={[styles.core, { borderRadius: radius, height: dimension, width: dimension }]}
      >
        {state === 'thinking' ? (
          <Sparkles color={Theme.colors.primary.goldLight} size={isLarge ? 58 : 32} strokeWidth={1.6} />
        ) : (
          <Eye color={Theme.colors.primary.goldLight} size={isLarge ? 78 : 38} strokeWidth={1.6} />
        )}
        <View style={[styles.dot, isLarge && styles.dotLarge]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellLarge: {
    height: 292,
    width: '100%',
  },
  shellSmall: {
    height: 112,
    width: 112,
  },
  orbitOuter: {
    borderColor: 'rgba(242,202,80,0.16)',
    borderWidth: 1,
    position: 'absolute',
  },
  orbitActive: {
    backgroundColor: 'rgba(255,194,26,0.06)',
    borderColor: Theme.colors.primary.goldLight,
  },
  orbitMiddle: {
    borderColor: 'rgba(242,202,80,0.38)',
    borderWidth: 2,
    position: 'absolute',
  },
  core: {
    alignItems: 'center',
    backgroundColor: Theme.colors.primary.goldPale,
    borderColor: 'rgba(242,202,80,0.48)',
    borderWidth: 1.5,
    justifyContent: 'center',
    shadowColor: Theme.colors.primary.gold,
    shadowOpacity: 0.35,
    shadowRadius: 34,
  },
  dot: {
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: 7,
    height: 14,
    position: 'absolute',
    width: 14,
  },
  dotLarge: {
    borderRadius: 10,
    height: 20,
    width: 20,
  },
});
