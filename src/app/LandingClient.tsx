"use client";

import { Music, Globe } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/context";

export default function LandingClient({ loginUrl }: { loginUrl: string }) {
    const { t, language, setLanguage } = useLanguage();

    useEffect(() => {
        if (window.location.hostname === "localhost") {
            window.location.href = window.location.href.replace("localhost", "127.0.0.1");
        }
    }, []);

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'es' : 'en');
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4 relative">
            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium"
            >
                <Globe className="w-4 h-4" />
                {language.toUpperCase()}
            </button>

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
