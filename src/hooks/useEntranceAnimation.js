import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Reusable staggered entrance animation hook.
 *
 * @param {number} count – number of animated groups
 * @param {object} opts – { staggerDelay, fadeDuration, slideDuration, slideDistance, scaleFrom }
 * @returns {{ fade: Animated.Value[], slide: Animated.Value[], scale: Animated.Value[] }}
 */
export function useEntranceAnimation(count = 3, opts = {}) {
  const {
    staggerDelay = 120,
    fadeDuration = 450,
    slideDuration = 450,
    slideDistance = 30,
    scaleFrom = null,
  } = opts;

  const fade = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const slide = useRef(Array.from({ length: count }, () => new Animated.Value(slideDistance))).current;
  const scale = useRef(Array.from({ length: count }, () => new Animated.Value(scaleFrom ?? 1))).current;

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      // Skip animations when reduce motion is enabled
      if (reduceMotion) {
        fade.forEach((v) => v.setValue(1));
        slide.forEach((v) => v.setValue(0));
        if (scaleFrom != null) scale.forEach((v) => v.setValue(1));
        return;
      }

      const groups = fade.map((_, i) => {
        const anims = [
          Animated.timing(fade[i], { toValue: 1, duration: fadeDuration, useNativeDriver: true }),
          Animated.timing(slide[i], { toValue: 0, duration: slideDuration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ];
        if (scaleFrom != null) {
          anims.push(Animated.spring(scale[i], { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }));
        }
        return Animated.parallel(anims);
      });

      const anim = Animated.stagger(staggerDelay, groups);
      anim.start();
    });

    return () => { cancelled = true; };
  }, []);

  return { fade, slide, scale };
}
