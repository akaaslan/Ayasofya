<p align="center">
  <img src="assets/icon.png" alt="Ayasofya Logo" width="120" />
</p>

<h1 align="center">Ayasofya</h1>
<p align="center">
  <strong>Islamic Prayer Times & Worship Companion</strong>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.1-green" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Expo%20SDK-54-black" alt="Expo SDK" />
  <img src="https://img.shields.io/badge/React%20Native-0.81.5-61dafb" alt="React Native" />
</p>

---

## About

Ayasofya is a comprehensive Islamic prayer app designed for daily worship. It provides accurate prayer times, Quran reading, dhikr tracking, qibla direction, and much more — all wrapped in a beautiful dark-themed interface with full offline support.

---

## Features

### 🕌 Prayer Times
- Live countdown ring with animated 60-tick SVG progress indicator
- Real-time display for 6 daily prayers: **İmsak, Güneş, Öğle, İkindi, Akşam, Yatsı**
- Next prayer countdown (HH:MM:SS)
- Hijri (Islamic) calendar display
- Daily Quranic verse rotation
- GPS-based or manual city selection (20+ Turkish cities)
- Push notifications with configurable pre-alerts
- Adhan sound playback

### 🧭 Qibla Compass
- Interactive SVG compass showing Kaaba direction
- Real-time bearing from device heading
- Distance to Mecca display
- Smooth heading interpolation

### 📖 Quran Reader
- Full 114 Surahs with Arabic text
- Multiple tafsirs (interpretations)
- Multi-language support (Turkish & English)
- Reciter audio selection
- Last-read bookmark persistence
- Next / Previous surah navigation

### ✨ 99 Names of Allah (Esmâ-ül Hüsnâ)
- Complete list with Arabic, transliteration, and meaning
- Searchable by name, meaning, or number
- Animated staggered entrance

### 📿 Dhikr Counter
Two interactive styles:
- **Classic Ring** — 33-tick rotating ring with center tap
- **Tasbih Beads** — Realistic animated bead chain (misbaha)

| Feature | Detail |
|---------|--------|
| Default dhikrs | Sübhanallah, Elhamdülillah, Allahu Ekber, Lâ İlâhe İllallah, Estağfirullah, Salavat |
| Target per dhikr | Customizable (default 100) |
| Tracking | Daily total, grand total, session history |
| Feedback | Haptic vibration, wooden bead tap sound |

### 📚 Dua Collection
- Categorized duas (Morning, Evening, etc.)
- Arabic text + transliteration + Turkish meaning + source
- Favorite system & share functionality
- Expandable card layout

### ✅ Prayer Tracking (Namaz Takibi)
- Track 5 daily obligatory prayers
- Animated checkbox with ripple feedback
- Daily / weekly / monthly statistics
- Streak calculation

### 🤲 Kaza (Missed Prayers) Tracker
- Counter for 6 prayers: Sabah, Öğle, İkindi, Akşam, Yatsı, Vitir
- Increment / decrement with total display

### 🌙 Ramadan Mode
- Auto-detection from Hijri calendar
- Iftar & Sahur time calculation
- Fasting tracker (Suhoor + Iftar toggles)
- Day counter & streak
- Manual override (auto / on / off)

---

## Themes

All themes feature a dark interface optimized for eye comfort:

| Theme | Accent | Background |
|-------|--------|-----------|
| **Emerald** (default) | Gold `#c8a15a` | Deep Teal `#061e1a` |
| **Turquoise** | Cyan `#4dc9c0` | Dark Blue `#081e24` |
| **Purple** | Lavender `#c084fc` | Dark Purple `#1a1028` |
| **Burgundy** | Rose `#e87498` | Deep Maroon `#1e0a14` |

---

## Languages

32 languages with lazy-loading support:

> Turkish (default), English, Deutsch, العربية, Azərbaycanca, Español, Français, Bahasa Indonesia, Italiano, Русский, 中文, 日本語, 한국어, हिन्दी, বাংলা, اردو, فارسی, Oʻzbekcha, Bahasa Melayu, Kiswahili, Shqip, Български, Bosanski, Čeština, Polski, Română, Norsk, Svenska, አማርኛ, Tamazight, Português, Somali …

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81.5 |
| Platform | Expo SDK 54 |
| Navigation | React Navigation 7 (Bottom Tabs + Stack) |
| State | Context API (Location, Ramadan, I18n, Theme) |
| Database | SQLite (`expo-sqlite`) |
| Prayer Calc | `adhan` (astronomical calculation) |
| Notifications | `expo-notifications` |
| Background | `expo-task-manager` + `expo-background-fetch` |
| Audio | `expo-audio` |
| Haptics | `expo-haptics` |
| UI | `react-native-svg`, `expo-linear-gradient`, Expo Vector Icons |
| Location | `expo-location` |

---

## Project Structure

