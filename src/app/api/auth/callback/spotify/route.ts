import { spotifyApi } from "@/lib/spotify";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token, expires_in } = data.body;

        // Pass token in URL (fallback for cookie issues)
        const redirectUrl = new URL("/chat", request.url);
        redirectUrl.searchParams.set("token", access_token);

        const response = NextResponse.redirect(redirectUrl);

        // Still set cookies just in case
        response.cookies.set("spotify_access_token", access_token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: expires_in,
            path: "/",
        });

        response.cookies.set("spotify_refresh_token", refresh_token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Error exchanging code for token:", error);
        return NextResponse.redirect(new URL("/?error=invalid_token", request.url));
    }
}
