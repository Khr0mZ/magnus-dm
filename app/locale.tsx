'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, withLanguage, type Language } from '../lib/i18n';

const KEY = 'magnus-dm.language';
const LocaleContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'es', setLanguage: () => {} });

export function LocaleProvider({ children, initialLanguage = 'es' }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, updateLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // Hydrate after SSR without touching the independently saved session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'en' || saved === 'es') updateLanguage(saved);
    } catch { /* The switch still works when browser storage is unavailable. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === KEY && (event.newValue === 'es' || event.newValue === 'en')) updateLanguage(event.newValue);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Magnus Laser — DM Workbench' : 'Magnus Laser — Mesa del DM';
  }, [language]);
  function setLanguage(next: Language) {
    updateLanguage(next);
    try { localStorage.setItem(KEY, next); } catch { /* Keep the in-memory preference. */ }
  }
  return <LocaleContext.Provider value={{ language, setLanguage }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const { language, setLanguage } = useContext(LocaleContext);
  return {
    language, setLanguage,
    t: (text: string, values?: Record<string, string | number>) => translate(text, language, values),
    run: <T,>(action: () => T): T => withLanguage(language, action),
  };
}
