/**
 * UI Component - Modal
 * Accessible modal component with animations
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Theme from '../../constants/theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  containerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  backdropColor?: string;
  dismissOnBackdropPress?: boolean;
  dismissOnSwipeDown?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  animationType = 'fade',
  containerStyle,
  contentStyle,
  backdropColor = Theme.colors.overlay.strong,
  dismissOnBackdropPress = true,
  dismissOnSwipeDown = false,
}) => {
  const { height: screenHeight } = Dimensions.get('screen');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'slide') {
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: Theme.animation.base,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (animationType === 'slide') {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: Theme.animation.fast,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, animationType]);

  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) {
      onClose();
    }
  };

  const getAnimatedStyle = () => {
    if (animationType === 'slide') {
      return {
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [screenHeight, 0],
            }),
          },
        ],
      };
    } else if (animationType === 'fade') {
      return {
        opacity: fadeAnim,
      };
    }
    return {};
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: backdropColor }]}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        <Animated.View
          style={[
            styles.modalContent,
            getAnimatedStyle(),
            containerStyle,
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            {(title || showCloseButton) && (
              <View style={styles.header}>
                {title && (
                  <View style={styles.headerContent}>
                    <Text style={styles.title}>{title}</Text>
                  </View>
                )}
                {showCloseButton && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Close modal"
                  >
                    <X size={24} color={Theme.colors.text.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={[styles.content, contentStyle]}>
              {children}
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  modalContent: {
    backgroundColor: Theme.colors.surface.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    maxHeight: '90%',
    ...Theme.shadows.large,
  },

  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    ...Theme.typography.h3,
    color: Theme.colors.text.primary,
  },

  closeButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surface.inputLight,
  },

  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
});

export default Modal;
