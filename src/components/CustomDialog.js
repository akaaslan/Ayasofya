import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

/**
 * Custom themed dialog replacing native Alert.alert().
 *
 * Props:
 *   visible    – boolean
 *   icon       – Ionicons name (optional)
 *   title      – dialog title
 *   message    – body text
 *   buttons    – [{ text, style?, onPress? }]  (like Alert.alert buttons)
 *   onClose    – called when backdrop pressed or dialog dismissed
 */
export function CustomDialog({ visible, icon, title, message, buttons = [], onClose }) {
  const t = useI18n();
  useTheme();
  const styles = createStyles();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      scale.setValue(0.85);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onClose?.());
  };

  const handleButton = (btn) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onClose?.();
      btn.onPress?.();
    });
  };

  const resolvedButtons = buttons.length > 0 ? buttons : [{ text: t.ok }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[styles.card, { opacity: fade, transform: [{ scale }] }]}
        >
          <Pressable>{/* prevent backdrop close on card tap */}
            {/* Icon */}
            {icon && (
              <View style={styles.iconWrap}>
                <Ionicons name={icon} size={28} color={colors.accent} />
              </View>
            )}

            {/* Title */}
            {title && <Text style={styles.title}>{title}</Text>}

            {/* Message */}
            {message && <Text style={styles.message}>{message}</Text>}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {resolvedButtons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isPrimary = !isDestructive && !isCancel;
                return (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.btn,
                      isPrimary && styles.btnPrimary,
                      isCancel && styles.btnCancel,
                      isDestructive && styles.btnDestructive,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => handleButton(btn)}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isPrimary && styles.btnTextPrimary,
                        isCancel && styles.btnTextCancel,
                        isDestructive && styles.btnTextDestructive,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const createStyles = () => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.backgroundCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 24,
    alignItems: 'center',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ringBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.ringBase,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  btnCancel: {
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  btnDestructive: {
    backgroundColor: 'rgba(200, 80, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 80, 80, 0.25)',
  },
  btnPressed: { opacity: 0.6 },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextPrimary: { color: colors.accent },
  btnTextCancel: { color: colors.textMuted },
  btnTextDestructive: { color: '#e05555' },
});
