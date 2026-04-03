import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Only Turkish loaded eagerly (default language); everything else lazy-loaded on demand
import tr from '../i18n/tr.json';

const STORAGE_KEY = '@ayasofya_language';

/** Lazy loaders — Metro resolves require() at build time but the JSON is only parsed on call */
const LANG_LOADERS = {
  am:  () => require('../i18n/am.json'),
  ar:  () => require('../i18n/ar-SA.json'),
  az:  () => require('../i18n/az.json'),
  ber: () => require('../i18n/ber.json'),
  bg:  () => require('../i18n/bg.json'),
  bn:  () => require('../i18n/bn.json'),
  bs:  () => require('../i18n/bs.json'),
  cs:  () => require('../i18n/cs.json'),
  de:  () => require('../i18n/de.json'),
  dv:  () => require('../i18n/dv.json'),
  en:  () => require('../i18n/en.json'),
  es:  () => require('../i18n/es.json'),
  fa:  () => require('../i18n/fa.json'),
  fr:  () => require('../i18n/fr.json'),
  ha:  () => require('../i18n/ha.json'),
  hi:  () => require('../i18n/hi.json'),
  id:  () => require('../i18n/id.json'),
  it:  () => require('../i18n/it.json'),
  ja:  () => require('../i18n/ja.json'),
  ko:  () => require('../i18n/ko.json'),
  ml:  () => require('../i18n/ml.json'),
  ms:  () => require('../i18n/ms.json'),
  nl:  () => require('../i18n/nl.json'),
  no:  () => require('../i18n/no.json'),
  pl:  () => require('../i18n/pl.json'),
  ps:  () => require('../i18n/ps.json'),
  pt:  () => require('../i18n/pt.json'),
  ro:  () => require('../i18n/ro.json'),
  ru:  () => require('../i18n/ru.json'),
  sd:  () => require('../i18n/sd.json'),
  so:  () => require('../i18n/so.json'),
  sq:  () => require('../i18n/sq.json'),
  sv:  () => require('../i18n/sv.json'),
  sw:  () => require('../i18n/sw.json'),
  ta:  () => require('../i18n/ta.json'),
  tg:  () => require('../i18n/tg.json'),
  th:  () => require('../i18n/th.json'),
  tr:  () => tr,
  tt:  () => require('../i18n/tt.json'),
  ug:  () => require('../i18n/ug.json'),
  ur:  () => require('../i18n/ur.json'),
  uz:  () => require('../i18n/uz.json'),
  zh:  () => require('../i18n/zh.json'),
};

/** Cache already-loaded language objects so require() is called only once per lang */
const _langCache = { tr };

function loadLang(code) {
  if (_langCache[code]) return _langCache[code];
  const loader = LANG_LOADERS[code];
  if (!loader) return tr;
  const data = loader();
  _langCache[code] = data;
  return data;
}

const VALID_CODES = Object.keys(LANG_LOADERS);

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
  const [translations, setTranslations] = useState(tr);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && VALID_CODES.includes(v)) {
        setLang(v);
        setTranslations(loadLang(v));
      }
      setReady(true);
    });
  }, []);

  const changeLanguage = useCallback(async (code) => {
    if (VALID_CODES.includes(code)) {
      const data = loadLang(code);
      setLang(code);
      setTranslations(data);
      await AsyncStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  return (
    <I18nContext.Provider value={{ t: translations, lang, changeLanguage, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
