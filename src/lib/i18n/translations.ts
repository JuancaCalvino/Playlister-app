export type Locale = 'en' | 'es';

export const translations = {
    en: {
        landing: {
            title: "Playlister",
            subtitle: "Your personal AI DJ. Create the perfect playlist for any mood, vibe, or moment in seconds.",
            cta: "Start Creating",
            features: {
                smart: "Smart Generation",
                smartDesc: "Powered by advanced AI to understand your musical taste deeply.",
                spotify: "Spotify Integration",
                spotifyDesc: "Save your playlists directly to your Spotify account instantly.",
                custom: "Fully Customizable",
                customDesc: "Edit, reorder, and refine your playlists with natural language."
            }
        },
        chat: {
            welcome: "Hi! I'm your AI DJ. Tell me what kind of music you're in the mood for.",
            inputPlaceholder: "Type a vibe, artist, or genre...",
            loading: {
                searching: "Searching for songs...",
                grouping: "Grouping songs...",
                creating: "Creating playlist..."
            },
            sidebar: {
                title: "Current Playlist",
                save: "Save",
                clearTitle: "Clear Playlist?",
                clearContent: "Are you sure you want to clear the current playlist? This action cannot be undone.",
                cancel: "Cancel",
                confirmClear: "Clear Playlist"
            },
            saveModal: {
                title: "Name your playlist",
                placeholder: "My Awesome Playlist",
                defaultName: "AI Playlist",
                cancel: "Cancel",
                save: "Save to Spotify"
            },
            successModal: {
                title: "Playlist Saved!",
                content: "Your playlist has been successfully created on Spotify.",
                open: "Open in Spotify",
                close: "Close"
            },
            replaceModal: {
                title: "Replace Song",
                searchPlaceholder: "Search for a song...",
                loadMore: "Load More",
                select: "Select"
            },
            errors: {
                generic: "Sorry, I had trouble finding that music. Please try again.",
                saveFailed: "Failed to save playlist",
                sessionExpired: "Session expired. Please refresh."
            }
        }
    },
    es: {
        landing: {
            title: "Playlister",
            subtitle: "Tu DJ personal con IA. Crea la playlist perfecta para cualquier estado de ánimo o momento en segundos.",
            cta: "Empezar a Crear",
            features: {
                smart: "Generación Inteligente",
                smartDesc: "Impulsado por IA avanzada para entender tus gustos musicales.",
                spotify: "Integración con Spotify",
                spotifyDesc: "Guarda tus playlists directamente en tu cuenta de Spotify al instante.",
                custom: "Totalmente Personalizable",
                customDesc: "Edita, reordena y refina tus playlists con lenguaje natural."
            }
        },
        chat: {
            welcome: "¡Hola! Soy tu DJ IA. Dime qué tipo de música te apetece escuchar.",
            inputPlaceholder: "Escribe una vibra, artista o género...",
            loading: {
                searching: "Buscando canciones...",
                grouping: "Agrupando canciones...",
                creating: "Creando playlist..."
            },
            sidebar: {
                title: "Playlist Actual",
                save: "Guardar",
                clearTitle: "¿Borrar Playlist?",
                clearContent: "¿Estás seguro de que quieres borrar la playlist actual? Esta acción no se puede deshacer.",
                cancel: "Cancelar",
                confirmClear: "Borrar Playlist"
            },
            saveModal: {
                title: "Nombra tu playlist",
                placeholder: "Mi Playlist Genial",
                defaultName: "Playlist IA",
                cancel: "Cancelar",
                save: "Guardar en Spotify"
            },
            successModal: {
                title: "¡Playlist Guardada!",
                content: "Tu playlist se ha creado exitosamente en Spotify.",
                open: "Abrir en Spotify",
                close: "Cerrar"
            },
            replaceModal: {
                title: "Reemplazar Canción",
                searchPlaceholder: "Buscar una canción...",
                loadMore: "Cargar Más",
                select: "Seleccionar"
            },
            errors: {
                generic: "Lo siento, tuve problemas para encontrar esa música. Por favor intenta de nuevo.",
                saveFailed: "Error al guardar la playlist",
                sessionExpired: "Sesión expirada. Por favor actualiza."
            }
        }
    }
};
