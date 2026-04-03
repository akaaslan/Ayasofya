import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';

let _show = () => {};

/**
 * Show a toast message from anywhere.
 * @param {string} message - Toast text
 * @param {{ icon?: string, action?: { label: string, onPress: () => void }, duration?: number }} opts
 */
export function showToast(message, opts = {}) {
  _show(message, opts);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 40, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback((message, opts = {}) => {
    clearTimeout(timerRef.current);
    setToast({ message, ...opts });
    opacity.setValue(0);
    translateY.setValue(40);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(hide, opts.duration || 3000);
  }, [opacity, translateY, hide]);

  useEffect(() => {
    _show = show;
    return () => { _show = () => {}; clearTimeout(timerRef.current); };
  }, [show]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {toast && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 90,
            left: 20,
            right: 20,
            opacity,
            transform: [{ translateY }],
            backgroundColor: 'rgba(20,20,20,0.92)',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          {toast.icon && (
            <Ionicons name={toast.icon} size={18} color={colors.accent} style={{ marginRight: 10 }} />
          )}
          <Text style={{ color: '#fff', fontSize: 13, flex: 1 }}>{toast.message}</Text>
          {toast.action && (
            <Pressable
              onPress={() => {
                clearTimeout(timerRef.current);
                toast.action.onPress();
                hide();
              }}
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700', marginLeft: 12 }}>
                {toast.action.label}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}
