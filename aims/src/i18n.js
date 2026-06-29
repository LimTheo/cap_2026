import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko/translation.json';
import en from './locales/en/translation.json';
import ja from './locales/ja/translation.json';
import zh from './locales/zh/translation.json';
import vi from './locales/vi/translation.json';
import fil from './locales/fil/translation.json';

const savedLang = localStorage.getItem('language') || 'ko';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      zh: { translation: zh },
      vi: { translation: vi },
      fil: { translation: fil },
    },
    lng: savedLang,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
