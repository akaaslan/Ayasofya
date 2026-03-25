import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import tr from '../i18n/tr.json';
import en from '../i18n/en.json';
import de from '../i18n/de.json';
import ar from '../i18n/ar-SA.json';
import es from '../i18n/es.json';
import fr from '../i18n/fr.json';
import id from '../i18n/id.json';
import az from '../i18n/az.json';

const STORAGE_KEY = '@ayasofya_language';

const LANGUAGES = { tr, en, de, ar, es, fr, id, az };

export const LANGUAGE_LIST = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
];

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('tr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && LANGUAGES[v]) setLang(v);
      setReady(true);
    });
  }, []);

  const changeLanguage = useCallback(async (code) => {
    if (LANGUAGES[code]) {
      setLang(code);
      await AsyncStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const t = LANGUAGES[lang] || tr;

  return (
    <I18nContext.Provider value={{ t, lang, changeLanguage, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
