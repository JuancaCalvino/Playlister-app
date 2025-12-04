import { openai } from "@/lib/openai";
import { spotifyApi } from "@/lib/spotify";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { message, currentPlaylist, language = 'en' } = await request.json();
        const cookieStore = await cookies();
        let accessToken = cookieStore.get("spotify_access_token")?.value;

        // Fallback: Check Authorization header
        if (!accessToken) {
            const authHeader = request.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                accessToken = authHeader.split(" ")[1];
            }
        }

        console.log("Chat API - Final Access Token exists:", !!accessToken);

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Set the access token for this request
        spotifyApi.setAccessToken(accessToken);

        // Construct the system prompt with context
        const systemPrompt = `You are a helpful music assistant. 
          The user will describe a mood, genre, or context. 
          
          CURRENT DATE: ${new Date().toLocaleDateString()} (Use this to find "latest" or "recent" songs)
          USER LANGUAGE: ${language === 'es' ? 'Spanish (Español)' : 'English'}
          
          CURRENT PLAYLIST CONTEXT:
          ${currentPlaylist ? JSON.stringify(currentPlaylist) : "[]"}

          INSTRUCTIONS:
          1. If the user wants to CREATE a new playlist, ignore the current context and generate a fresh list.
          2. If the user wants to ADD to the playlist, append new songs to the current list.
          3. If the user wants to REMOVE or MODIFY, update the current list accordingly.
          4. IMPORTANT: If the user asks for a specific number of songs, you may generate UP TO 100 songs.
          5. LIMIT: The absolute maximum is 100 songs. If the user asks for more (e.g. "200 songs"), generate exactly 100 and politely explain in the 'message' that you limited it to 100 to ensure the playlist is generated quickly.
          6. If no number is specified, default to 15 songs.
          6. STRICTLY adhere to the requested genres. Do not include songs that are "kind of" similar if they do not fit the specific genre requested.
          7. NO DUPLICATES. Ensure every song is unique.
          8. DURATION REQUESTS: If the user asks for a duration (e.g. "2 hours"), estimate ~15-20 songs per hour. (e.g. 7 hours = ~120 songs).
          11. STRICT GENRE ADHERENCE: This is critical. If the user asks for "Techno", EVERY single song must be Techno. Do NOT include Pop, Reggaeton, or other genres just to fill the list. It is better to return fewer songs than wrong songs.
          12. If the user asks for a sub-genre (e.g. "Hard Techno") that might be rare, try to find songs that are strictly that genre.
          
          You must return a JSON object with SEVEN fields:
          1. 'message': A short, friendly response to the user (assuming all songs are found) IN THE USER'S LANGUAGE (${language === 'es' ? 'Spanish' : 'English'}).
          2. 'songs': An array of song objects, each with 'title' and 'artist'. This should be the COMPLETE updated playlist.
          3. 'topic': A short string describing the playlist content (e.g. "Lady Gaga", "Techno", "90s Rock").
          4. 'partial_success_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${language === 'es' ? 'Spanish' : 'English'}) to report that fewer songs were found than requested. 
             - Do NOT use the same phrase every time. Adapt to the conversation context.
             - Examples: "Found {count} {topic} tracks for you.", "Managed to add {count} songs to the {topic} mix.", "Here are {count} more {topic} hits."
             - It MUST contain the placeholders "{count}" and "{topic}".
          5. 'success_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${language === 'es' ? 'Spanish' : 'English'}) to report success.
             - Examples: "Added {count} {topic} songs!", "Ready to rock with {count} {topic} tracks.", "Enjoy these {count} songs of {topic}."
             - It MUST contain the placeholders "{count}" and "{topic}".
          6. 'strict_genre': (Optional) If the user explicitly requested a specific genre (e.g. "Techno", "Rock", "Jazz"), include it here as a single string. If not, leave it null.
          7. 'failure_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${language === 'es' ? 'Spanish' : 'English'}) to apologize for zero results.
             - Examples: "Couldn't find any {topic} songs right now, sorry.", "No luck finding {topic} tracks this time."
             - It MUST contain the placeholder "{topic}".
          
          Example JSON format:
          {
            "message": "Aquí tienes 50 canciones de techno!",
            "songs": [ ... ],
            "topic": "Techno",
            "partial_success_format": "Solo pude encontrar {count} canciones de {topic}.",
            "success_format": "Aquí tienes {count} canciones de {topic}.",
            "strict_genre": "techno",
            "failure_format": "No pude encontrar ninguna canción de {topic}, lo siento."
          }
          Return ONLY the JSON.`;

        // 1. Ask OpenAI to generate a list of songs based on the user's prompt
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.2, // Low temperature = more deterministic and strict
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                { role: "user", content: message },
            ],
            response_format: { type: "json_object" },
            max_tokens: 16384, // Allow for large playlist responses
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

        if (!aiResponse.songs || !Array.isArray(aiResponse.songs)) {
            throw new Error("Invalid AI response format");
        }

        console.log(`AI generated ${aiResponse.songs.length} songs`);
        if (aiResponse.strict_genre) {
            console.log(`Applying strict genre filter: ${aiResponse.strict_genre}`);
        }

        // 2. Search for each song on Spotify with batching and rate limiting
        const foundTracksRaw: any[] = [];
        const BATCH_SIZE = 5;
        const DELAY_MS = 300;
        const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

        // Helper to search with auto-refresh
        const searchWithRetry = async (query: string) => {
            try {
                return await spotifyApi.searchTracks(query, { limit: 1 });
            } catch (error: any) {
                if (error.statusCode === 401 && refreshToken) {
                    console.log("Access token expired. Refreshing...");
                    spotifyApi.setRefreshToken(refreshToken);
                    const data = await spotifyApi.refreshAccessToken();
                    const newAccessToken = data.body['access_token'];
                    spotifyApi.setAccessToken(newAccessToken);
                    console.log("Token refreshed. Retrying search...");
                    return await spotifyApi.searchTracks(query, { limit: 1 });
                }
                throw error;
            }
        };

        // PRE-FETCH REFERENCE PLAYLIST (if strict genre is requested)
        // This helps verify songs that might have missing artist metadata but are in known genre playlists
        const referenceTrackIds = new Set<string>();
        if (aiResponse.strict_genre) {
            try {
                console.log(`Fetching reference playlist for genre: ${aiResponse.strict_genre}`);
                const playlistSearch = await spotifyApi.searchPlaylists(aiResponse.strict_genre, { limit: 1 });
                const referencePlaylist = playlistSearch.body.playlists?.items[0];

                if (referencePlaylist) {
                    console.log(`Found reference playlist: ${referencePlaylist.name} (ID: ${referencePlaylist.id})`);
                    const playlistTracks = await spotifyApi.getPlaylistTracks(referencePlaylist.id, { limit: 50 }); // Check top 50 songs
                    playlistTracks.body.items.forEach(item => {
                        if (item.track) {
                            referenceTrackIds.add(item.track.id);
                        }
                    });
                    console.log(`Loaded ${referenceTrackIds.size} reference tracks for validation.`);
                }
            } catch (e) {
                console.error("Failed to fetch reference playlist", e);
            }
        }

        for (let i = 0; i < aiResponse.songs.length; i += BATCH_SIZE) {
            const batch = aiResponse.songs.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(aiResponse.songs.length / BATCH_SIZE)}`);

            const batchPromises = batch.map(async (song: { title: string; artist: string }) => {
                try {
                    // 1. Standard search (most reliable to find the track)
                    let query = `track:${song.title} artist:${song.artist}`;
                    let searchResult = await searchWithRetry(query);
                    let track = searchResult.body.tracks?.items[0];

                    // 2. Fallback: If artist has multiple names (e.g. "Headhunterz & Sound Rush"), try searching with just the first one
                    // This fixes issues where Spotify lists artists differently than the AI prompt
                    if (!track && (song.artist.includes("&") || song.artist.includes(",") || song.artist.toLowerCase().includes("feat"))) {
                        const primaryArtist = song.artist.split(/,|&|feat\.|ft\./i)[0].trim();
                        console.log(`Standard search failed for ${song.title}, trying primary artist: ${primaryArtist}`);
                        query = `track:${song.title} artist:${primaryArtist}`;
                        searchResult = await searchWithRetry(query);
                        track = searchResult.body.tracks?.items[0];
                    }

                    // 3. Fallback: Search by Title + Genre (if AI hallucinated the artist)
                    // e.g. AI said "Oxygen by Brennan Heart" but it's "Oxygen by Headhunterz"
                    // Searching "Oxygen Hardstyle" helps find the right version.
                    if (!track && aiResponse.strict_genre) {
                        console.log(`Artist search failed for ${song.title}, trying Title + Genre: ${aiResponse.strict_genre}`);
                        // Use loose text search for title + genre
                        query = `${song.title} ${aiResponse.strict_genre}`;
                        searchResult = await searchWithRetry(query);
                        track = searchResult.body.tracks?.items[0];
                    }

                    if (track) {
                        // Check for duplicates in CURRENT playlist (from request)
                        const isDuplicateInCurrent = currentPlaylist?.some((p: any) => p.uri === track.uri);
                        if (isDuplicateInCurrent) {
                            console.log(`Skipping duplicate (already in playlist): ${track.name}`);
                            return null;
                        }

                        return {
                            id: track.id,
                            name: track.name,
                            artist: track.artists[0].name,
                            artistId: track.artists[0].id, // Keep ID for genre check
                            album: track.album.name,
                            uri: track.uri,
                            image: track.album.images[0]?.url,
                        };
                    }
                    console.log(`Could not find track: ${song.title} by ${song.artist}`);
                    return null;
                } catch (e: any) {
                    if (e.statusCode === 429) {
                        console.warn(`Rate limit hit for ${song.title}. Waiting longer...`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Simple retry wait
                    }
                    console.error(`Failed to search for ${song.title}`, e.message);
                    return null;
                }
            });

            const batchResults = (await Promise.all(batchPromises)).filter(t => t !== null);

            // STRICT GENRE CHECK: Validate against Artist's genres OR Reference Playlist
            if (aiResponse.strict_genre && batchResults.length > 0) {
                try {
                    // Fetch artist details for all found tracks
                    const artistIds = batchResults.map(t => t.artistId);
                    // getArtists allows max 50 IDs, we have max 5 here.
                    const artistsResponse = await spotifyApi.getArtists(artistIds);
                    const artists = artistsResponse.body.artists;

                    // Filter tracks where the artist has the requested genre
                    const validTracks = batchResults.filter((track, index) => {
                        // 1. Check Reference Playlist (Most reliable for specific songs)
                        if (referenceTrackIds.has(track.id)) {
                            console.log(`Validated ${track.name} via Reference Playlist!`);
                            return true;
                        }

                        // 2. Check Artist Genres
                        const artist = artists[index];
                        if (!artist) return false;

                        // Check if ANY of the artist's genres include the strict genre string OR vice versa
                        const hasGenre = artist.genres.some(g => {
                            const artistGenre = g.toLowerCase();
                            const requestGenre = aiResponse.strict_genre.toLowerCase();
                            return artistGenre.includes(requestGenre) || requestGenre.includes(artistGenre);
                        });

                        if (!hasGenre) {
                            console.log(`Filtered out ${track.name} by ${track.artist}: Artist genres [${artist.genres.join(", ")}] do not match '${aiResponse.strict_genre}'`);
                        }
                        return hasGenre;
                    });

                    foundTracksRaw.push(...validTracks);
                } catch (e) {
                    console.error("Failed to validate artist genres", e);
                    foundTracksRaw.push(...batchResults);
                }
            } else {
                foundTracksRaw.push(...batchResults);
            }

            // Delay between batches to respect rate limits
            if (i + BATCH_SIZE < aiResponse.songs.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        // Deduplicate tracks based on ID
        const uniqueTracks = Array.from(new Map(foundTracksRaw.map(item => [item!.id, item])).values());

        console.log(`Found ${uniqueTracks.length} unique songs on Spotify (from ${foundTracksRaw.length} raw matches)`);

        let finalMessage = "";
        if (uniqueTracks.length === 0) {
            // Failure
            const format = aiResponse.failure_format || "I could not find any songs of {topic}, sorry.";
            finalMessage = format.replace("{topic}", aiResponse.topic || "the requested music");
        } else if (uniqueTracks.length !== aiResponse.songs.length) {
            // Partial success
            const format = aiResponse.partial_success_format || "I could only find {count} songs of {topic}.";
            finalMessage = format
                .replace("{count}", uniqueTracks.length.toString())
                .replace("{topic}", aiResponse.topic || "the requested music");
        } else {
            // Full success
            const format = aiResponse.success_format || aiResponse.message || "Here are {count} songs of {topic}.";
            finalMessage = format
                .replace("{count}", uniqueTracks.length.toString())
                .replace("{topic}", aiResponse.topic || "the requested music");
        }

        return NextResponse.json({
            message: finalMessage,
            tracks: uniqueTracks,
        });

    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
