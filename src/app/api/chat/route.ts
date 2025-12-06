import { openai } from "@/lib/openai";
import { spotifyApi } from "@/lib/spotify";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const {
    message,
    currentPlaylist,
    language = "en",
    previouslyRejected = [],
    context = null,
  } = await request.json();
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("spotify_access_token")?.value;

  // Fallback: Check Authorization header
  if (!accessToken) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        // Set the access token for this request
        spotifyApi.setAccessToken(accessToken!);

        // Construct the system prompt with context
        const systemPrompt = `You are a helpful music assistant. 
                  The user will describe a mood, genre, or context. 
                  
                  CURRENT DATE: ${new Date().toLocaleDateString()} (Use this to find "latest" or "recent" songs)
                  USER LANGUAGE: ${
                    language === "es" ? "Spanish (Español)" : "English"
                  }
                  
                  CURRENT PLAYLIST CONTEXT (DO NOT SUGGEST THESE - THEY ARE ALREADY ADDED):
                  ${
                    currentPlaylist
                      ? JSON.stringify(
                          currentPlaylist
                            .map(
                              (t: {
                                name?: string;
                                title?: string;
                                artist: string;
                              }) => `${t.name || t.title} - ${t.artist}`
                            )
                            .slice(-100)
                        )
                      : "[]"
                  }

                  PREVIOUS CONTEXT (MAINTAIN THIS GENRE/TOPIC UNLESS CHANGED):
                  ${context ? JSON.stringify(context) : "None"}

        NEGATIVE CONSTRAINTS (DO NOT SUGGEST THESE SONGS - THEY FAILED PREVIOUSLY):
                  ${JSON.stringify(previouslyRejected.slice(-50))}

                  INSTRUCTIONS:
                  1. If the user wants to CREATE a new playlist, ignore the current context and generate a fresh list.
                  2. If the user wants to ADD to the playlist, append new songs to the current list.
                  3. If the user wants to REMOVE or MODIFY, update the current list accordingly.
                  4. QUANTITY LOGIC (CRITICAL): 
                     - DURATION REQUESTS: If user asks for time (e.g. "2 hours", "30 mins"), convert to song count assuming 3.5 minutes per song.
                       Example: "2 hours" = 120 mins / 3.5 ≈ 35 songs.
                     - BUFFERING: ALWAYS generate DOUBLE (2x) the required amount. Search is now optimized, but validation still rejects non-genre matches.
                       Example: User wants 20 songs -> Generate 40.
                       Example: User wants 40 songs -> Generate 80.
                     - MAX LIMIT: Cap at 150 songs per batch.
                     - CRITICAL: It is better to generate TOO MANY than too few. The system will filter them. 
                     - If no number/duration specified, default to generating ~30 songs (buffer included).
                  5. STRICT GENRE ADHERENCE: This is critical. If the user asks for "Techno", EVERY single song must be Techno. Do NOT include Pop, Reggaeton, or other genres.
                  6. NO DUPLICATES. Check the 'CURRENT PLAYLIST CONTEXT' above. Do NOT suggest any song that pairs with those Titles+Artists. Ensure every song is unique.
                  7. RANDOMNESS: Randomize the order of the songs. Do NOT output them in popularity order.
                  
                  You must return a JSON object with EIGHT fields:
                  1. 'message': A short, friendly response to the user (assuming all songs are found) IN THE USER'S LANGUAGE (${
                    language === "es" ? "Spanish" : "English"
                  }).
                  2. 'songs': An array of song objects, each with 'title' and 'artist'. 
                     - CRITICAL: THIS ARRAY MUST BE 2x THE SIZE OF THE USER REQUEST. (e.g. if user wants 20, generate 40).
                     - DEPTH & VARIETY: For large specific requests (e.g. "100 Rap songs"), you MUST include MULTIPLE hits (2-5) from the genre's KEY artists. 
                     - Example: For "Spanish Rap", include 3-4 songs each by Nach, SFDK, Kase.O, Violadores del Verso, etc. Don't just pick one.
                     - Ensure the list feels "Curated" and "Complete" for that genre.
                  3. 'topic': A short string describing the playlist content (e.g. "Lady Gaga", "Techno", "90s Rock").
                     - CRITICAL: If the user says "add more", "similar", or "continue", USE THE PREVIOUS CONTEXT TOPIC even if they add extra words like "2 hours".
                     - CRITICAL: Do NOT use "Time", "Hours", or "Minutes" as the topic unless the user explicitly asks for songs ABOUT time.
                     - INTELLIGENT TYPO HANDLING: If user says "por", assume they meant "POP", do the same for other typos.
                     - CONTEXT MERGING: If user corrects a previous request (e.g. "I meant classic pop"), MERGE it with previous context (e.g. "Spanish") -> "Classic Spanish Pop".
                  4. 'target_count': The integer number of songs the user EXPLICITLY requested. 
                     - PERSISTENCE: If the user corrects a previous request but doesn't mention a new number, USE THE PREVIOUS TARGET COUNT (e.g. 100).
                  5. 'partial_success_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${
                    language === "es" ? "Spanish" : "English"
                  }) to report that fewer songs were found than requested. 
                     - Do NOT use the same phrase every time. Adapt to the conversation context.
                     - Use placeholder "{added_count}" for the number of NEW songs added in this request.
                     - Use placeholder "{total_count}" for the TOTAL number of songs in the playlist.
                     - Examples: "Found {added_count} {topic} tracks for you.", "Managed to add {added_count} songs to the {topic} mix.", "You now have {total_count} {topic} hits."
                     - CRITICAL: Do NOT put the number directly in the string. ALWAYS use placeholders.
                  6. 'success_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${
                    language === "es" ? "Spanish" : "English"
                  }) to report success.
                     - CRITICAL: NO REPETITION. Check the previous messages. Do NOT use the same phrase or structure as the last 3 responses.
                     - Examples: 
                        "Done! {added_count} {topic} tracks added to the mix."
                        "I found {added_count} more songs for you."
                        "Playlist updated with {added_count} {topic} hits."
                        "Here you go, {added_count} tracks ready to play."
                     - CRITICAL: Do NOT describe the songs as "new" or "latest" unless the user explicitly asked for new releases.
                     - Use placeholder "{added_count}" for the number of NEW songs added in this request.
                     - Use placeholder "{total_count}" for the TOTAL number of songs in the playlist.
                     - CRITICAL: Do NOT put the number (e.g. "30") directly in the string. ALWAYS use placeholders.
                     - INCORRECT: "Aquí tienes 30 canciones de techno."
                     - INCORRECT: "Disfruta de estas nuevas canciones." (Do not use "nuevas" unless asked)
                     - CORRECT: "Aquí tienes {added_count} canciones más de techno."
                  7. 'strict_genre': (Optional) If the user explicitly requested a specific genre, include it here.
                     - CRITICAL: MUST be a single, standard Spotify genre (e.g. "Reggaeton", "Pop", "Rock"). 
                     - CRITICAL: Do NOT include descriptive words like "para perrear", "80s", "Classic". Put those in 'playlist_keywords'.
                     - INCORRECT: "Reggaeton para perrear en la discoteca"
                     - CORRECT: "Reggaeton"
                  8. 'playlist_keywords': (Optional) A list of strings to search for REFERENCE playlists. 
                     - Use this for sub-genres, vibes, or contexts.
                     - EXTRACT ALL descriptive words. Normalize them (e.g. "perrear" -> "perreo").
                     - Example: User asks for "Reggaeton para perrear" -> strict_genre: "Reggaeton", playlist_keywords: ["perreo", "discoteca", "party", "reggaeton antiguo"].
                  9. 'action': (Required) One of "create" (new playlist), "add" (append songs), or "modify" (change/remove songs).
                     - If "add", return ONLY the NEW songs in the 'songs' array.
                     - If "create" or "modify", return the COMPLETE playlist.
                  10. 'failure_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${
                    language === "es" ? "Spanish" : "English"
                  }) to apologize for zero results.
                     - Examples: "Couldn't find any {topic} songs right now, sorry.", "No luck finding {topic} tracks this time."
                     - It MUST contain the placeholder "{topic}".
                  
                  Example JSON format:
                  {
                    "message": "Aquí tienes...",
                    "songs": [ ... ],
                    "topic": "Techno",
                    "target_count": 20,
                    "action": "add",
                    "playlist_keywords": ["techno bunker", "dark techno"],
                    "partial_success_format": "...",
                    "success_format": "...",
                    "failure_format": "..."
                  }
                  Return ONLY the JSON. Do not include markdown formatting. 
                  Generate COMPACT JSON (no unnecessary whitespace) to ensure the full list fits.`;

        send({ type: "status", key: "chat.loading.ai_generating" });

        // 1. Analyze request for quantity to inject explicit instruction
        // Check for Duration (Hours/Minutes) first
        const hourMatch = message.match(
          /(\d+(?:\.\d+)?)\s*(?:hours?|horas?|hrs?)/i
        );
        const minMatch = message.match(/(\d+)\s*(?:minutes?|minutos?|mins?)/i);

        let requestedCount = 15; // Default

        if (hourMatch) {
          const hours = parseFloat(hourMatch[1]);
          requestedCount = Math.ceil((hours * 60) / 3.5); // ~3.5 mins per song
          console.log(
            `Detected duration request: ${hours} hours -> ${requestedCount} songs`
          );
        } else if (minMatch) {
          const mins = parseInt(minMatch[1]);
          requestedCount = Math.ceil(mins / 3.5);
          console.log(
            `Detected duration request: ${mins} mins -> ${requestedCount} songs`
          );
        } else {
          // Check for explicit song count
          const countMatch = message.match(
            /(\d+)\s*(songs?|tracks?|canciones|temas|pistas|m[uú]sicas?)/i
          );
          if (countMatch) {
            requestedCount = parseInt(countMatch[1]);
          }
        }
        // Cap reasonably to avoid context limits
        if (requestedCount > 100) requestedCount = 100;

        const bufferMultiplier = requestedCount >= 50 ? 1.3 : 2; // Reduced to 1.3x for large lists to prevent JSON degradation
        const targetGenCount = Math.ceil(requestedCount * bufferMultiplier);

        const enforcedMessage = `${message} (IMPORTANT SYSTEM INSTRUCTION: User wants ${requestedCount} songs. You MUST generate exactly ${targetGenCount} unique songs in the JSON to allow for filtering. Do NOT stop early. Generate ${targetGenCount} items.)`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                systemPrompt +
                `\n\nCRITICAL: User requested ${requestedCount} songs. You MUST generate a list of ${targetGenCount} songs. Do not be lazy. Fill the array.`,
            },
            { role: "user", content: enforcedMessage },
          ],
          response_format: { type: "json_object" },
          max_tokens: 16384,
          frequency_penalty: 0.2,
        });

        let aiResponse;
        try {
          aiResponse = JSON.parse(
            completion.choices[0].message.content || "{}"
          );
        } catch (e) {
          console.error("Failed to parse AI response:", e);
          console.error(
            "Raw content (start):",
            completion.choices[0].message.content?.substring(0, 500)
          );
          console.error(
            "Raw content (end):",
            completion.choices[0].message.content?.slice(-500)
          );
          throw new Error("The AI got a bit confused. Please try again!");
        }

        if (!aiResponse.songs || !Array.isArray(aiResponse.songs)) {
          throw new Error("Invalid AI response format");
        }

        console.log(
          "DEBUG: Raw AI Response:",
          JSON.stringify(
            {
              strict_genre: aiResponse.strict_genre,
              playlist_keywords: aiResponse.playlist_keywords,
              topic: aiResponse.topic,
            },
            null,
            2
          )
        );

        // SANITIZE: Remove malformed entries (missing title/artist) which happen if AI gets "tired"
        aiResponse.songs = aiResponse.songs.filter(
          (s: any) =>
            s &&
            typeof s.title === "string" &&
            typeof s.artist === "string" &&
            s.artist.length > 0
        );

        // EXTRA SANITIZATION: Fix "Miky Woodz x Miky Woodz" repetition hallucination
        aiResponse.songs = aiResponse.songs.map((s: any) => {
          // 1. Split by common separators (including +)
          const rawArtists = s.artist.split(
            /\s+(?:x|ft\.|feat\.|,|&|\+)\s+|\s*[,\+]\s*/i
          );
          // 2. Normalize and Deduplicate
          const seen = new Set<string>();
          const uniqueArtists: string[] = [];

          for (const a of rawArtists) {
            let clean = a.trim();
            // Remove leading/trailing non-alphanumeric chars (like + or - or bullets)
            clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");

            if (!clean) continue;
            const key = clean.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueArtists.push(clean);
            }
          }

          const sanitizedArtist = uniqueArtists.join(", "); // Standardize separator

          // 4. Sanitize Title (Remove leading/trailing + or other garbage)
          let sanitizedTitle = s.title;
          if (typeof sanitizedTitle === "string") {
            sanitizedTitle = sanitizedTitle
              .trim()
              .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
          }

          return { ...s, artist: sanitizedArtist, title: sanitizedTitle };
        });

        console.log(
          `AI generated ${aiResponse.songs.length} VALID songs (Target: ${targetGenCount})`
        );
        if (aiResponse.strict_genre) {
          // CODE-LEVEL ENFORCEMENT: The AI is stubborn, so we force-clean the genre here.
          // If genre contains "para", "for", "en", "in" or is > 2 words, we attempt to extracting the first word or clear it.
          const rawGenre = aiResponse.strict_genre;
          let cleanedGenre = rawGenre;

          // 1. Remove "para perrear", "in the gym", etc.
          // Split by common prepositions
          const parts = rawGenre.split(/\s+(?:para|for|en|in|with|de)\s+/i);

          if (parts.length > 1) {
            cleanedGenre = parts[0].trim();

            // RECYCLE LOGIC: The parts we removed (e.g. "perrear", "gym") are likely useful keywords.
            // We should add them to playlist_keywords if they aren't common stops.
            const removedContext = rawGenre
              .substring(cleanedGenre.length)
              .trim();
            const potentialKeywords = removedContext
              .split(/\s+/)
              .filter(
                (w: string) =>
                  w.length > 2 &&
                  ![
                    "para",
                    "for",
                    "en",
                    "in",
                    "with",
                    "de",
                    "the",
                    "la",
                    "el",
                  ].includes(w.toLowerCase())
              );

            if (potentialKeywords.length > 0) {
              if (!aiResponse.playlist_keywords)
                aiResponse.playlist_keywords = [];
              // Add unique keywords
              potentialKeywords.forEach((pk: string) => {
                const k = pk.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(); // Clean keyword
                if (k && !aiResponse.playlist_keywords.includes(k)) {
                  console.log(
                    `Recycling excluded genre word '${pk}' into playlist_keywords`
                  );
                  aiResponse.playlist_keywords.push(k);
                }
              });
            }
          }

          // 2. If still too long (e.g. "Reggaeton Romantico Antiguo"), take the first 2 words max.
          const words = cleanedGenre.split(/\s+/);
          if (words.length > 2) {
            console.log(
              `Demoting complex strict_genre '${cleanedGenre}' to simple '${words[0]}'`
            );
            cleanedGenre = words[0];
          }

          // 3. Normalize
          aiResponse.strict_genre = cleanedGenre.replace(/[^a-zA-Z0-9\s]/g, "");

          console.log(
            `Applying strict genre filter: ${aiResponse.strict_genre} (Raw: ${rawGenre})`
          );
        }

        const searchWithRetry = async (query: string, limit: number = 1) => {
          try {
            return await spotifyApi.searchTracks(query, { limit });
          } catch (error: any) {
            if (error.statusCode === 401 && refreshToken) {
              console.log("Access token expired. Refreshing...");
              spotifyApi.setRefreshToken(refreshToken);
              const data = await spotifyApi.refreshAccessToken();
              spotifyApi.setAccessToken(data.body["access_token"]);
              return await spotifyApi.searchTracks(query, { limit });
            }
            throw error;
          }
        };

        const referenceTrackMap = new Map<
          string,
          { count: number; track: any }
        >();

        const addRefTrack = (track: any) => {
          if (!track || !track.id) return;
          if (referenceTrackMap.has(track.id)) {
            const entry = referenceTrackMap.get(track.id)!;
            entry.count += 1;
          } else {
            referenceTrackMap.set(track.id, { count: 1, track });
          }
        };

        // 1. Fetch by Strict Genre
        if (aiResponse.strict_genre) {
          try {
            console.log(
              `Fetching reference playlist for genre: ${aiResponse.strict_genre}`
            );
            const playlistSearch = await spotifyApi.searchPlaylists(
              aiResponse.strict_genre,
              { limit: 5 }
            );
            const playlists = playlistSearch.body.playlists?.items || [];
            if (playlists.length > 0) {
              const referencePlaylist =
                playlists[Math.floor(Math.random() * playlists.length)];
              console.log(
                `Found reference playlist: ${referencePlaylist.name} (ID: ${referencePlaylist.id})`
              );
              const playlistTracks = await spotifyApi.getPlaylistTracks(
                referencePlaylist.id,
                { limit: 50 }
              );
              playlistTracks.body.items.forEach((item) => {
                if (item.track) addRefTrack(item.track);
              });
              console.log(
                `Loaded ${referenceTrackMap.size} reference tracks for validation.`
              );
            }
          } catch (e) {
            console.error("Failed to fetch reference playlist", e);
          }
        }

        // 2. Fetch by Playlist Keywords
        if (
          aiResponse.playlist_keywords &&
          Array.isArray(aiResponse.playlist_keywords)
        ) {
          const MAX_PLAYLISTS_PER_KEYWORD = 3;
          for (const keyword of aiResponse.playlist_keywords) {
            try {
              const playlistSearch = await spotifyApi.searchPlaylists(keyword, {
                limit: 10,
              });
              const playlists = playlistSearch.body.playlists?.items || [];
              if (playlists.length > 0) {
                const validPlaylists = playlists
                  .filter((p: any) => p !== null)
                  .slice(0, MAX_PLAYLISTS_PER_KEYWORD);
                console.log(
                  `Found ${validPlaylists.length} playlists for keyword '${keyword}'`
                );
                for (const pl of validPlaylists) {
                  try {
                    const playlistTracks = await spotifyApi.getPlaylistTracks(
                      pl.id,
                      { limit: 50 }
                    );
                    playlistTracks.body.items.forEach((item) => {
                      if (item.track) addRefTrack(item.track);
                    });
                    console.log(`  -> Loaded tracks from: ${pl.name}`);
                  } catch (err) {
                    console.error(`Failed to fetch tracks for ${pl.name}`);
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to fetch playlists for ${keyword}`, e);
            }
          }
        }

        const consensusTracks: any[] = [];
        referenceTrackMap.forEach((value) => {
          if (value.count >= 2) consensusTracks.push(value.track);
        });

        const foundTracksRaw: any[] = [];
        const rejectedSongs: string[] = [];

        if (consensusTracks.length > 0) {
          console.log(
            `Found ${consensusTracks.length} CONSENSUS tracks (overlap >= 2). Prioritizing them.`
          );
          consensusTracks.forEach((track) => {
            foundTracksRaw.push({
              id: track.id,
              name: track.name,
              artist: track.artists[0].name,
              artistId: track.artists[0].id,
              album: track.album.name,
              uri: track.uri,
              image: track.album.images[0]?.url,
            });
          });
        }

        // MAIN BATCH LOOP
        const BATCH_SIZE = 50;
        const DELAY_MS = 300;
        const totalBatches = Math.ceil(aiResponse.songs.length / BATCH_SIZE);

        for (let i = 0; i < aiResponse.songs.length; i += BATCH_SIZE) {
          const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
          send({
            type: "status",
            key: "chat.loading.processing_batch",
            params: { current: currentBatch, total: totalBatches },
          });

          const batch = aiResponse.songs.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${currentBatch}/${totalBatches}`);

          const CHUNK_SIZE = 5;
          const processedResults: any[] = [];

          for (let j = 0; j < batch.length; j += CHUNK_SIZE) {
            const chunk = batch.slice(j, j + CHUNK_SIZE);
            const chunkPromises = chunk.map(
              async (song: { title: string; artist: string }) => {
                try {
                  let candidates: any[] = [];
                  let query = `track:${song.title} artist:${song.artist}`;
                  let searchResult = await searchWithRetry(query, 1);
                  if (searchResult.body.tracks?.items?.length)
                    candidates.push(...searchResult.body.tracks.items);

                  if (
                    candidates.length === 0 &&
                    (song.artist.includes("&") ||
                      song.artist.includes(",") ||
                      song.artist.toLowerCase().includes("feat"))
                  ) {
                    const primaryArtist = song.artist
                      .split(/,|&|feat\.|ft\./i)[0]
                      .trim();
                    query = `track:${song.title} artist:${primaryArtist}`;
                    searchResult = await searchWithRetry(query, 1);
                    if (searchResult.body.tracks?.items?.length)
                      candidates.push(...searchResult.body.tracks.items);
                  }

                  if (candidates.length === 0 && aiResponse.strict_genre) {
                    query = `${song.title} ${aiResponse.strict_genre}`;
                    searchResult = await searchWithRetry(query, 1);
                    if (searchResult.body.tracks?.items?.length)
                      candidates.push(...searchResult.body.tracks.items);
                  }

                  let sanitizedTitle = song.title
                    .replace(/^(The|A|An)\s+/i, "")
                    .replace(/\s*[\(\[\-].*$/i, "")
                    .trim();
                  if (
                    candidates.length === 0 &&
                    sanitizedTitle &&
                    sanitizedTitle.length > 2 &&
                    sanitizedTitle !== song.title
                  ) {
                    query = `track:${sanitizedTitle} artist:${song.artist}`;
                    searchResult = await searchWithRetry(query, 1);
                    if (searchResult.body.tracks?.items?.length)
                      candidates.push(...searchResult.body.tracks.items);
                  }

                  if (candidates.length === 0) {
                    query = `track:${song.title}`;
                    if (sanitizedTitle !== song.title)
                      query = `track:${sanitizedTitle}`;
                    searchResult = await searchWithRetry(query, 5);
                    if (searchResult.body.tracks?.items?.length)
                      candidates.push(...searchResult.body.tracks.items);
                  }

                  return { requested: song, candidates };
                } catch (e: any) {
                  return { requested: song, candidates: [] };
                }
              }
            );

            const chunkResults = await Promise.all(chunkPromises);
            processedResults.push(...chunkResults);
            await new Promise((r) => setTimeout(r, 200));
          }

          // Use the processed results
          const batchPromises = processedResults;

          // Collect ALL Artist IDs for batch fetching
          const allArtistIds = new Set<string>();
          batchPromises.forEach((res) => {
            res.candidates.forEach((c: any) => {
              if (c.artists && c.artists[0]?.id)
                allArtistIds.add(c.artists[0].id);
            });
          });

          let artistMap = new Map<string, any>();
          if (allArtistIds.size > 0) {
            try {
              const ids = Array.from(allArtistIds);
              for (let k = 0; k < ids.length; k += 50) {
                const chunk = ids.slice(k, k + 50);
                const artistsResponse = await spotifyApi.getArtists(chunk);
                artistsResponse.body.artists.forEach((a) =>
                  artistMap.set(a.id, a)
                );
              }
            } catch (e) {
              console.error("Failed to fetch artist details", e);
            }
          }

          // Validate
          batchPromises.forEach(({ requested, candidates }: any) => {
            if (!candidates || candidates.length === 0) {
              rejectedSongs.push(`${requested.title} - ${requested.artist}`);
              return;
            }

            const effectiveGenre = aiResponse.strict_genre || aiResponse.topic;

            let validCandidates = candidates.map((track: any) => {
              const artist = artistMap.get(track.artists[0].id);

              let genreMatch = true;
              if (effectiveGenre && artist) {
                const normalize = (str: any) => {
                  if (typeof str !== "string") return "";
                  return str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();
                };
                const requestGenre = normalize(effectiveGenre);
                const hasGenre = artist.genres.some((g: string) => {
                  const artistGenre = normalize(g);
                  return (
                    artistGenre.includes(requestGenre) ||
                    requestGenre.includes(artistGenre)
                  );
                });
                genreMatch = hasGenre;
              }

              const normalize = (str: any) =>
                typeof str === "string"
                  ? str.toLowerCase().replace(/[^a-z0-9]/g, "")
                  : "";
              const reqArtist = normalize(requested.artist);
              const trackArtist = normalize(track.artists[0].name);
              const artistSimilarity =
                reqArtist.includes(trackArtist) ||
                trackArtist.includes(reqArtist);

              const reqTitle = normalize(requested.title);
              const trackTitle = normalize(track.name);
              const titleMatch = reqTitle === trackTitle;

              const titleMatchRelaxed =
                trackTitle.includes(reqTitle) || reqTitle.includes(trackTitle);

              return {
                track,
                genreMatch,
                artistSimilarity,
                titleMatch,
                titleMatchRelaxed,
                artist,
              };
            });

            let bestMatch = null;

            if (effectiveGenre) {
              const genreMatches = validCandidates.filter(
                (c: any) => c.genreMatch || referenceTrackMap.has(c.track.id)
              );

              if (genreMatches.length > 0) {
                bestMatch =
                  genreMatches.find((c: any) => c.artistSimilarity) ||
                  genreMatches.find((c: any) => c.titleMatch) ||
                  genreMatches[0];
              } else {
                const perfectMatch = validCandidates.find(
                  (c: any) =>
                    c.artistSimilarity && (c.titleMatch || c.titleMatchRelaxed)
                );

                const emptyGenreCandidate = validCandidates.find(
                  (c: any) =>
                    c.artistSimilarity &&
                    c.artist &&
                    (!c.artist.genres || c.artist.genres.length === 0)
                );

                if (perfectMatch) {
                  bestMatch = perfectMatch;
                } else if (emptyGenreCandidate) {
                  bestMatch = emptyGenreCandidate;
                }
              }
            } else {
              const artistMatches = validCandidates.filter(
                (c: any) => c.artistSimilarity
              );
              if (artistMatches.length > 0) {
                bestMatch = artistMatches[0];
              } else {
                const titleMatches = validCandidates.filter(
                  (c: any) => c.titleMatch
                );
                if (titleMatches.length > 0) {
                  bestMatch = titleMatches[0];
                }
              }
            }

            if (bestMatch) {
              const track = bestMatch.track;
              const normalize = (str: any) =>
                typeof str === "string"
                  ? str
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
                      .trim()
                  : "";
              const isDuplicateInCurrent = currentPlaylist?.some((p: any) => {
                if (p.id === track.id || p.uri === track.uri) return true;
                if (p.title && p.artist) {
                  const t1 = normalize(p.title);
                  const t2 = normalize(track.name);
                  const a1 = normalize(p.artist);
                  const a2 = normalize(track.artists[0].name);
                  return t1 === t2 && a1 === a2;
                }
                return false;
              });

              if (!isDuplicateInCurrent) {
                foundTracksRaw.push({
                  id: track.id,
                  name: track.name,
                  artist: track.artists[0].name,
                  artistId: track.artists[0].id,
                  album: track.album.name,
                  uri: track.uri,
                  image: track.album.images[0]?.url,
                });
              }
            } else {
              rejectedSongs.push(`${requested.title} - ${requested.artist}`);
            }
          });

          if (rejectedSongs.length > 0) {
            send({ type: "rejected", data: rejectedSongs });
          }

          if (i + BATCH_SIZE < aiResponse.songs.length) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
          }
        }

        // Deduplicate tracks based on ID
        let uniqueTracks = Array.from(
          new Map(foundTracksRaw.map((item) => [item!.id, item])).values()
        );

        // PRECISE QUANTITY LOGIC: Slice to target count
        // If the user requested a specific number (e.g. "Add 5 songs"), we generated a buffer (e.g. 10).
        // Now we must trim the excess so the user gets exactly what they asked for.
        if (
          aiResponse.target_count &&
          typeof aiResponse.target_count === "number"
        ) {
          if (uniqueTracks.length > aiResponse.target_count) {
            console.log(
              `Precision Slicing: Trimming ${uniqueTracks.length} tracks to requested target ${aiResponse.target_count}`
            );
            uniqueTracks = uniqueTracks.slice(0, aiResponse.target_count);
          }
        }

        let finalTracks = uniqueTracks;

        // MERGE LOGIC based on action
        if (
          aiResponse.action === "add" &&
          currentPlaylist &&
          Array.isArray(currentPlaylist)
        ) {
          console.log(
            `Action is ADD. Merging ${currentPlaylist.length} existing songs with ${uniqueTracks.length} new songs.`
          );

          // Simple deduplication when merging (avoid adding songs that are already in uniqueTracks)
          const newTrackIds = new Set(uniqueTracks.map((t) => t.id));
          const newTrackUris = new Set(uniqueTracks.map((t) => t.uri));

          // Filter existing playlist to exclude any that might have been re-added by AI (unlikely if uniqueTracks are new, but good for safety)
          const existingTracks = currentPlaylist
            .map((t: any) => ({
              id: t.id,
              name: t.name || t.title,
              artist: t.artist,
              album: t.album,
              image: t.image,
              uri: t.uri,
              artistId: t.artistId || "unknown",
            }))
            .filter((t) => !newTrackIds.has(t.id) && !newTrackUris.has(t.uri));

          finalTracks = [...existingTracks, ...uniqueTracks];
        }

        console.log(
          `Final playlist size: ${finalTracks.length} (Added: ${uniqueTracks.length})`
        );

        send({
          type: "status",
          key: "chat.loading.found_songs",
          params: { count: uniqueTracks.length },
        });

        let finalMessage = "";
        const targetCount = aiResponse.target_count || 15;
        const totalCount = finalTracks.length;
        const addedCount = uniqueTracks.length;

        if (
          uniqueTracks.length === 0 &&
          (aiResponse.action === "create" || !currentPlaylist)
        ) {
          // Failure only if we found 0 songs AND we aren't just adding 0 songs to an existing list
          const format =
            aiResponse.failure_format ||
            "I could not find any songs of {topic}, sorry.";
          finalMessage = format.replace(
            "{topic}",
            aiResponse.topic || "the requested music"
          );
        } else if (
          finalTracks.length < (currentPlaylist?.length || 0) + targetCount &&
          aiResponse.action === "add"
        ) {
          // Partial Add
          const format =
            aiResponse.partial_success_format ||
            "I managed to add {added_count} songs of {topic}.";
          finalMessage = format
            .replace("{count}", totalCount.toString())
            .replace("{added_count}", addedCount.toString())
            .replace("{total_count}", totalCount.toString())
            .replace("{topic}", aiResponse.topic || "the requested music");
        } else {
          // Full success
          const format =
            aiResponse.success_format ||
            aiResponse.message ||
            "Added {added_count} {topic} songs.";
          finalMessage = format
            .replace("{count}", totalCount.toString())
            .replace("{added_count}", addedCount.toString())
            .replace("{total_count}", totalCount.toString())
            .replace("{topic}", aiResponse.topic || "the requested music");
        }

        send({
          type: "result",
          data: {
            message: finalMessage,
            tracks: finalTracks,
            topic: aiResponse.topic,
            strict_genre: aiResponse.strict_genre,
            playlist_keywords: aiResponse.playlist_keywords,
          },
        });
        controller.close();
      } catch (error: any) {
        console.error("Error in chat API:", error);
        send({
          type: "error",
          message: error.message || "Internal Server Error",
        });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
