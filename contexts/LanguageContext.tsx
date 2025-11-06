import React, { createContext, useContext, useState, useMemo, FC, ReactNode } from 'react';
import { en, Translations } from '../i18n/locales/en';
import { zh } from '../i18n/locales/zh';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  t: (key: keyof Translations, ...args: any[]) => string;
}

const translations: Record<Language, Translations> = { en, zh };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    language: Language;
}

export const LanguageProvider: FC<LanguageProviderProps> = ({ children, language }) => {
  const t = useMemo(() => {
    return (key: keyof Translations, ...args: any[]): string => {
        const value = translations[language][key];
        if (typeof value === 'function') {
            return (value as Function)(...args);
        }
        return value as string;
    };
  }, [language]);

  const value = {
    language,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
