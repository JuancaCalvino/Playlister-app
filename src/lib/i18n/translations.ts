export type Locale = "en" | "es" | "fr" | "de" | "it" | "pt";

export const translations = {
  en: {
    landing: {
      title: "Playlister",
      subtitle:
        "Your personal AI DJ. Create the perfect playlist for any mood, vibe, or moment in seconds.",
      cta: "Start Creating",
      features: {
        smart: "Smart Generation",
        smartDesc:
          "Powered by advanced AI to understand your musical taste deeply.",
        spotify: "Spotify Integration",
        spotifyDesc:
          "Save your playlists directly to your Spotify account instantly.",
        custom: "Fully Customizable",
        customDesc:
          "Edit, reorder, and refine your playlists with natural language.",
      },
      sessionExpired: {
        title: "Session Expired",
        message: "Your session has expired. Please refresh to continue.",
        refresh: "Refresh",
        dismiss: "Dismiss",
      },
    },
    chat: {
      welcome:
        "Hi! I'm your AI DJ. Tell me what kind of music you're in the mood for.",
      inputPlaceholder:
        "Write artists, genres, desired durations, festivals...",
      loading: {
        searching: "Searching for songs...",
        grouping: "Grouping songs...",
        creating: "Creating playlist...",
        ai_generating: "Generating songs with AI...",
        processing_batch: [
          "Consulting the music gods...",
          "Teaching the AI to dance...",
          "Digging through the crates...",
          "Convincing Spotify to be cool...",
          "Mixing the magic potion...",
          "Calling a backup DJ...",
          "Calculating optimal reverb levels...",
        ],
        found_songs: "Found {count} unique songs...",
        finalizing: "Finalizing playlist...",
      },
      sidebar: {
        title: "Current Playlist",
        save: "Save",
        clearTitle: "Clear Playlist?",
        clearContent:
          "Are you sure you want to clear the current playlist? This action cannot be undone.",
        cancel: "Cancel",
        confirmClear: "Clear Playlist",
      },
      saveModal: {
        title: "Name your playlist",
        placeholder: "My Awesome Playlist",
        defaultName: "AI Playlist",
        cancel: "Cancel",
        save: "Save to Spotify",
      },
      successModal: {
        title: "Playlist Saved!",
        content: "Your playlist has been successfully created on Spotify.",
        open: "Open in Spotify",
        close: "Close",
      },
      replaceModal: {
        title: "Replace Song",
        searchPlaceholder: "Search for a song...",
        loadMore: "Load More",
        select: "Select",
      },
      errors: {
        generic: "Sorry, I had trouble finding that music. Please try again.",
        saveFailed: "Failed to save playlist",
        sessionExpired: "Session expired. Please refresh.",
        aiFailed: "The AI is having a bit of trouble. Give it another moment!",
      },
    },
  },

  es: {
    landing: {
      title: "Playlister",
      subtitle:
        "Tu DJ personal con IA. Crea la playlist perfecta para cualquier estado de ánimo o momento en segundos.",
      cta: "Empezar a Crear",
      features: {
        smart: "Generación Inteligente",
        smartDesc:
          "Impulsado por IA avanzada para entender tus gustos musicales.",
        spotify: "Integración con Spotify",
        spotifyDesc:
          "Guarda tus playlists directamente en tu cuenta de Spotify al instante.",
        custom: "Totalmente Personalizable",
        customDesc:
          "Edita, reordena y refina tus playlists con lenguaje natural.",
      },
      sessionExpired: {
        title: "Sesión Expirada",
        message: "Tu sesión ha expirado. Por favor actualiza para continuar.",
        refresh: "Actualizar",
        dismiss: "Descartar",
      },
    },
    chat: {
      welcome:
        "¡Hola! Soy tu DJ IA. Dime qué tipo de música te apetece escuchar.",
      inputPlaceholder:
        "Escribe artistas, géneros, duraciones deseadas, festivales...",
      loading: {
        searching: "Buscando canciones...",
        grouping: "Agrupando canciones...",
        creating: "Creando playlist...",
        ai_generating: "La IA está buscando canciones...",
        processing_batch: [
          "Consultando a los dioses de la música...",
          "Enseñándole a bailar a la IA...",
          "Desempolvando los discos...",
          "Convenciendo a Spotify...",
          "Preguntando en discotecas...",
          "Llamando a un DJ de refuerzo...",
          "Calculando el nivel óptimo de reverb...",
        ],
        found_songs: "Encontradas {count} canciones únicas...",
        finalizing: "Finalizando playlist...",
      },
      sidebar: {
        title: "Playlist Actual",
        save: "Guardar",
        clearTitle: "¿Borrar Playlist?",
        clearContent:
          "¿Estás seguro de que quieres borrar la playlist actual? Esta acción no se puede deshacer.",
        cancel: "Cancelar",
        confirmClear: "Borrar Playlist",
      },
      saveModal: {
        title: "Nombra tu playlist",
        placeholder: "Mi Playlist Genial",
        defaultName: "Playlist IA",
        cancel: "Cancelar",
        save: "Guardar en Spotify",
      },
      successModal: {
        title: "¡Playlist Guardada!",
        content: "Tu playlist se ha creado exitosamente en Spotify.",
        open: "Abrir en Spotify",
        close: "Cerrar",
      },
      replaceModal: {
        title: "Reemplazar Canción",
        searchPlaceholder: "Buscar una canción...",
        loadMore: "Cargar Más",
        select: "Seleccionar",
      },
      errors: {
        generic:
          "Lo siento, tuve problemas para encontrar esa música. Por favor intenta de nuevo.",
        saveFailed: "Error al guardar la playlist",
        sessionExpired: "Sesión expirada. Por favor actualiza.",
        aiFailed: "La IA está teniendo problemas. ¡Dale un momento!",
      },
    },
  },
  fr: {
    landing: {
      title: "Playlister",
      subtitle:
        "Votre DJ IA personnel. Créez la playlist parfaite pour toute ambiance en quelques secondes.",
      cta: "Commencer à créer",
      features: {
        smart: "Génération Intelligente",
        smartDesc:
          "Propulsé par une IA avancée pour comprendre vos goûts musicaux.",
        spotify: "Intégration Spotify",
        spotifyDesc:
          "Sauvegardez vos playlists directement sur votre compte Spotify.",
        custom: "Entièrement Personnalisable",
        customDesc:
          "Éditez, réorganisez et affinez vos playlists avec un langage naturel.",
      },
      sessionExpired: {
        title: "Session Expirée",
        message: "Votre session a expiré. Veuillez rafraîchir pour continuer.",
        refresh: "Rafraîchir",
        dismiss: "Ignorer",
      },
    },
    chat: {
      welcome:
        "Salut ! Je suis votre DJ IA. Dites-moi ce que vous voulez écouter.",
      inputPlaceholder: "Artistes, genres, ambiance, festivals...",
      loading: {
        searching: "Recherche de chansons...",
        grouping: "Regroupement des titres...",
        creating: "Création de la playlist...",
        ai_generating: "L'IA cherche des chansons...",
        processing_batch: [
          "Consultation des dieux de la musique...",
          "Apprentissage de la danse à l'IA...",
          "Dépoussiérage des vinyles...",
          "Négociation avec Spotify...",
          "Sondage dans les discothèques...",
          "Appel à un DJ de renfort...",
          "Calcul du niveau optimal de réverbération...",
        ],
        found_songs: "{count} chansons trouvées...",
        finalizing: "Finalisation de la playlist...",
      },
      sidebar: {
        title: "Playlist Actuelle",
        save: "Sauvegarder",
        clearTitle: "Effacer la playlist ?",
        clearContent:
          "Êtes-vous sûr de vouloir effacer la playlist actuelle ? Cette action est irréversible.",
        cancel: "Annuler",
        confirmClear: "Effacer",
      },
      saveModal: {
        title: "Nommez votre playlist",
        placeholder: "Ma Super Playlist",
        defaultName: "Playlist IA",
        cancel: "Annuler",
        save: "Sauvegarder sur Spotify",
      },
      successModal: {
        title: "Playlist Sauvegardée !",
        content: "Votre playlist a été créée avec succès sur Spotify.",
        open: "Ouvrir dans Spotify",
        close: "Fermer",
      },
      replaceModal: {
        title: "Remplacer la chanson",
        searchPlaceholder: "Rechercher une chanson...",
        loadMore: "Charger plus",
        select: "Sélectionner",
      },
      errors: {
        generic:
          "Désolé, j'ai eu du mal à trouver cette musique. Veuillez réessayer.",
        saveFailed: "Échec de la sauvegarde",
        sessionExpired: "Session expirée. Veuillez rafraîchir.",
        aiFailed: "L'IA rencontre des difficultés. Donnez-lui un instant !",
      },
    },
  },
  de: {
    landing: {
      title: "Playlister",
      subtitle:
        "Dein persönlicher KI-DJ. Erstelle in Sekunden die perfekte Playlist für jede Stimmung.",
      cta: "Erstellen starten",
      features: {
        smart: "Intelligente Generierung",
        smartDesc:
          "Angetrieben von fortschrittlicher KI, um deinen Musikgeschmack zu verstehen.",
        spotify: "Spotify Integration",
        spotifyDesc:
          "Speichere deine Playlists sofort in deinem Spotify-Konto.",
        custom: "Vollständig Anpassbar",
        customDesc:
          "Bearbeite und verfeinere deine Playlists mit natürlicher Sprache.",
      },
      sessionExpired: {
        title: "Sitzung Abgelaufen",
        message: "Deine Sitzung ist abgelaufen. Bitte aktualisieren.",
        refresh: "Aktualisieren",
        dismiss: "Verwerfen",
      },
    },
    chat: {
      welcome: "Hallo! Ich bin dein KI-DJ. Sag mir, worauf du Lust hast.",
      inputPlaceholder: "Künstler, Genres, Stimmung, Festivals...",
      loading: {
        searching: "Suche nach Songs...",
        grouping: "Gruppiere Songs...",
        creating: "Erstelle Playlist...",
        ai_generating: "Die KI sucht nach Songs...",
        processing_batch: [
          "Befrage die Musik-Götter...",
          "Bringe der KI das Tanzen bei...",
          "Staube die Platten ab...",
          "Überrede Spotify...",
          "Frage in den Clubs nach...",
          "Rufe einen Backup-DJ...",
          "Berechne optimalen Reverb-Pegel...",
        ],
        found_songs: "{count} Songs gefunden...",
        finalizing: "Playlist wird fertiggestellt...",
      },
      sidebar: {
        title: "Aktuelle Playlist",
        save: "Speichern",
        clearTitle: "Playlist löschen?",
        clearContent:
          "Bist du sicher? Dies kann nicht rückgängig gemacht werden.",
        cancel: "Abbrechen",
        confirmClear: "Löschen",
      },
      saveModal: {
        title: "Benenne deine Playlist",
        placeholder: "Meine Tolle Playlist",
        defaultName: "KI Playlist",
        cancel: "Abbrechen",
        save: "In Spotify speichern",
      },
      successModal: {
        title: "Playlist Gespeichert!",
        content: "Deine Playlist wurde erfolgreich erstellt.",
        open: "In Spotify öffnen",
        close: "Schließen",
      },
      replaceModal: {
        title: "Song ersetzen",
        searchPlaceholder: "Suche nach einem Song...",
        loadMore: "Mehr laden",
        select: "Auswählen",
      },
      errors: {
        generic: "Entschuldigung, ich konnte diese Musik nicht finden.",
        saveFailed: "Fehler beim Speichern",
        sessionExpired: "Sitzung abgelaufen.",
        aiFailed: "Die KI hat gerade Probleme. Einen Moment!",
      },
    },
  },
  it: {
    landing: {
      title: "Playlister",
      subtitle:
        "Il tuo DJ AI personale. Crea la playlist perfetta per ogni momento in pochi secondi.",
      cta: "Inizia a Creare",
      features: {
        smart: "Generazione Intelligente",
        smartDesc:
          "Alimentato da AI avanzata per capire i tuoi gusti musicali.",
        spotify: "Integrazione Spotify",
        spotifyDesc: "Salva le tue playlist direttamente su Spotify.",
        custom: "Completamente Personalizzabile",
        customDesc:
          "Modifica e rifinisci le tue playlist con linguaggio naturale.",
      },
      sessionExpired: {
        title: "Sessione Scaduta",
        message: "La tua sessione è scaduta. Ricarica per continuare.",
        refresh: "Ricarica",
        dismiss: "Chiudi",
      },
    },
    chat: {
      welcome: "Ciao! Sono il tuo DJ AI. Dimmi cosa vuoi ascoltare.",
      inputPlaceholder: "Artisti, generi, mood, festival...",
      loading: {
        searching: "Cercando canzoni...",
        grouping: "Raggruppando i brani...",
        creating: "Creando playlist...",
        ai_generating: "L'IA sta cercando canzoni...",
        processing_batch: [
          "Consultando gli dei della musica...",
          "Insegnando all'IA a ballare...",
          "Spolverando i vinili...",
          "Convincendo Spotify...",
          "Chiedendo nei club...",
          "Chiamando un DJ di rinforzo...",
          "Calcolando il livello ottimale di riverbero...",
        ],
        found_songs: "Trovate {count} canzoni...",
        finalizing: "Finalizzando la playlist...",
      },
      sidebar: {
        title: "Playlist Attuale",
        save: "Salva",
        clearTitle: "Cancellare Playlist?",
        clearContent:
          "Sei sicuro di voler cancellare la playlist? Non si può annullare.",
        cancel: "Annulla",
        confirmClear: "Cancella",
      },
      saveModal: {
        title: "Dai un nome alla playlist",
        placeholder: "La Mia Playlist",
        defaultName: "Playlist AI",
        cancel: "Annulla",
        save: "Salva su Spotify",
      },
      successModal: {
        title: "Playlist Salvata!",
        content: "La tua playlist è stata creata su Spotify.",
        open: "Apri in Spotify",
        close: "Chiudi",
      },
      replaceModal: {
        title: "Sostituisci Canzone",
        searchPlaceholder: "Cerca una canzone...",
        loadMore: "Carica Altro",
        select: "Seleziona",
      },
      errors: {
        generic: "Scusa, ho avuto problemi a trovare quella musica.",
        saveFailed: "Errore nel salvataggio",
        sessionExpired: "Sessione scaduta.",
        aiFailed: "L'IA sta avendo problemi. Dalle un attimo!",
      },
    },
  },
  pt: {
    landing: {
      title: "Playlister",
      subtitle:
        "Seu DJ de IA pessoal. Crie a playlist perfeita para qualquer momento em segundos.",
      cta: "Começar a Criar",
      features: {
        smart: "Geração Inteligente",
        smartDesc:
          "Impulsionado por IA avançada para entender seu gosto musical.",
        spotify: "Integração Spotify",
        spotifyDesc: "Salve suas playlists diretamente na sua conta Spotify.",
        custom: "Totalmente Personalizável",
        customDesc: "Edite e refine suas playlists com linguagem natural.",
      },
      sessionExpired: {
        title: "Sessão Expirada",
        message: "Sua sessão expirou. Por favor, atualize para continuar.",
        refresh: "Atualizar",
        dismiss: "Dispensar",
      },
    },
    chat: {
      welcome: "Olá! Sou seu DJ de IA. Diga-me o que você quer ouvir.",
      inputPlaceholder: "Artistas, gêneros, humor, festivais...",
      loading: {
        searching: "Procurando músicas...",
        grouping: "Agrupando músicas...",
        creating: "Criando playlist...",
        ai_generating: "A IA está procurando músicas...",
        processing_batch: [
          "Consultando os deuses da música...",
          "Ensinando a IA a dançar...",
          "Tirando a poeira dos discos...",
          "Convencendo o Spotify...",
          "Perguntando nas baladas...",
          "Chamando um DJ de reforço...",
          "Calculando o nível ideal de reverb...",
        ],
        found_songs: "Encontradas {count} músicas únicas...",
        finalizing: "Finalizando playlist...",
      },
      sidebar: {
        title: "Playlist Atual",
        save: "Salvar",
        clearTitle: "Limpar Playlist?",
        clearContent:
          "Tem certeza que deseja limpar a playlist? Isso não pode ser desfeito.",
        cancel: "Cancelar",
        confirmClear: "Limpar",
      },
      saveModal: {
        title: "Nomeie sua playlist",
        placeholder: "Minha Playlist Incrível",
        defaultName: "Playlist IA",
        cancel: "Cancelar",
        save: "Salvar no Spotify",
      },
      successModal: {
        title: "Playlist Salva!",
        content: "Sua playlist foi criada com sucesso no Spotify.",
        open: "Abrir no Spotify",
        close: "Fechar",
      },
      replaceModal: {
        title: "Substituir Música",
        searchPlaceholder: "Procurar uma música...",
        loadMore: "Carregar Mais",
        select: "Selecionar",
      },
      errors: {
        generic: "Desculpe, tive problemas para encontrar essa música.",
        saveFailed: "Falha ao salvar",
        sessionExpired: "Sessão expirada.",
        aiFailed: "A IA está com problemas. Dê um momento!",
      },
    },
  },
};
