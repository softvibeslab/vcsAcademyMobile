import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Theme from '../../../constants/theme';

type BottomTab<T extends string> = {
  key: T;
  label: string;
  icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>;
};

type BottomTabBarProps<T extends string> = {
  tabs: BottomTab<T>[];
  activeTab: T;
  onSelect: (tab: T) => void;
};

export default function BottomTabBar<T extends string>({ tabs, activeTab, onSelect }: BottomTabBarProps<T>) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={styles.tabButton}
          >
            <Icon color={isActive ? Theme.colors.primary.gold : Theme.colors.text.tertiary} size={25} strokeWidth={1.7} />
            <Text numberOfLines={1} style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            {isActive ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(14,14,18,0.98)',
    borderColor: Theme.colors.border.medium,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 12,
    flexDirection: 'row',
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingHorizontal: 5,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 58,
  },
  tabText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.tertiary,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Theme.colors.primary.gold,
    fontWeight: '900',
  },
  tabIndicator: {
    backgroundColor: Theme.colors.primary.gold,
    borderRadius: Theme.borderRadius.sm,
    height: 3,
    marginTop: 2,
    width: 42,
  },
});
