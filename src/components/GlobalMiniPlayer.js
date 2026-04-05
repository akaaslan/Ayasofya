import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer() {
  const audio = useAudio();
  const { t } = useI18n();
  const { fontScale } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = createStyles(fontScale || 1);

  if (!audio.playingAya) {
    return null;
  }

  // Calculate bottom position based on insets, usually tabs are there so we put it slightly higher
  const bottomPosition = insets.bottom + 72;

  // Calculate progress
  const progressPercent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  
  // Format remaining time if needed, e.g. "0:12"
  const remainingTime = audio.duration - audio.currentTime;
  const remMinutes = Math.floor(Math.max(0, remainingTime) / 60);
  const remSeconds = Math.floor(Math.max(0, remainingTime)) % 60;
  const remText = `-${remMinutes}:${remSeconds.toString().padStart(2, '0')}`;

  return (
    <View style={[styles.miniPlayer, { bottom: bottomPosition }]}>
      <Pressable
        style={styles.miniPlayerPlayBtn}
        onPress={() => audio.isPlaying ? audio.pause() : audio.resume()}
        hitSlop={4}
      >
        <Ionicons
          name={audio.isPlaying ? 'pause' : 'play'}
          size={22}
          color={colors.backgroundCard}
          style={!audio.isPlaying && { marginLeft: 2 }}
        />
      </Pressable>
      
      <Pressable 
        style={styles.miniPlayerContent} 
        onPress={() => {
          if (audio.playingSurah) {
            navigation.navigate('Quran', { autoOpenSurahId: audio.playingSurah.id });
          }
        }}
      >
        <View style={styles.miniPlayerInfo}>
          <Text style={styles.miniPlayerTitle} numberOfLines={1}>
            {audio.playingSurah?.name}
          </Text>
          <Text style={styles.miniPlayerSubtitle} numberOfLines={1}>
             {audio.playingAya?.aya_number}. {t?.ayaPlaying ?? 'Ayet Okunuyor'}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{remText}</Text>
        </View>
      </Pressable>

      <Pressable onPress={audio.stop} style={styles.miniPlayerCloseBtn} hitSlop={8}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
});

const createStyles = (fs) =>
  StyleSheet.create({
    miniPlayer: {
      position: 'absolute', left: 16, right: 16,
      backgroundColor: 'rgba(0, 75, 55, 0.97)',
      borderRadius: 16, padding: 12,
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.3)',
      ...Platform.select({
        ios:     { shadowColor: '#000', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14 },
        android: { elevation: 8 },
      }),
      zIndex: 1000,
    },
    miniPlayerPlayBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
    miniPlayerContent:  { flex: 1, marginLeft: 12, marginRight: 8 },
    miniPlayerInfo:     { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, gap: 6 },
    miniPlayerTitle:    { color: colors.white, fontSize: 16 * fs, fontWeight: '700' },
    miniPlayerSubtitle: { color: 'rgba(200, 161, 90, 0.9)', fontSize: 13 * fs, fontWeight: '500' },
    
    progressContainer:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressBarBg:      { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, overflow: 'hidden' },
    progressBarFill:    { height: '100%', backgroundColor: colors.accent },
    progressText:       { color: colors.textMuted, fontSize: 10 * fs, fontWeight: '600', width: 36, textAlign: 'right' },
    
    miniPlayerCloseBtn: { padding: 8 },
  });
