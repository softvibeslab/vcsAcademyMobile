/**
 * Layout Component - Screen
 * Base screen component with safe area and scroll handling
 */

import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  ScrollViewProps,
  ViewStyle,
  StatusBar,
  StatusBarStyle,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import Theme from '../../constants/theme';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
  statusBarStyle?: StatusBarStyle;
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  safeAreaEnabled?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  testID?: string;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  scrollProps,
  statusBarStyle = 'light-content',
  backgroundColor = Theme.colors.surface.background,
  style,
  contentContainerStyle,
  safeAreaEnabled = true,
  edges = ['top', 'bottom'],
  testID,
}) => {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.content,
        { backgroundColor },
        safeAreaEnabled && {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      testID={testID}
    >
      {scrollable ? (
        <ScrollView
          {...scrollProps}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            scrollProps?.contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      {safeAreaEnabled ? (
        <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
    </>
  );
};

// Screen header component
export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  transparent?: boolean;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  onLeftPress,
  onRightPress,
  showBackButton = false,
  onBackPress,
  transparent = false,
  style,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        !transparent && {
          backgroundColor: theme.colors.surface.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border.light,
        },
        style,
      ]}
    >
      <View style={styles.headerLeft}>
        {showBackButton ? (
          <TouchableOpacity onPress={onBackPress} hitSlop={8}>
            <ChevronLeft size={24} color={theme.colors.primary.gold} />
          </TouchableOpacity>
        ) : leftAction ? (
          <TouchableOpacity onPress={onLeftPress} hitSlop={8}>
            {leftAction}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.headerCenter}>
        {title && (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.headerRight}>
        {rightAction ? (
          <TouchableOpacity onPress={onRightPress} hitSlop={8}>
            {rightAction}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    minHeight: 56,
  },

  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },

  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },

  headerTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text.primary,
    textAlign: 'center',
  },

  headerSubtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.micro,
    textAlign: 'center',
  },
});

export default Screen;
