import SpotifyWebApi from "spotify-web-api-node";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");
        const offset = parseInt(searchParams.get("offset") || "0");

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

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

        // Create a fresh instance for every request to avoid state pollution
        const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        });
        spotifyApi.setAccessToken(accessToken);

        console.log(`[Search API] Query: "${query}", Offset: ${offset}`);

        // Use general query to preserve popularity ranking, but fetch more to allow for filtering
        const searchResult = await spotifyApi.searchTracks(query, { limit: 50, offset, market: 'from_token' });
        console.log(`[Search API] Found ${searchResult.body.tracks?.items.length} tracks`);

        const tracks = searchResult.body.tracks?.items.map((track) => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            album: track.album.name,
            uri: track.uri,
            image: track.album.images[0]?.url,
        }));

        // Strict Filter: Result MUST contain the query string in Name or Artist
        const lowerQuery = query.toLowerCase();
        const filteredTracks = tracks?.filter(t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.artist.toLowerCase().includes(lowerQuery)
        );

        // Deduplicate by name and artist (case-insensitive)
        const uniqueTracks = filteredTracks?.filter((track, index, self) =>
            index === self.findIndex((t) => (
                t.name.toLowerCase().trim() === track.name.toLowerCase().trim() &&
                t.artist.toLowerCase().trim() === track.artist.toLowerCase().trim()
            ))
        );

        // Return top 20 valid results
        const finalTracks = uniqueTracks?.slice(0, 20);

        return NextResponse.json({ tracks: finalTracks });
    } catch (error) {
        console.error("Error searching tracks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
