import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Qibla, Coordinates } from 'adhan';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { ScreenBackground } from '../components/ScreenBackground';
import { useLocationContext } from '../context/LocationContext';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.78;
const C = COMPASS_SIZE / 2;
const R_OUTER = C - 4;
const R_BEZEL_INNER = R_OUTER - 18;
const R_TICK = R_BEZEL_INNER - 4;

const KABE_LAT = 21.4225;
const KABE_LNG = 39.8262;
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;

function circularSmooth(prev, next, alpha = 0.15) {
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return ((prev + alpha * delta) + 360) % 360;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function polarXY(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
}

/* ── SVG Compass Face ─────────────────────────────────────────── */
function CompassSvg({ qiblaDeg, t }) {
  const ticks = [];
  for (let i = 0; i < 360; i += 2) {
    const isMajor = i % 90 === 0;
    const isMid = !isMajor && i % 30 === 0;
    const isMinor = !isMajor && !isMid && i % 10 === 0;
    if (!isMajor && !isMid && !isMinor) continue;
    const len = isMajor ? 16 : isMid ? 10 : 6;
    const sw = isMajor ? 2.5 : isMid ? 1.5 : 0.8;
    const clr = isMajor ? colors.accent : isMid ? 'rgba(200,161,90,0.5)' : 'rgba(200,161,90,0.3)';
    const p1 = polarXY(i, R_TICK);
    const p2 = polarXY(i, R_TICK - len);
    ticks.push(
      <Line key={`t${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={clr} strokeWidth={sw} strokeLinecap="round" />,
    );
  }

  const cardinals = [
    { deg: 0, label: t.north || 'K', clr: colors.accent, sz: 18 },
    { deg: 90, label: t.east || 'D', clr: colors.textPrimary, sz: 15 },
    { deg: 180, label: t.south || 'G', clr: colors.textPrimary, sz: 15 },
    { deg: 270, label: t.west || 'B', clr: colors.textPrimary, sz: 15 },
  ].map((c) => {
    const p = polarXY(c.deg, R_TICK - 28);
    return (
      <SvgText key={c.label} x={p.x} y={p.y} fill={c.clr}
        fontSize={c.sz} fontWeight="700" textAnchor="middle" dy="0.35em">
        {c.label}
      </SvgText>
    );
  });

  const degLabels = [30, 60, 120, 150, 210, 240, 300, 330].map((d) => {
    const p = polarXY(d, R_TICK - 26);
    return (
      <SvgText key={`d${d}`} x={p.x} y={p.y} fill={colors.textMuted}
        fontSize={10} fontWeight="500" textAnchor="middle" dy="0.35em">
        {d}°
      </SvgText>
    );
  });

  /* Qibla marker */
  const q = polarXY(qiblaDeg, R_BEZEL_INNER - 8);
  const qRad = (qiblaDeg * Math.PI) / 180;

  return (
    <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
      <Defs>
        <SvgLinearGradient id="bezel" x1="0" y1="0" x2="0" y2="1" >
          <Stop offset="0%" stopColor="#dbb866" />
          <Stop offset="30%" stopColor="#c8a15a" />
          <Stop offset="70%" stopColor="#b08d42" />
          <Stop offset="100%" stopColor="#8a6d2e" />
        </SvgLinearGradient>
        <RadialGradient id="face" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#0e3e32" />
          <Stop offset="100%" stopColor="#061e1a" />
        </RadialGradient>
      </Defs>

      {/* Bezel ring */}
      <Circle cx={C} cy={C} r={R_OUTER} fill="url(#bezel)" />
      {/* Face */}
      <Circle cx={C} cy={C} r={R_BEZEL_INNER} fill="url(#face)" />
      {/* Inner decorative ring */}
      <Circle cx={C} cy={C} r={R_BEZEL_INNER - 2}
        stroke="rgba(200,161,90,0.15)" strokeWidth={0.8} fill="none" />

      {ticks}
      {degLabels}
      {cardinals}

      {/* Qibla direction line — dashed */}
      <Line x1={C} y1={C}
        x2={C + (R_TICK - 42) * Math.sin(qRad)}
        y2={C - (R_TICK - 42) * Math.cos(qRad)}
        stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round"
        opacity={0.3} strokeDasharray="6,4" />

      {/* Kabe marker */}
      <Circle cx={q.x} cy={q.y} r={15} fill={colors.accent} opacity={0.95} />
      <Path
        d={`M${q.x - 5},${q.y + 4} L${q.x - 5},${q.y - 2} L${q.x},${q.y - 6.5} L${q.x + 5},${q.y - 2} L${q.x + 5},${q.y + 4} Z`}
        fill={colors.backgroundTop}
      />

      {/* Center ornament */}
      <Circle cx={C} cy={C} r={6} fill={colors.accent} opacity={0.85} />
      <Circle cx={C} cy={C} r={2.5} fill={colors.backgroundTop} />
    </Svg>
  );
}

/* ── Screen ───────────────────────────────────────────────────── */
export function QiblaScreen() {
  useTheme();
  const { t } = useI18n();
  const s = createStyles();
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const animTarget = useRef(0);
  const smoothed = useRef(0);

  const [heading, setHeading] = useState(0);
  const [qiblaDeg, setQiblaDeg] = useState(0);
  const [status, setStatus] = useState('loading');
  const [accuracy, setAccuracy] = useState(-1);
  const [userCoords, setUserCoords] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  const { city, country } = useLocationContext();
  const subRef = useRef(null);

  const kabeDistance = useMemo(
    () => haversineDistance(userCoords.lat, userCoords.lng, KABE_LAT, KABE_LNG),
    [userCoords],
  );

  // ── 1. Get Qibla bearing ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          setQiblaDeg(Qibla(new Coordinates(DEFAULT_LAT, DEFAULT_LNG)));
          setStatus('denied');
        } else {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          const { latitude: lat, longitude: lng } = loc.coords;
          setUserCoords({ lat, lng });
          setQiblaDeg(Qibla(new Coordinates(lat, lng)));
        }
      } catch {
        setQiblaDeg(Qibla(new Coordinates(DEFAULT_LAT, DEFAULT_LNG)));
      }
    })();
  }, []);

  // ── 2. Watch heading ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') { setStatus('denied'); return; }
        subRef.current = await Location.watchHeadingAsync((data) => {
          if (!mounted) return;
          const raw = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          if (raw < 0) return;
          smoothed.current = circularSmooth(smoothed.current, raw, 0.25);
          setHeading(smoothed.current);
          setAccuracy(data.accuracy ?? -1);
          setStatus('ok');
        });
      } catch { setStatus('error'); }
    })();
    return () => { mounted = false; subRef.current?.remove(); };
  }, []);

  // ── 3. Animate rotation ────────────────────────────────────────
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

  const qiblaRelative = (qiblaDeg - heading + 360) % 360;
  const isPointingQibla = qiblaRelative < 6 || qiblaRelative > 354;

  const handleRecalibrate = useCallback(() => {
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
      } catch { setStatus('error'); }
    })();
  }, []);

  // Cleanup on unmount (covers both initial + recalibrated listeners)
  useEffect(() => {
    return () => { subRef.current?.remove(); };
  }, []);

  const accuracyLabel =
    accuracy >= 3 ? (t.accuracyHigh || 'Yüksek') : accuracy === 2 ? (t.accuracyMed || 'Orta') : accuracy === 1 ? (t.accuracyLow || 'Düşük') : '';
  const locationName = city || (t.istanbul || 'İstanbul');
  const countryName = country || (t.turkey || 'Türkiye');

  return (
    <ScreenBackground>
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <Text style={s.title}>{t.qiblaTitle || 'KIBLE PUSULASI'}</Text>

          {status === 'error' ? (
            <Text style={s.errorText}>
              {t.compassError || 'Pusula sensörü okunamadı.\nLütfen konum iznini kontrol edin.'}
            </Text>
          ) : (
            <>
              {/* Degree info bar */}
              <View style={s.infoBar}>
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>{t.direction || 'YÖN'}</Text>
                  <Text style={s.infoValue}>{Math.round(heading)}°</Text>
                </View>
                <View style={s.infoDivider} />
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>{t.qiblaLabel || 'KIBLE'}</Text>
                  <Text style={s.infoValue}>{qiblaDeg.toFixed(1)}°</Text>
                </View>
                {accuracyLabel !== '' && (
                <>
                  <View style={s.infoDivider} />
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>{t.accuracy || 'DOĞRULUK'}</Text>
                    <Text style={s.infoValue}>{accuracyLabel}</Text>
                  </View>
                </>
              )}
              </View>

              {status === 'denied' && (
                <Text style={s.warnText}>
                  {t.locationDenied || 'Konum izni verilmedi — İstanbul varsayılan olarak kullanılıyor'}
                </Text>
              )}

              {/* Calibration hint when accuracy is low */}
              {accuracy >= 0 && accuracy <= 1 && (
                <View style={s.calibrationHint}>
                  <Ionicons name="warning-outline" size={16} color="#e8a84c" />
                  <Text style={s.calibrationText}>
                    {t.compassLowAccuracy || 'Pusula hassasiyeti düşük — telefonunuzu 8 şeklinde çevirin'}
                  </Text>
                </View>
              )}

              {/* Compass */}
              <View style={s.compassWrap}>
                <View style={s.topIndicator}>
                  <Svg width={20} height={14}>
                    <Path d="M10,0 L20,14 L0,14 Z"
                      fill={isPointingQibla ? '#4caf50' : colors.accent} />
                  </Svg>
                </View>
                <Animated.View style={{ transform: [{ rotate: compassSpin }] }}>
                  <CompassSvg qiblaDeg={qiblaDeg} t={t} />
                </Animated.View>
              </View>

              {/* City & distance */}
              <Text style={s.cityText}>{locationName}, {countryName}</Text>
              <View style={s.distanceRow}>
                <Ionicons name="location-sharp" size={14} color={colors.accent} />
                <Text style={s.distanceText}>
                  {formatThousands(Math.round(kabeDistance))} {t.distanceToKaaba || "km Kabe'ye mesafe"}
                </Text>
              </View>

              {/* Status */}
              <Text style={[s.statusText, isPointingQibla && s.statusOk]}>
                {isPointingQibla
                  ? (t.qiblaFound || '✓ Kıble yönündesiniz!')
                  : `${qiblaRelative > 180 ? (t.qiblaLeft || 'Kıble solunuzda') : (t.qiblaRight || 'Kıble sağınızda')} — ${Math.round(
                      qiblaRelative < 180 ? qiblaRelative : 360 - qiblaRelative,
                    )}°`}
              </Text>

              {/* Actions */}
              <Pressable
                style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
                onPress={handleRecalibrate}
              >
                <Ionicons name="refresh" size={16} color={colors.accent} />
                <Text style={s.btnText}>{t.recalibrate || 'Yeniden Kalibre Et'}</Text>
              </Pressable>

              <Text style={s.hint}>
                {t.calibrationHint || 'Doğruluk için telefonunuzu 8 şeklinde hareket ettirin'}
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const createStyles = () => ({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 14,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,46,40,0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  infoItem: { alignItems: 'center', paddingHorizontal: 14 },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.divider,
  },
  warnText: {
    color: '#ffb74d',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  calibrationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 168, 76, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  calibrationText: {
    color: '#e8a84c',
    fontSize: 11,
    flex: 1,
  },
  errorText: {
    color: '#e57373',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 60,
  },
  compassWrap: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  topIndicator: {
    position: 'absolute',
    top: -6,
    zIndex: 10,
  },
  cityText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  distanceText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },
  statusOk: {
    color: '#81c784',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 14,
    marginBottom: 14,
  },
  btnPressed: { opacity: 0.6 },
  btnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
