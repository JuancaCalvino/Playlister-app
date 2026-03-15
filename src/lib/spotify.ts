import SpotifyWebApi from "spotify-web-api-node";

const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-modify-public",
    "playlist-modify-private",
];

export const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: "http://127.0.0.1:3000/api/auth/callback/spotify",
});

export const LOGIN_URL = spotifyApi.createAuthorizeURL(scopes, "state");

// Client Credentials flow for search-only operations (no user token needed)
let ccToken: string | null = null;
let ccTokenExpiry = 0;

export async function getClientCredentialsApi(): Promise<SpotifyWebApi> {
    const now = Date.now();
    if (ccToken && now < ccTokenExpiry) {
        const api = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        });
        api.setAccessToken(ccToken);
        return api;
    }

    const api = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const data = await api.clientCredentialsGrant();
    ccToken = data.body["access_token"];
    ccTokenExpiry = now + (data.body["expires_in"] - 60) * 1000; // Refresh 60s early
    api.setAccessToken(ccToken);
    console.log("Obtained Client Credentials token for search operations");
    return api;
}
