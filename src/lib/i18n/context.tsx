"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Locale } from './translations';

type LanguageContextType = {
    language: Locale;
    setLanguage: (lang: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Locale>('en');

    useEffect(() => {
        // Auto-detect browser language
        const browserLang = navigator.language.split('-')[0] as Locale;
        // Check if the language exists in our translations
        if (Object.keys(translations).includes(browserLang)) {
            setLanguage(browserLang);
        }
    }, []);

    const t = (path: string, params?: Record<string, string | number>) => {
        const keys = path.split('.');
        let current: any = translations[language];

        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
            current = current[key];
        }

        if (Array.isArray(current)) {
            current = current[Math.floor(Math.random() * current.length)];
        }

        let value = current as string;

        if (params) {
            Object.entries(params).forEach(([key, val]) => {
                value = value.replace(new RegExp(`{${key}}`, 'g'), String(val));
            });
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
