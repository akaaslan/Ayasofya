import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Qibla, Coordinates } from 'adhan';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.72;

// Default: Istanbul
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;

/**
 * Low-pass filter for circular (degree) values.
 * Prevents jitter while keeping responsiveness.
 */
function circularSmooth(prev, next, alpha = 0.15) {
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return ((prev + alpha * delta) + 360) % 360;
}

export function QiblaScreen() {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const animTarget = useRef(0);
  const smoothed = useRef(0);

  const [heading, setHeading] = useState(0);
  const [qiblaDeg, setQiblaDeg] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'denied' | 'error'
  const [accuracy, setAccuracy] = useState(-1);

  const subRef = useRef(null);

  // ── 1. Get Qibla bearing using `adhan` ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          // Still show compass with Istanbul default
          const q = Qibla(new Coordinates(DEFAULT_LAT, DEFAULT_LNG));
          setQiblaDeg(q);
          setStatus('denied');
        } else {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          const q = Qibla(new Coordinates(loc.coords.latitude, loc.coords.longitude));
          setQiblaDeg(q);
        }
      } catch {
        const q = Qibla(new Coordinates(DEFAULT_LAT, DEFAULT_LNG));
        setQiblaDeg(q);
      }
    })();
  }, []);

  // ── 2. Watch compass heading from OS sensor fusion ──────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }

        subRef.current = await Location.watchHeadingAsync((data) => {
          if (!mounted) return;

          // `trueHeading` uses GPS-corrected declination; `magHeading` is fallback
          const raw = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          if (raw < 0) return; // invalid reading

          // Light smoothing on top of OS data
          smoothed.current = circularSmooth(smoothed.current, raw, 0.25);
          setHeading(smoothed.current);
          setAccuracy(data.accuracy ?? -1);
          setStatus('ok');
        });
      } catch {
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
      subRef.current?.remove();
    };
  }, []);

  // ── 3. Animate compass rotation ────────────────────────────────
  useEffect(() => {
    let delta = heading - animTarget.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    animTarget.current += delta;

    Animated.timing(rotationAnim, {
      toValue: animTarget.current,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [heading]);

  const compassSpin = rotationAnim.interpolate({
    inputRange: [-3600, 0, 3600],
    outputRange: ['3600deg', '0deg', '-3600deg'],
  });

  // ── Derived values ─────────────────────────────────────────────
  const qiblaRelative = ((qiblaDeg - heading + 360) % 360);
  const isPointingQibla = qiblaRelative < 6 || qiblaRelative > 354;

  const handleRecalibrate = useCallback(() => {
    // Remove and resubscribe
    subRef.current?.remove();
    smoothed.current = 0;
    setStatus('loading');
    (async () => {
      try {
        subRef.current = await Location.watchHeadingAsync((data) => {
          const raw = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          if (raw < 0) return;
          smoothed.current = circularSmooth(smoothed.current, raw, 0.25);
          setHeading(smoothed.current);
          setAccuracy(data.accuracy ?? -1);
          setStatus('ok');
        });
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  // ── Accuracy label ─────────────────────────────────────────────
  const accuracyLabel =
    accuracy >= 3 ? 'Yüksek' : accuracy === 2 ? 'Orta' : accuracy === 1 ? 'Düşük' : '';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>KIBLE PUSULASI</Text>

          {status === 'error' ? (
            <Text style={styles.errorText}>
              Pusula sensörü okunamadı.{'\n'}Lütfen konum iznini kontrol edin.
            </Text>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Yön: {Math.round(heading)}°{'   '}Kıble: {qiblaDeg.toFixed(1)}°
              </Text>

              {status === 'denied' && (
                <Text style={styles.warnText}>
                  Konum izni verilmedi — İstanbul varsayılan olarak kullanılıyor.
                </Text>
              )}

              {accuracyLabel !== '' && (
                <Text style={styles.accuracyText}>Doğruluk: {accuracyLabel}</Text>
              )}

              <View style={styles.compassContainer}>
                {/* Rotating compass disc — turns opposite to phone heading */}
                <Animated.View
                  style={[styles.compass, { transform: [{ rotate: compassSpin }] }]}
                >
                  {/* Cardinal directions */}
                  <Text style={[styles.cardinal, styles.north]}>K</Text>
                  <Text style={[styles.cardinal, styles.south]}>G</Text>
                  <Text style={[styles.cardinal, styles.east]}>D</Text>
                  <Text style={[styles.cardinal, styles.west]}>B</Text>

                  {/* Tick marks every 30° */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tick,
                        {
                          transform: [
                            { rotate: `${i * 30}deg` },
                            { translateY: -(COMPASS_SIZE / 2 - 24) },
                          ],
                        },
                      ]}
                    />
                  ))}

                  {/* Outer circle */}
                  <View style={styles.outerCircle} />

                  {/* Qibla icon on the disc */}
                  <View
                    style={[
                      styles.qiblaPointer,
                      {
                        transform: [
                          { rotate: `${qiblaDeg}deg` },
                          { translateY: -(COMPASS_SIZE / 2 - 6) },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="navigate" size={26} color={colors.accent} />
                  </View>
                </Animated.View>

                {/* Fixed top indicator (phone's facing direction) */}
                <View style={styles.centerIndicator}>
                  <Ionicons
                    name="caret-up"
                    size={38}
                    color={isPointingQibla ? '#4caf50' : colors.accent}
                  />
                </View>
              </View>

              <Text
                style={[styles.statusText, isPointingQibla && styles.statusSuccess]}
              >
                {isPointingQibla
                  ? '✓ Kıble yönündesiniz!'
                  : `Kıble ${qiblaRelative > 180 ? 'solunuzda' : 'sağınızda'} — ${Math.round(
                      qiblaRelative < 180 ? qiblaRelative : 360 - qiblaRelative,
                    )}°`}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleRecalibrate}
              >
                <Ionicons name="refresh" size={18} color={colors.backgroundBottom} />
                <Text style={styles.buttonText}>Yeniden Kalibre Et</Text>
              </Pressable>

              <Text style={styles.hint}>
                Doğruluk için telefonunuzu 8 şeklinde hareket ettirin.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  warnText: {
    color: '#ffb74d',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 6,
  },
  accuracyText: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 18,
  },
  errorText: {
    color: '#e57373',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 60,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  compass: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: COMPASS_SIZE - 44,
    height: COMPASS_SIZE - 44,
    borderRadius: (COMPASS_SIZE - 44) / 2,
    borderWidth: 2,
    borderColor: colors.ringBase,
    position: 'absolute',
  },
  cardinal: {
    position: 'absolute',
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  north: { top: 2, color: colors.accent, fontSize: 18 },
  south: { bottom: 2 },
  east: { right: 2 },
  west: { left: 2 },
  tick: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: 'rgba(200, 161, 90, 0.35)',
    borderRadius: 1,
  },
  qiblaPointer: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerIndicator: {
    position: 'absolute',
    top: -8,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 22,
    textAlign: 'center',
  },
  statusSuccess: {
    color: '#81c784',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.backgroundBottom,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
