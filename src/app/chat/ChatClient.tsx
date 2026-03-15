"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Music, Loader2, Play, Plus, X, Trash2, GripVertical, RefreshCw, Search, Sparkles, Disc, CheckCircle2, ExternalLink, Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { useLanguage } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/translations";

type Message = {
    role: "user" | "assistant";
    content: string;
    playlist?: Track[];
};

type Track = {
    id: string;
    name: string;
    artist: string;
    album: string;
    uri: string;
    image?: string;
    instanceId: string; // Unique ID for UI handling (drag & drop)
};

export default function ChatClient() {
    const { t, language, setLanguage } = useLanguage();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: t('chat.welcome') }
    ]);

    // Update welcome message when language changes
    useEffect(() => {
        setMessages((prev) => {
            if (prev.length === 1 && prev[0].role === "assistant") {
                return [{ ...prev[0], content: t('chat.welcome') }];
            }
            return prev;
        });
    }, [language, t]);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatusText, setLoadingStatusText] = useState("");
    const statusStateRef = useRef({ key: "", lastUpdate: 0 });
    const [rejectedSongs, setRejectedSongs] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [currentContext, setCurrentContext] = useState<{ topic?: string, strict_genre?: string } | null>(null);

    // Replacement State
    const [replacingInstanceId, setReplacingInstanceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeSearchQuery, setActiveSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Track[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Save Playlist Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Success Modal State
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [savedPlaylistUrl, setSavedPlaylistUrl] = useState<string | null>(null);
    const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null);

    // Delete Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Language Dropdown State
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    useEffect(() => {
        // Check for token in URL
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get("token");

        if (urlToken) {
            setToken(urlToken);
            window.history.replaceState({}, "", "/chat"); // Clear URL
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const removeTrack = (instanceId: string) => {
        setCurrentPlaylist((prev) => prev.filter((t) => t.instanceId !== instanceId));
    };

    const openDeleteModal = () => setIsDeleteModalOpen(true);
    const closeDeleteModal = () => setIsDeleteModalOpen(false);

    const confirmClearPlaylist = () => {
        setCurrentPlaylist([]);
        closeDeleteModal();
    };

    const searchTracks = async (query: string, offsetVal: number, isLoadMore: boolean = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setIsSearching(true);
        }

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&offset=${offsetVal}`, {
                headers,
                signal: controller.signal
            });
            const data = await res.json();
            if (data.tracks) {
                const newTracks = data.tracks.map((t: Omit<Track, 'instanceId'>) => ({ ...t, instanceId: crypto.randomUUID() }));
                if (offsetVal === 0) {
                    setSearchResults(newTracks);
                } else {
                    setSearchResults(prev => {
                        const existingIds = new Set(prev.map(t => t.id));
                        const uniqueNewTracks = newTracks.filter((t: Track) => !existingIds.has(t.id));
                        return [...prev, ...uniqueNewTracks];
                    });
                }
                setHasMore(newTracks.length > 0);
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error("Search failed", error);
            }
        } finally {
            if (controller === abortControllerRef.current) {
                setIsSearching(false);
                setIsLoadingMore(false);
            }
        }
    };

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim()) {
                setActiveSearchQuery(searchQuery);
                setOffset(0);
                setHasMore(true);
                await searchTracks(searchQuery, 0, false);
            } else {
                setSearchResults([]);
                setOffset(0);
                setHasMore(true);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const loadMoreResults = async () => {
        const newOffset = offset + 50; // Match backend limit
        setOffset(newOffset);
        await searchTracks(activeSearchQuery, newOffset, true);
    };

    const replaceTrack = (newTrack: Track) => {
        if (!replacingInstanceId) return;

        // Generate a new instanceId for the replacement track
        const trackWithId = { ...newTrack, instanceId: crypto.randomUUID() };

        setCurrentPlaylist((prev) =>
            prev.map(t => t.instanceId === replacingInstanceId ? trackWithId : t)
        );
        setReplacingInstanceId(null);
        setSearchQuery("");
        setSearchResults([]);
        setOffset(0);
    };

    const [loadingStep, setLoadingStep] = useState(0);

    const loadingSteps = useMemo(() => [
        { text: t('chat.loading.searching'), icon: <Search className="w-5 h-5 animate-pulse text-green-500" /> },
        { text: t('chat.loading.grouping'), icon: <Music className="w-5 h-5 animate-bounce text-green-500" /> },
        { text: t('chat.loading.creating'), icon: <Loader2 className="w-5 h-5 animate-spin text-green-500" /> },
    ], [t]);

    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => {
                setLoadingStep((prev) => {
                    if (prev >= loadingSteps.length - 1) return prev;
                    return prev + 1;
                });
            }, 1500);
            return () => clearInterval(interval);
        } else {
            setLoadingStep(0);
        }
    }, [isLoading, loadingSteps]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");
        const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);
        setLoadingStatusText("");
        statusStateRef.current = { key: "", lastUpdate: 0 };

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            // Send the current playlist context to the AI
            const response = await fetch("/api/chat", {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    message: userMessage, // Send the latest user message as 'message'
                    messages: newMessages,
                    currentPlaylist: currentPlaylist.map(t => ({
                        id: t.id,
                        name: t.name, // Send as 'name' to match backend type
                        artist: t.artist,
                        uri: t.uri,
                        image: t.image,
                        album: t.album
                    })),
                    language, // Pass current language to API
                    previouslyRejected: Array.from(rejectedSongs), // Send rejected songs
                    context: currentContext // Send previous context (topic/genre)
                }),
                signal: controller.signal
            });

            if (response.status === 401) {
                window.location.href = "/?error=session_expired";
                return;
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);

                        if (event.type === 'status') {
                            const now = Date.now();
                            const isSameKey = statusStateRef.current.key === event.key;
                            const timeSinceLast = now - statusStateRef.current.lastUpdate;

                            // Update if:
                            // 1. It's a new key (different stage of loading)
                            // 2. It's the same key but enough time has passed (rotation)
                            if (!isSameKey || timeSinceLast > 4000) {
                                setLoadingStatusText(t(event.key, event.params));
                                statusStateRef.current = { key: event.key, lastUpdate: now };
                            }
                        } else if (event.type === 'rejected') {
                            // Track rejected songs to avoid suggesting them again
                            if (event.data && Array.isArray(event.data)) {
                                setRejectedSongs(prev => {
                                    const next = new Set(prev);
                                    event.data.forEach((song: string) => next.add(song));
                                    return next;
                                });
                            }
                        } else if (event.type === 'result') {
                            const data = event.data;

                            // Force show "Creating playlist..." step before showing results
                            setLoadingStep(loadingSteps.length - 1);
                            setLoadingStatusText(t('chat.loading.finalizing'));
                            await new Promise(resolve => setTimeout(resolve, 800));

                            // Update the current playlist with the new one from AI
                            if (data.tracks) {
                                // Assign unique instance IDs to each track
                                const tracksWithIds = data.tracks.map((t: Omit<Track, 'instanceId'>) => ({
                                    ...t,
                                    instanceId: crypto.randomUUID()
                                }));
                                setCurrentPlaylist(tracksWithIds);
                            }

                            // Save context for future requests
                            if (data.topic || data.strict_genre) {
                                setCurrentContext({ topic: data.topic, strict_genre: data.strict_genre });
                            }

                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: "assistant",
                                    content: data.message,
                                },
                            ]);
                        } else if (event.type === 'error') {
                            console.log("Received error event from server:", event.message);
                            throw new Error(event.message);
                        }
                    } catch (e) {
                        console.error("Error parsing stream line", e);
                    }
                }
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error("Error:", error);
                // Show error in the banner temporarily
                setLoadingStatusText(error.message || t('chat.errors.generic'));
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } finally {
            if (controller === abortControllerRef.current) {
                setIsLoading(false);
                setLoadingStatusText("");
            }
        }
    };

    const openSaveModal = () => {
        setPlaylistName(`${t('chat.saveModal.defaultName')} - ${new Date().toLocaleDateString()}`);
        setIsSaveModalOpen(true);
    };

    const closeSaveModal = () => {
        setIsSaveModalOpen(false);
        setIsSaving(false);
    };

    const confirmSavePlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playlistName.trim() || isSaving) return;

        setIsSaving(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/playlist/create", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: playlistName,
                    tracks: currentPlaylist
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setSavedPlaylistUrl(data.playlistUrl);
                setSavedPlaylistId(data.playlistId);
                closeSaveModal();
                setIsSuccessModalOpen(true);
            } else {
                throw new Error("Failed to save");
            }
        } catch (e) {
            alert(t('chat.errors.saveFailed'));
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white relative">
            {/* Replacement Modal */}
            {replacingInstanceId && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-neutral-700 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl text-white">{t('chat.replaceModal.title')}</h3>
                            <button onClick={() => setReplacingInstanceId(null)} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-700 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder={t('chat.replaceModal.searchPlaceholder')}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                            {isSearching ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                                    <p>{t('chat.loading.searching')}</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <>
                                    {searchResults.map((track) => (
                                        <button
                                            key={track.id}
                                            onClick={() => replaceTrack(track)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-neutral-700/50 rounded-xl transition-colors group text-left"
                                        >
                                            <img src={track.image} alt={track.album} className="w-12 h-12 rounded-md object-cover shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-white truncate">{track.name}</div>
                                                <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                                            </div>
                                            <div className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                {t('chat.replaceModal.select')}
                                            </div>
                                        </button>
                                    ))}
                                    {hasMore && (
                                        <button
                                            onClick={loadMoreResults}
                                            disabled={isLoadingMore}
                                            className="w-full py-3 text-sm text-gray-400 hover:text-white hover:bg-neutral-700/50 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : t('chat.replaceModal.loadMore')}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                                    <Search className="w-8 h-8 opacity-20" />
                                    <p>{t('chat.replaceModal.searchPlaceholder')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Playlist Modal */}
            {isSaveModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-white">{t('chat.saveModal.title')}</h3>
                            <button onClick={closeSaveModal} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-700 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={confirmSavePlaylist} className="space-y-6">
                            <div className="space-y-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={playlistName}
                                    onChange={(e) => setPlaylistName(e.target.value)}
                                    placeholder={t('chat.saveModal.placeholder')}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={closeSaveModal}
                                    className="px-5 py-2.5 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                                >
                                    {t('chat.saveModal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !playlistName.trim()}
                                    className="px-6 py-2.5 bg-green-500 text-black font-bold rounded-full text-sm hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('chat.saveModal.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-white">{t('chat.sidebar.clearTitle')}</h3>
                            <button onClick={closeDeleteModal} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-700 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-gray-400 mb-6">
                            {t('chat.sidebar.clearContent')}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeDeleteModal}
                                className="px-5 py-2.5 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                            >
                                {t('chat.sidebar.cancel')}
                            </button>
                            <button
                                onClick={confirmClearPlaylist}
                                className="px-6 py-2.5 bg-red-500 text-white font-bold rounded-full text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                {t('chat.sidebar.confirmClear')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {isSuccessModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-800 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-neutral-700 animate-in fade-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="font-bold text-2xl text-white mb-2">{t('chat.successModal.title')}</h3>
                        <p className="text-gray-400 mb-8">{t('chat.successModal.content')}</p>

                        <div className="flex flex-col gap-3">
                            {savedPlaylistId && (
                                <a
                                    href={`spotify:playlist:${savedPlaylistId}`}
                                    className="w-full py-3 bg-green-500 text-black font-bold rounded-full hover:bg-green-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                >
                                    {t('chat.successModal.open')} <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {savedPlaylistUrl && (
                                <a
                                    href={savedPlaylistUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 bg-neutral-700 text-white font-bold rounded-full hover:bg-neutral-600 transition-all flex items-center justify-center gap-2"
                                >
                                    Open in Browser <Globe className="w-4 h-4" />
                                </a>
                            )}
                            <button
                                onClick={() => setIsSuccessModalOpen(false)}
                                className="w-full py-3 rounded-full font-medium text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                            >
                                {t('chat.successModal.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Language Selector Backdrop - Moved out of header to avoid backdrop-blur clipping */}
            {isLanguageOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsLanguageOpen(false)} />
            )}

            {/* Header */}
            <header className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-full">
                        <Music className="w-5 h-5 text-green-500" />
                    </div>
                    <h1 className="font-bold text-lg">AI Playlist Gen</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs font-medium text-gray-300 hover:text-white border border-transparent hover:border-neutral-600"
                        >
                            <Globe className="w-3 h-3" />
                            <span className="uppercase">{language}</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", isLanguageOpen ? "rotate-180" : "")} />
                        </button>

                        {isLanguageOpen && (
                            <>
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
                            </>
                        )}
                    </div>
                    {currentPlaylist.length > 0 && (
                        <button
                            onClick={openSaveModal}
                            className="px-4 py-2 bg-green-500 text-black font-bold rounded-full text-sm hover:bg-green-400 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> {t('chat.sidebar.save')} ({currentPlaylist.length})
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area - Split View on Desktop, Stacked on Mobile */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex flex-col max-w-[85%] space-y-2",
                                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-4 rounded-3xl text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-green-600 text-white rounded-tr-none"
                                        : "bg-neutral-800 text-gray-100 rounded-tl-none"
                                )}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Playlist Preview Sidebar (Visible if songs exist) */}
                {currentPlaylist.length > 0 && (
                    <div className="h-1/3 md:h-full md:w-96 bg-neutral-800/30 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col">
                        <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    {t('chat.sidebar.title')}
                                </span>
                                <span className="text-xs bg-neutral-700 px-2 py-1 rounded-full">
                                    {currentPlaylist.length} songs
                                </span>
                            </div>
                            <button
                                onClick={openDeleteModal}
                                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                title={t('chat.sidebar.clearTitle')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                            <Reorder.Group axis="y" values={currentPlaylist} onReorder={setCurrentPlaylist} className="space-y-1">
                                {currentPlaylist.map((track, i) => (
                                    <Reorder.Item
                                        key={track.instanceId}
                                        value={track}
                                        className="flex items-center gap-3 p-2 hover:bg-neutral-700/50 rounded-2xl group transition-colors bg-neutral-800/0 hover:bg-neutral-700/50 cursor-default"
                                    >
                                        <GripVertical className="w-4 h-4 text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0" />

                                        <button
                                            onClick={() => setReplacingInstanceId(track.instanceId)}
                                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                            title="Replace Song"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </button>

                                        {track.image && (
                                            <img src={track.image} alt={track.album} className="w-10 h-10 rounded-xl shadow-sm select-none pointer-events-none flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0 select-none">
                                            <p className="font-medium text-sm truncate">{track.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                        </div>
                                        <button
                                            onClick={() => removeTrack(track.instanceId)}
                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-neutral-900 border-t border-neutral-800 z-20 flex flex-col gap-2">
                {isLoading && (
                    <div className="mx-auto bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 text-green-400 px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingSteps[loadingStep].icon}
                        <span>{loadingStatusText || loadingSteps[loadingStep].text}</span>
                    </div>
                )}
                <div className="relative max-w-4xl mx-auto w-full">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                        placeholder={isLoading ? t('chat.loading.creating') : t('chat.inputPlaceholder')}
                        className="w-full bg-neutral-800 text-white rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-2 p-2 bg-green-500 rounded-full text-black hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
