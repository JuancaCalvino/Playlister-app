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
                              (t: any) => `${t.name || t.title} - ${t.artist}`
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
                  ...
                // 1. Ask OpenAI to generate a list of songs based on the user's prompt
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    temperature: 0.8, // High temperature for "aleatory" / random results (User request)
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt,
                        },
                        { role: "user", content: message },
                    ],
                    response_format: { type: "json_object" },
                    max_tokens: 16384, 
                    frequency_penalty: 0.2, 
                });
                  1. 'message': A short, friendly response to the user (assuming all songs are found) IN THE USER'S LANGUAGE (${
                    language === "es" ? "Spanish" : "English"
                  }).
                  2. 'songs': An array of song objects, each with 'title' and 'artist'. This should be the COMPLETE updated playlist (including the extra buffer songs).
                  3. 'topic': A short string describing the playlist content (e.g. "Lady Gaga", "Techno", "90s Rock").
                     - CRITICAL: If the user says "add more", "similar", or "continue", USE THE PREVIOUS CONTEXT TOPIC even if they add extra words like "2 hours".
                     - CRITICAL: Do NOT use "Time", "Hours", or "Minutes" as the topic unless the user explicitly asks for songs ABOUT time.
                     - If the user says "2 hours of Reggaeton", the topic is 'Reggaeton', NOT 'Time'. 
                     - If the user says "Add 2 hours", and previous context was 'Hardstyle', the topic is 'Hardstyle'.
                  4. 'target_count': The integer number of songs the user EXPLICITLY requested. If they didn't specify, use 15.
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
                  7. 'strict_genre': (Optional) If the user explicitly requested a specific genre (e.g. "Techno", "Rock", "Jazz"), include it here as a single string. If not, leave it null.
                  8. 'action': (Required) One of "create" (new playlist), "add" (append songs), or "modify" (change/remove songs).
                     - If "add", return ONLY the NEW songs in the 'songs' array.
                     - If "create" or "modify", return the COMPLETE playlist.
                  9. 'failure_format': A NATURAL, VARIED sentence in the USER'S LANGUAGE (${
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
                    "partial_success_format": "...",
                    "success_format": "...",
                    "failure_format": "..."
                  }
                  Return ONLY the JSON. Do not include markdown formatting. 
                  Generate COMPACT JSON (no unnecessary whitespace) to ensure the full list fits.`;

        send({ type: "status", key: "chat.loading.ai_generating" });

        // 1. Ask OpenAI to generate a list of songs based on the user's prompt
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.2, // Balanced creativity
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
          max_tokens: 16384, // Restore high limit for large playlists (required for 3x buffer)
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

        console.log(`AI generated ${aiResponse.songs.length} songs`);
        if (aiResponse.strict_genre) {
          console.log(
            `Applying strict genre filter: ${aiResponse.strict_genre} `
          );
        }

        // 2. Search for each song on Spotify with batching and rate limiting
        const foundTracksRaw: any[] = [];
        const rejectedSongs: string[] = [];
        const BATCH_SIZE = 50; // Optimized for Spotify's batch Artist API (max 50)
        const DELAY_MS = 300;

        // Helper to search with auto-refresh
        const searchWithRetry = async (query: string, limit: number = 1) => {
          try {
            return await spotifyApi.searchTracks(query, { limit });
          } catch (error: any) {
            if (error.statusCode === 401 && refreshToken) {
              console.log("Access token expired. Refreshing...");
              spotifyApi.setRefreshToken(refreshToken);
              const data = await spotifyApi.refreshAccessToken();
              const newAccessToken = data.body["access_token"];
              spotifyApi.setAccessToken(newAccessToken);
              console.log("Token refreshed. Retrying search...");
              return await spotifyApi.searchTracks(query, { limit });
            }
            throw error;
          }
        };

        // PRE-FETCH REFERENCE PLAYLIST (if strict genre is requested)
        const referenceTrackIds = new Set<string>();
        if (aiResponse.strict_genre) {
          try {
            console.log(
              `Fetching reference playlist for genre: ${aiResponse.strict_genre} `
            );
            // Fetch top 5 playlists and pick one randomly
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
              ); // Check top 50 songs
              playlistTracks.body.items.forEach((item) => {
                if (item.track) {
                  referenceTrackIds.add(item.track.id);
                }
              });
              console.log(
                `Loaded ${referenceTrackIds.size} reference tracks for validation.`
              );
            }
          } catch (e) {
            console.error("Failed to fetch reference playlist", e);
          }
        }

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

          const batchPromises = batch.map(
            async (song: { title: string; artist: string }) => {
              try {
                // Collect potential candidates
                let candidates: any[] = [];

                // 1. Standard search (Exact Title + Artist)
                let query = `track:${song.title} artist:${song.artist}`;
                let searchResult = await searchWithRetry(query, 1);
                if (searchResult.body.tracks?.items?.length)
                  candidates.push(...searchResult.body.tracks.items);

                // 2. Fallback: Primary Artist
                if (
                  candidates.length === 0 &&
                  (song.artist.includes("&") ||
                    song.artist.includes(",") ||
                    song.artist.toLowerCase().includes("feat"))
                ) {
                  const primaryArtist = song.artist
                    .split(/,|&|feat\.|ft\./i)[0]
                    .trim();
                  console.log(
                    `Standard search failed for ${song.title}, trying primary artist: ${primaryArtist}`
                  );
                  query = `track:${song.title} artist:${primaryArtist}`;
                  searchResult = await searchWithRetry(query, 1);
                  if (searchResult.body.tracks?.items?.length)
                    candidates.push(...searchResult.body.tracks.items);
                }

                // 3. Fallback: Title + Genre
                if (candidates.length === 0 && aiResponse.strict_genre) {
                  console.log(
                    `Artist search failed for ${song.title}, trying Title + Genre: ${aiResponse.strict_genre}`
                  );
                  query = `${song.title} ${aiResponse.strict_genre}`;
                  searchResult = await searchWithRetry(query, 1);
                  if (searchResult.body.tracks?.items?.length)
                    candidates.push(...searchResult.body.tracks.items);
                }

                // 4. Fallback: Sanitized Title (Remove "The", "A", and metadata like " - Original Mix")
                // Catches "The Code of the Warrior" -> "Code of the Warrior"
                // Catches "Reignite - Original Mix" -> "Reignite"
                let sanitizedTitle = song.title.replace(/^(The|A|An)\s+/i, "");
                sanitizedTitle = sanitizedTitle
                  .replace(/\s*[\(\[\-].*$/i, "")
                  .trim();

                if (
                  candidates.length === 0 &&
                  sanitizedTitle &&
                  sanitizedTitle.length > 2 &&
                  sanitizedTitle !== song.title
                ) {
                  console.log(
                    `Sanitized search: "${sanitizedTitle}" by ${song.artist}`
                  );
                  query = `track:${sanitizedTitle} artist:${song.artist}`;
                  searchResult = await searchWithRetry(query, 1);
                  if (searchResult.body.tracks?.items?.length)
                    candidates.push(...searchResult.body.tracks.items);
                }

                // 5. Fallback (NEW): Broad Title Search (finding similar artists)
                if (candidates.length === 0) {
                  console.log(
                    `Deep search for ${song.title} (checking similar artists)...`
                  );
                  query = `track:${song.title}`;

                  // Also try sanitized broad search if needed
                  if (sanitizedTitle !== song.title) {
                    query = `track:${sanitizedTitle}`;
                  }

                  searchResult = await searchWithRetry(query, 5); // Fetch top 5 candidates
                  if (searchResult.body.tracks?.items?.length)
                    candidates.push(...searchResult.body.tracks.items);
                }

                if (candidates.length > 0) {
                  // Map ALL candidates to our format
                  const processedCandidates = candidates
                    .map((track) => {
                      // Check for duplicates in CURRENT playlist
                      const normalize = (str: string) =>
                        str
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "")
                          .trim();

                      const isDuplicateInCurrent = currentPlaylist?.some(
                        (p: any) => {
                          if (p.id === track.id || p.uri === track.uri)
                            return true;
                          if (p.title && p.artist) {
                            const t1 = normalize(p.title);
                            const t2 = normalize(track.name);
                            const a1 = normalize(p.artist);
                            const a2 = normalize(track.artists[0].name);
                            return t1 === t2 && a1 === a2;
                          }
                          return false;
                        }
                      );

                      if (isDuplicateInCurrent) {
                        // console.log(`Skipping duplicate cand: ${track.name}`); // noisy
                        return null;
                      }

                      return {
                        id: track.id,
                        name: track.name,
                        artist: track.artists[0].name,
                        artistId: track.artists[0].id,
                        album: track.album.name,
                        uri: track.uri,
                        image: track.album.images[0]?.url,
                      };
                    })
                    .filter((t) => t !== null);

                  if (processedCandidates.length > 0)
                    return processedCandidates;
                }

                console.log(
                  `Could not find track: ${song.title} by ${song.artist}`
                );
                rejectedSongs.push(`${song.title} - ${song.artist}`);
                return [];
              } catch (e: any) {
                if (e.statusCode === 429) {
                  console.warn(`Rate limit hit for ${song.title}. Waiting...`);
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                console.error(`Failed to search for ${song.title}`, e.message);
                rejectedSongs.push(`${song.title} - ${song.artist}`);
                return [];
              }
            }
          );

          // Flatten results because now we return arrays of candidates
          const batchResults = (await Promise.all(batchPromises)).flat();

          // STRICT GENRE CHECK: Validate against Artist's genres OR Reference Playlist
          if (aiResponse.strict_genre && batchResults.length > 0) {
            try {
              // Fetch artist details for all found tracks
              const artistIds = batchResults.map((t) => t.artistId);
              // getArtists allows max 50 IDs, we have max 5 here.
              const artistsResponse = await spotifyApi.getArtists(artistIds);
              const artists = artistsResponse.body.artists;

              // Filter tracks where the artist has the requested genre
              const validTracks = batchResults.filter((track, index) => {
                // 1. Check Reference Playlist (Most reliable for specific songs)
                if (referenceTrackIds.has(track.id)) {
                  console.log(
                    `Validated ${track.name} via Reference Playlist!`
                  );
                  return true;
                }

                // 2. Check Artist Genres
                const artist = artists[index];
                if (!artist) return false;

                // Check if ANY of the artist's genres include the strict genre string OR vice versa
                const normalize = (str: string) =>
                  str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();
                const requestGenre = normalize(aiResponse.strict_genre);

                const hasGenre = artist.genres.some((g) => {
                  const artistGenre = normalize(g);
                  return (
                    artistGenre.includes(requestGenre) ||
                    requestGenre.includes(artistGenre)
                  );
                });

                if (!hasGenre) {
                  console.log(
                    `Filtered out ${track.name} by ${
                      track.artist
                    }: Artist genres [${artist.genres.join(
                      ", "
                    )}] do not match '${aiResponse.strict_genre}'`
                  );
                  rejectedSongs.push(`${track.name} - ${track.artist}`);
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

          // Send rejected songs update
          if (rejectedSongs.length > 0) {
            send({ type: "rejected", data: rejectedSongs });
          }

          // Delay between batches to respect rate limits
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
