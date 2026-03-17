"use client";

import { Music, Globe, ChevronDown, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

export default function LandingClient({ loginUrl }: { loginUrl: string }) {
    const { t, language, setLanguage } = useLanguage();

    const [showSessionExpired, setShowSessionExpired] = useState(false);
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    useEffect(() => {
        if (window.location.hostname === "localhost") {
            window.location.href = window.location.href.replace("localhost", "127.0.0.1");
        }

        // Check for session expired error
        const params = new URLSearchParams(window.location.search);
        if (params.get("error") === "session_expired") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowSessionExpired(true);
        }
    }, []);



    const handleDismiss = () => {
        setShowSessionExpired(false);
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4 relative">
            {/* Session Expired Modal */}
            {showSessionExpired && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-white">{t('landing.sessionExpired.title')}</h3>
                            <p className="text-neutral-400">{t('landing.sessionExpired.message')}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
                            >
                                {t('landing.sessionExpired.dismiss')}
                            </button>
                            <a
                                href={loginUrl}
                                className="flex-1 px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-center transition-colors"
                            >
                                {t('landing.sessionExpired.refresh')}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Language Selector */}
            {isLanguageOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsLanguageOpen(false)} />
            )}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs font-medium text-gray-300 hover:text-white border border-transparent hover:border-neutral-600"
                >
                    <Globe className="w-3 h-3" />
                    <span className="uppercase">{language}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isLanguageOpen ? "rotate-180" : "")} />
                </button>

                {isLanguageOpen && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-neutral-800 rounded-xl shadow-xl border border-neutral-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        {([
                            { code: 'en', label: 'English' },
                            { code: 'es', label: 'Español' },
                            { code: 'fr', label: 'Français' },
                            { code: 'de', label: 'Deutsch' },
                            { code: 'it', label: 'Italiano' },
                            { code: 'pt', label: 'Português' },
                        ] as { code: Locale, label: string }[]).map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsLanguageOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-neutral-700 transition-colors flex items-center justify-between",
                                    language === lang.code ? "text-green-500 bg-green-500/10" : "text-gray-300"
                                )}
                            >
                                {lang.label}
                                {language === lang.code && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center space-y-8 text-center max-w-md">
                <div className="p-4 bg-green-500 rounded-full bg-opacity-20 animate-pulse">
                    <Music className="w-16 h-16 text-green-500" />
                </div>

                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">
                    {t('landing.title')}
                </h1>

                <p className="text-gray-400 text-lg">
                    {t('landing.subtitle')}
                </p>

                <a
                    href={loginUrl}
                    className="px-8 py-4 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                    {t('landing.cta')}
                </a>
            </div>
        </main>
    );
}
