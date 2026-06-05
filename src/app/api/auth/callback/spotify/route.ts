import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credPath = path.join(
    process.cwd(),
    "arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json"
  );

  if (!fs.existsSync(credPath)) {
    throw new Error(`Firebase credentials file not found at ${credPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "arianatorshub"
  });

  return admin.app();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Spotify Auth Callback Error:", error);
      return NextResponse.redirect(new URL("/?error=" + encodeURIComponent(error), req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/?error=missing_code", req.url));
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing Spotify credentials on server");
      return NextResponse.redirect(new URL("/?error=missing_credentials", req.url));
    }

    // Exchange code for token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Failed to exchange token:", errText);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!profileResponse.ok) {
      console.error("Failed to fetch Spotify profile");
      return NextResponse.redirect(new URL("/?error=profile_fetch_failed", req.url));
    }

    const profileData = await profileResponse.json();
    const spotifyUserId = profileData.id;
    const displayName = profileData.display_name || spotifyUserId;
    const avatarUrl = profileData.images?.[0]?.url || "";

    // Save/Update user in Firestore
    const app = getAdminApp();
    const db = admin.firestore(app);
    const userRef = db.collection("users").doc(spotifyUserId);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? (existingSnap.data() || {}) : {};

    const now = new Date().toISOString();
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const updatePayload: any = {
      userId: spotifyUserId,
      displayName,
      avatarUrl,
      source: "spotify",
      syncEnabled: true,
      spotifyAccessToken: access_token,
      spotifyTokenExpiresAt: tokenExpiresAt,
      lastSyncedAt: now,
      updatedAt: now
    };

    // Only update refresh token if a new one is returned (Spotify sometimes omits refresh_token on re-auth)
    if (refresh_token) {
      updatePayload.spotifyRefreshToken = refresh_token;
    }

    // Set initial connection date if not present
    if (!existingData.spotifyConnectedAt) {
      updatePayload.spotifyConnectedAt = now;
    }

    await userRef.set(updatePayload, { merge: true });

    // Set secure HTTPOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("arianators_user_id", spotifyUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/"
    });

    return NextResponse.redirect(new URL("/?success=true", req.url));
  } catch (error: any) {
    console.error("Error in Spotify Callback Route:", error);
    return NextResponse.redirect(new URL("/?error=internal_server_error", req.url));
  }
}
