import React, { useMemo, useState } from 'react';
import { I18nContext } from './i18nContext';
import { TRANSLATIONS, type Locale } from './translations';

const LOCALE_STORAGE_KEY = 'calishome_locale';

function resolveInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'es' || saved === 'en') {
      return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
      return 'en';
    }
  } catch {
    // Fallback al idioma principal
  }
  return 'es';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
      }
    } catch {
      // Ignorar si storage restringido
    }
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: TRANSLATIONS[locale],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
