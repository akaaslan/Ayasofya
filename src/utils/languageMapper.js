const languageMap = {
    'am': 'amharic',
    'ar': 'arabic',
    'az': 'azerbaijani',
    'ber': 'amazigh',
    'bg': 'bulgarian',
    'bn': 'bengali',
    'bs': 'bosnian',
    'cs': 'czech',
    'de': 'german',
    'dv': 'divehi',
    'en': 'english',
    'es': 'spanish',
    'fa': 'persian',
    'fr': 'french',
    'ha': 'hausa',
    'hi': 'hindi',
    'id': 'indonesian',
    'it': 'italian',
    'ja': 'japanese',
    'ko': 'korean',
    'ku': 'kurdish',
    'ml': 'malayalam',
    'ms': 'malay',
    'nl': 'dutch',
    'no': 'norwegian',
    'pl': 'polish',
    'ps': 'pashto',
    'pt': 'portuguese',
    'ro': 'romanian',
    'ru': 'russian',
    'sd': 'sindhi',
    'so': 'somali',
    'sq': 'albanian',
    'sv': 'swedish',
    'sw': 'swahili',
    'ta': 'tamil',
    'tg': 'tajik',
    'th': 'thai',
    'tr': 'turkish',
    'tt': 'tatar',
    'ug': 'uyghur',
    'ur': 'urdu',
    'uz': 'uzbek',
    'zh': 'chinese'
};

export function getLanguage(lang) {
    if (!lang) return 'turkish';
    
    // Exact match (e.g., 'ar-SA' if we ever map it directly)
    if (languageMap[lang]) {
        return languageMap[lang];
    }
    
    // Base language fallback (e.g., 'ar' from 'ar-SA')
    const baseLang = lang.split('-')[0];
    if (languageMap[baseLang]) {
        return languageMap[baseLang];
    }

    return 'turkish';
}