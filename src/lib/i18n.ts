import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import trTranslation from '@/locales/tr/translation.json';
import enTranslation from '@/locales/en/translation.json';
import deTranslation from '@/locales/de/translation.json';
import frTranslation from '@/locales/fr/translation.json';
import itTranslation from '@/locales/it/translation.json';
import esTranslation from '@/locales/es/translation.json';
import arTranslation from '@/locales/ar/translation.json';
import azTranslation from '@/locales/az/translation.json';
import ruTranslation from '@/locales/ru/translation.json';
import elTranslation from '@/locales/el/translation.json';
import zhTranslation from '@/locales/zh/translation.json';

const resources = {
  tr: { translation: trTranslation },
  en: { translation: enTranslation },
  de: { translation: deTranslation },
  fr: { translation: frTranslation },
  it: { translation: itTranslation },
  es: { translation: esTranslation },
  ar: { translation: arTranslation },
  az: { translation: azTranslation },
  ru: { translation: ruTranslation },
  el: { translation: elTranslation },
  zh: { translation: zhTranslation },
};

const supportedLanguages = ['tr', 'en', 'de', 'fr', 'it', 'es', 'ar', 'az', 'ru', 'el', 'zh'];
const rtlLanguages = ['ar'];

// Update document direction based on language
const updateDirection = (lang: string) => {
  const dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};

// The visitor's browser language (e.g. "de" from "de-DE"), lowercased.
export const getBrowserLanguage = (): string =>
  (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[0].toLowerCase();

// Whether we ship a translation for the visitor's browser language. When true
// we honour it on menu entry; when false we fall back to the restaurant's
// configured default (menuLang) — see useRestaurant.
export const isBrowserLanguageSupported = (): boolean =>
  supportedLanguages.includes(getBrowserLanguage());

// Get initial language from browser
const getInitialLanguage = (): string => {
  const browserLang = getBrowserLanguage();
  return supportedLanguages.includes(browserLang) ? browserLang : 'tr';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Set initial direction
updateDirection(initialLang);

// Function to change language dynamically
export const changeLanguage = (lang: string) => {
  const normalizedLang = lang.toLowerCase();
  if (supportedLanguages.includes(normalizedLang)) {
    i18n.changeLanguage(normalizedLang);
    updateDirection(normalizedLang);
  } else {
    i18n.changeLanguage('tr');
    updateDirection('tr');
  }
};

export default i18n;