```
Ayasofya/
├── App.js                    # Root component, providers, theme
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build profiles
├── assets/                   # Icons, splash, fonts
└── src/
    ├── components/           # Reusable UI components
    │   ├── CalendarModal.js
    │   ├── CountdownRing.js
    │   ├── CustomDialog.js
    │   ├── HeaderSection.js
    │   ├── HolidayBanner.js
    │   ├── PrayerTimeRow.js
    │   ├── PrayerTimesList.js
    │   └── ScreenBackground.js
    ├── context/              # React Context providers
    │   ├── LocationContext.js
    │   └── RamadanContext.js
    ├── data/                 # Static / fallback data
    │   ├── duaData.js
    │   ├── esmaData.js
    │   ├── prayerTimes.js
    │   └── surahData.js
    ├── hooks/                # Custom React hooks
    │   ├── useCurrentTime.js
    │   ├── useLocation.js
    │   └── usePrayerTimes.js
    ├── navigation/           # React Navigation setup
    │   ├── AppNavigator.js
    │   └── HomeStack.js
    ├── screens/              # App screens
    │   ├── HomeScreen.js
    │   ├── QiblaScreen.js
    │   ├── QuranScreen.js
    │   ├── EsmaScreen.js
    │   ├── DuaCollectionScreen.js
    │   ├── DualarScreen.js
    │   ├── NamazTakipScreen.js
    │   ├── KazaNamazScreen.js
    │   └── SettingsScreen.js
    ├── theme/
    │   └── colors.js
    └── utils/                # Services & helpers
        ├── prayerApi.js
        ├── prayerCalculation.js
        ├── prayerTracking.js
        ├── quranApi.js
        ├── notifications.js
        ├── notificationPrefs.js
        ├── backgroundService.js
        ├── adhanSound.js
        ├── dhikrStorage.js
        ├── hijriDate.js
        ├── holidays.js
        ├── kazaTracking.js
        └── ramadanMode.js
```

---

## Navigation

```
AppNavigator (Bottom Tabs)
│
├─ 🏠 Home (Stack)
│   ├─ HomeScreen          — Prayer times & countdown
│   ├─ NamazTakipScreen    — Prayer tracking
│   ├─ QuranScreen         — Quran reader
│   ├─ EsmaScreen          — 99 Names of Allah
│   ├─ DuaCollectionScreen — Dua collection
│   └─ KazaNamazScreen     — Missed prayers
│
├─ 🧭 Qibla
│   └─ QiblaScreen         — Qibla compass
│
├─ 📿 Dhikr
│   └─ DualarScreen        — Dhikr counter
│
└─ ⚙️ Settings
    └─ SettingsScreen      — Preferences
```

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Ayasofya    │────▸│   SQLite     │────▸│  Local Data  │
│  REST API    │     │   Cache      │     │  (Fallback)  │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                    │
       │              ┌─────▼─────┐
  Online fetch        │  Context  │
  + background        │ Providers │
  task refresh        └─────┬─────┘
                            │
                      ┌─────▼─────┐
                      │   Hooks   │
                      │ & Screens │
                      └───────────┘
```

1. **Online** → API fetch → cache in SQLite → serve to UI
2. **Offline** → read SQLite cache → serve to UI
3. **No cache** → use local fallback data (surahData.js, prayerCalculation.js)

---

## Offline Capabilities

| Feature | Offline Support |
|---------|:--------------:|
| Cached prayer times | ✅ |
| Local prayer calculation | ✅ |
| Bookmarked Quran | ✅ |
| Dhikr counter | ✅ |
| 99 Names & Duas | ✅ |
| Prayer tracking | ✅ |
| Kaza counter | ✅ |
| Settings & themes | ✅ |
| New API prayer times | ❌ |
| New tafsirs | ❌ |

---

## Permissions

| Permission | Reason |
|------------|--------|
| `ACCESS_FINE_LOCATION` | Prayer time calculation based on coordinates |
| `ACCESS_COARSE_LOCATION` | Approximate location fallback |
| Notifications | Prayer time alerts & reminders |
| Audio | Adhan playback |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) (for builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ayasofya.git
cd ayasofya

# Install dependencies
npm install

# Start development server
npm start
```

### Building

```bash
# Android APK (preview)
eas build -p android --profile preview

# Android AAB (production)
eas build -p android --profile production

# iOS
eas build -p ios --profile production
```

---

## Database Schema

```sql
-- Prayer times cache
prayer_times (date, imsak, gunes, ogle, ikindi, aksam, yatsi)

-- Daily prayer check tracking
prayer_tracking (dateKey, prayerKey, checked)

-- Missed prayers counter
kaza_prayers (prayer_name, count)

-- Dhikr session history
dhikr_sessions (timestamp, dhikrId, count, duration)

-- Ramadan fasting log
fasting_log (date, suhoor, iftar)

-- Quran content cache
surahs (id, language, name, aya_count)
ayas (id, surah_id, aya_number, juz_number, page_number, text)
tafsirs (id, aya_id, author, language, text)
```

---

## Background Service

Ayasofya runs a background task (`expo-task-manager`) that:
- Reschedules prayer notifications when the app is closed
- Refreshes prayer times cache periodically
- Sends kaza reminders
- Runs approximately every hour
- Persists across device reboots (`startOnBoot: true`)

---

## License

All rights reserved. © Ayasofya

---

<p align="center">
  <sub>Built with ❤️ for the Muslim community</sub>
</p>
