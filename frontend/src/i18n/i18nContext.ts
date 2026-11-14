import { createContext } from 'react';
import type { Locale, TranslationDictionary } from './translations';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslationDictionary;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
