import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import trTranslation from '@/locales/tr/translation.json';
import enTranslation from '@/locales/en/translation.json';

const resources = {
  tr: { translation: trTranslation },
  en: { translation: enTranslation },
};

// Get initial language from browser
const getInitialLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  // Support English and Turkish, default to Turkish for unsupported languages
  return browserLang === 'en' ? 'en' : 'tr';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Function to change language dynamically
export const changeLanguage = (lang: string) => {
  const normalizedLang = lang.toLowerCase();
  if (normalizedLang === 'en' || normalizedLang === 'english') {
    i18n.changeLanguage('en');
  } else {
    i18n.changeLanguage('tr');
  }
};

export default i18n;
