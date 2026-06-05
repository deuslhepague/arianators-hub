import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify client ID or Redirect URI not configured on server" },
      { status: 500 }
    );
  }

  const scopes = [
    "user-read-recently-played",
    "user-read-private",
    "user-read-email"
  ].join(" ");

  const spotifyAuthUrl = new URL("https://accounts.spotify.com/authorize");
  spotifyAuthUrl.searchParams.append("client_id", clientId);
  spotifyAuthUrl.searchParams.append("response_type", "code");
  spotifyAuthUrl.searchParams.append("redirect_uri", redirectUri);
  spotifyAuthUrl.searchParams.append("scope", scopes);
  spotifyAuthUrl.searchParams.append("show_dialog", "true");

  return NextResponse.redirect(spotifyAuthUrl.toString());
}
