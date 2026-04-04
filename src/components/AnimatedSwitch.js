import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB_SIZE = 22;
const TRAVEL = TRACK_W - THUMB_SIZE - 6;

/**
 * Drop-in animated replacement for React Native Switch.
 * Uses useNativeDriver: true for 120fps on high-refresh screens.
 * Props: value, onValueChange, trackColor, thumbColor, style
 */
export function AnimatedSwitch({ value, onValueChange, trackColor = {}, thumbColor, style }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [value, anim]);

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, TRAVEL + 3],
  });

  const thumbScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.12, 1],
  });

  return (
    <Pressable onPress={() => onValueChange?.(!value)} style={style}>
      <View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          backgroundColor: trackColor.false || '#333',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: trackColor.true || '#c8a15a',
            opacity: anim,
          }}
        />
        <Animated.View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: thumbColor || '#fff',
            position: 'absolute',
            transform: [{ translateX: thumbTranslateX }, { scale: thumbScale }],
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        />
      </View>
    </Pressable>
  );
}
