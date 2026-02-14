import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Full-screen dark Islamic-patterned gradient background.
 * Wrap any screen content with this.
 */
export function ScreenBackground({ children }) {
  return (
    <LinearGradient
      colors={[colors.backgroundTop, '#072b24', colors.backgroundBottom]}
      locations={[0, 0.35, 1]}
      style={styles.background}
    >
      {/* Decorative dot-grid pattern */}
      <View style={styles.patternLayer} pointerEvents="none">
        {Array.from({ length: 48 }).map((_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'space-around',
    justifyContent: 'space-around',
    opacity: 0.12,
    paddingHorizontal: 12,
    paddingVertical: 32,
  },
  dot: {
    width: 18,
    height: 18,
    margin: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(130, 171, 137, 0.3)',
  },
});
