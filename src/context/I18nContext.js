import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import am from '../i18n/am.json';
import ar from '../i18n/ar-SA.json';
import az from '../i18n/az.json';
import ber from '../i18n/ber.json';
import bg from '../i18n/bg.json';
import bn from '../i18n/bn.json';
import bs from '../i18n/bs.json';
import cs from '../i18n/cs.json';
import de from '../i18n/de.json';
import dv from '../i18n/dv.json';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import fa from '../i18n/fa.json';
import fr from '../i18n/fr.json';
import ha from '../i18n/ha.json';
import hi from '../i18n/hi.json';
import id from '../i18n/id.json';
import it from '../i18n/it.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';
import ml from '../i18n/ml.json';
import nl from '../i18n/nl.json';
import ms from '../i18n/ms.json';
import no from '../i18n/no.json';
import pl from '../i18n/pl.json';
import ps from '../i18n/ps.json';
import pt from '../i18n/pt.json';
import ro from '../i18n/ro.json';
import ru from '../i18n/ru.json';
import sd from '../i18n/sd.json';
import so from '../i18n/so.json';
import sq from '../i18n/sq.json';
import sv from '../i18n/sv.json';
import sw from '../i18n/sw.json';
import ta from '../i18n/ta.json';
import tg from '../i18n/tg.json';
import th from '../i18n/th.json';
import tr from '../i18n/tr.json';
import tt from '../i18n/tt.json';
import ug from '../i18n/ug.json';
import ur from '../i18n/ur.json';
import uz from '../i18n/uz.json';
import zh from '../i18n/zh.json';

const STORAGE_KEY = '@ayasofya_language';

const LANGUAGES = {
  am, ar, az, ber, bg, bn, bs, cs, de, dv, en, es, fa, fr, ha, hi, id, it, ja, ko, ml, ms, no, nl, pl, ps, pt, ro, ru, sd, so, sq, sv, sw, ta, tg, th, tr, tt, ug, ur, uz, zh
};

export const LANGUAGE_LIST = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'uz', label: 'Oʻzbekcha', flag: '🇺🇿' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'sq', label: 'Shqip', flag: '🇦🇱' },
  { code: 'bg', label: 'Български', flag: '🇧🇬' },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'ber', label: 'Tamazight', flag: '🇲🇦' },
  { code: 'dv', label: 'ދިވެހިބަސް', flag: '🇲🇻' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'ps', label: 'پښتو', flag: '🇦🇫' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'sd', label: 'سنڌي', flag: '🇵🇰' },
  { code: 'so', label: 'Soomaali', flag: '🇸🇴' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'tt', label: 'Татарча', flag: '🇷🇺' },
  { code: 'ug', label: 'ئۇيغۇرچە', flag: '🇨🇳' },
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
