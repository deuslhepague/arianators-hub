import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";

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

function isCronAuthorized(req: Request): boolean {
  const adminPasscode = req.headers.get("x-admin-passcode") || req.headers.get("x-admin-secret");
  const expectedPasscode = process.env.ADMIN_PASSCODE || process.env.ADMIN_SECRET;
  return Boolean(expectedPasscode && adminPasscode && adminPasscode === expectedPasscode);
}

function cleanTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s*-\s*(sped up|slowed|acapella|instrumental|remix|acoustic|radio edit|edit|live|version).*/i, "")
    .trim();
}

let cachedCatalog: any[] = [];
let cachedCatalogTimestamp = 0;

async function loadCatalogTracks(db: admin.firestore.Firestore): Promise<any[]> {
  const now = Date.now();
  if (cachedCatalog.length > 0 && (now - cachedCatalogTimestamp) < 600000) {
    return cachedCatalog;
  }

  const snap = await db.collection("catalog").doc("config").get();
  if (!snap.exists) return [];
  const data = snap.data() || {};
  cachedCatalog = data.tracks || [];
  cachedCatalogTimestamp = now;
  return cachedCatalog;
}

async function refreshUserToken(db: admin.firestore.Firestore, userId: string, userData: any, clientId: string, clientSecret: string) {
  const expiresAt = new Date(userData.spotifyTokenExpiresAt || 0);
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  if (expiresAt.getTime() - bufferTime > Date.now() && userData.spotifyAccessToken) {
    return userData.spotifyAccessToken;
  }

  if (!userData.spotifyRefreshToken) {
    throw new Error(`No Spotify refresh token found for user ${userId}`);
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: userData.spotifyRefreshToken
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh token: ${errText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const updateData: any = {
    spotifyAccessToken: newAccessToken,
    spotifyTokenExpiresAt: newExpiresAt,
    updatedAt: new Date().toISOString()
  };

  if (data.refresh_token) {
    updateData.spotifyRefreshToken = data.refresh_token;
  }

  await db.collection("users").doc(userId).update(updateData);
  return newAccessToken;
}

async function fetchSpotifyRecentPlays(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch Spotify recent plays: ${errText}`);
  }

  const data = await response.json();
  return data.items || [];
}

async function syncOneUser(db: admin.firestore.Firestore, userId: string) {
  const now = new Date().toISOString();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error(`User ${userId} not found in database`);
  }

  const userData = userSnap.data() || {};
  if (userData.syncEnabled === false) {
    return { userId, skipped: true, processed: 0 };
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify client ID or secret not configured on server");
  }

  // 1. Refresh token if expired
  const accessToken = await refreshUserToken(db, userId, userData, clientId, clientSecret);

  // 2. Fetch recent plays
  const items = await fetchSpotifyRecentPlays(accessToken);
  
  // Sort chronologically (oldest first)
  const sortedItems = [...items].sort((a: any, b: any) => 
    new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  );

  const catalogTracks = await loadCatalogTracks(db);
  const lastTrackedPlayedAt = userData.lastTrackedPlayedAt || "";

  const validPlays: { trackId: string; trackName: string; playedAt: string; dateStr: string; coverUrl: string }[] = [];

  sortedItems.forEach((item: any) => {
    const playedAt = item.played_at;
    if (!playedAt) return;

    // Skip already tracked plays
    if (lastTrackedPlayedAt && playedAt <= lastTrackedPlayedAt) {
      return;
    }

    const track = item.track;
    if (!track) return;

    // Filter for Ariana Grande tracks
    const isAriana = track.artists?.some((artist: any) =>
      artist.id === "66CXWjxzN04gZ2vG2mJLjQ" || artist.name?.toLowerCase().includes("ariana grande")
    );
    if (!isAriana) return;

    const trackId = track.id;
    const trackName = track.name || trackId;
    const dateStr = playedAt.split("T")[0];
    const coverUrl = track.album?.images?.[0]?.url || "/petal.jpg";

    validPlays.push({
      trackId,
      trackName,
      playedAt,
      dateStr,
      coverUrl
    });
  });

  if (validPlays.length === 0) {
    return {
      userId,
      processed: 0,
      lastTrackedPlayedAt
    };
  }

  // Load Firestore states for affected dates
  const uniqueDates = Array.from(new Set(validPlays.map(p => p.dateStr)));
  const dailyStreamsDocs: Record<string, any> = {};
  const songStreamsDocs: Record<string, any> = {};

  await Promise.all(uniqueDates.map(async (date) => {
    const dailySnap = await userRef.collection("dailyStreams").doc(date).get();
    dailyStreamsDocs[date] = dailySnap.exists ? (dailySnap.data() || {}) : {};

    const songSnap = await db.collection("song_streams").doc(date).get();
    songStreamsDocs[date] = songSnap.exists ? (songSnap.data() || {}) : {};
  }));

  const userTrackIncrementsByDate: Record<string, Record<string, number>> = {};
  const songStreamIncrementsByDate: Record<string, Record<string, number>> = {};
  const processedByDate: Record<string, number> = {};
  const pendingDocsByDate: Record<string, Record<string, any>> = {};

  let updatedLastTrackedPlayedAt = lastTrackedPlayedAt;

  validPlays.forEach(p => {
    const { trackId, trackName, playedAt, dateStr, coverUrl } = p;

    if (!userTrackIncrementsByDate[dateStr]) userTrackIncrementsByDate[dateStr] = {};
    if (!songStreamIncrementsByDate[dateStr]) songStreamIncrementsByDate[dateStr] = {};
    if (!processedByDate[dateStr]) processedByDate[dateStr] = 0;
    if (!pendingDocsByDate[dateStr]) pendingDocsByDate[dateStr] = {};

    userTrackIncrementsByDate[dateStr][trackId] = (userTrackIncrementsByDate[dateStr][trackId] || 0) + 1;
    processedByDate[dateStr] += 1;
    
    if (!updatedLastTrackedPlayedAt || playedAt > updatedLastTrackedPlayedAt) {
      updatedLastTrackedPlayedAt = playedAt;
    }

    // Version identification via exact Spotify trackId or alternativeIds
    const directMatch = catalogTracks.find((song: any) =>
      song.spotifyTrackId === trackId || (song.alternativeIds || []).includes(trackId)
    );

    if (directMatch) {
      const mainTrackId = directMatch.spotifyTrackId || directMatch.id;
      songStreamIncrementsByDate[dateStr][mainTrackId] = (songStreamIncrementsByDate[dateStr][mainTrackId] || 0) + 1;
    } else {
      // Fallback matching by title
      const titleMatch = catalogTracks.find((song: any) =>
        cleanTrackTitle(song.title) === cleanTrackTitle(trackName)
      );

      if (titleMatch) {
        const mainTrackId = titleMatch.spotifyTrackId || titleMatch.id;
        songStreamIncrementsByDate[dateStr][mainTrackId] = (songStreamIncrementsByDate[dateStr][mainTrackId] || 0) + 1;
        
        pendingDocsByDate[dateStr][trackId] = {
          trackId,
          trackName,
          suggestedSongId: titleMatch.id,
          suggestedSongTitle: titleMatch.title,
          coverUrl,
          status: "pending_merge",
          streams: (pendingDocsByDate[dateStr][trackId]?.streams || 0) + 1
        };
      } else {
        // Unidentified version
        songStreamIncrementsByDate[dateStr][trackId] = (songStreamIncrementsByDate[dateStr][trackId] || 0) + 1;
        pendingDocsByDate[dateStr][trackId] = {
          trackId,
          trackName,
          suggestedSongId: null,
          suggestedSongTitle: null,
          coverUrl,
          status: "pending_new",
          streams: (pendingDocsByDate[dateStr][trackId]?.streams || 0) + 1
        };
      }
    }
  });

  const totalProcessed = validPlays.length;
  const batch = db.batch();

  // Update user document
  batch.set(userRef, {
    lastTrackedPlayedAt: updatedLastTrackedPlayedAt,
    lastSyncedAt: now,
    totalStreams: admin.firestore.FieldValue.increment(totalProcessed),
    lastActive: now,
    updatedAt: now
  }, { merge: true });

  // Update dates collections
  uniqueDates.forEach(date => {
    const processedForDate = processedByDate[date] || 0;
    const trackIncrements = userTrackIncrementsByDate[date] || {};

    if (processedForDate > 0) {
      const dailyRef = userRef.collection("dailyStreams").doc(date);
      const dailyPayload: Record<string, any> = {
        date,
        lastUpdated: now,
        total: admin.firestore.FieldValue.increment(processedForDate)
      };

      Object.entries(trackIncrements).forEach(([trackId, count]) => {
        dailyPayload[trackId] = admin.firestore.FieldValue.increment(count);
      });

      batch.set(dailyRef, dailyPayload, { merge: true });

      // Update Leaderboard
      const leaderboardRef = db.collection("leaderboard").doc(`${date}_${userId}`);
      batch.set(leaderboardRef, {
        userId,
        displayName: userData.displayName || userId,
        avatarUrl: userData.avatarUrl || "",
        streamsToday: admin.firestore.FieldValue.increment(processedForDate),
        date,
        lastUpdated: now
      }, { merge: true });
    }

    // Update global Song Streams
    const songIncrements = songStreamIncrementsByDate[date] || {};
    if (Object.keys(songIncrements).length > 0) {
      const songStreamsRef = db.collection("song_streams").doc(date);
      const songPayload: Record<string, any> = {
        date,
        updatedAt: now,
        tracks: {}
      };

      Object.entries(songIncrements).forEach(([trackId, count]) => {
        songPayload.tracks[trackId] = admin.firestore.FieldValue.increment(count);
      });

      batch.set(songStreamsRef, songPayload, { merge: true });
    }

    // Save pending validations
    const pendingDocs = pendingDocsByDate[date] || {};
    Object.values(pendingDocs).forEach((pending) => {
      const ref = db.collection("pending_validations").doc(pending.trackId);
      batch.set(ref, {
        ...pending,
        date,
        updatedAt: now,
        streams: admin.firestore.FieldValue.increment(pending.streams || 0)
      }, { merge: true });
    });
  });

  await batch.commit();

  return {
    userId,
    processed: totalProcessed,
    lastTrackedPlayedAt: updatedLastTrackedPlayedAt
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const authResult = verifyAdminSessionToken(token);
    const cronAuthorized = isCronAuthorized(req);

    const app = getAdminApp();
    const db = admin.firestore(app);

    if (userId) {
      const result = await syncOneUser(db, userId);
      return NextResponse.json({ success: true, ...result });
    }

    if (!authResult.valid && !cronAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const usersSnap = await db.collection("users").get();
    const eligibleUsers = usersSnap.docs
      .map(docSnap => ({ id: docSnap.id, data: docSnap.data() || {} }))
      .filter(u => u.data.source === "spotify" && u.data.spotifyRefreshToken && u.data.syncEnabled !== false);

    const results: any[] = [];
    const chunkSize = 5;

    for (let i = 0; i < eligibleUsers.length; i += chunkSize) {
      const chunk = eligibleUsers.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (user) => {
        try {
          return await syncOneUser(db, user.id);
        } catch (error: any) {
          return {
            userId: user.id,
            error: error.message || "Failed to sync user"
          };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return NextResponse.json({
      success: true,
      mode: "bulk",
      results
    });
  } catch (error: any) {
    console.error("Error syncing Spotify users:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Spotify OAuth sync endpoint is active"
  });
}
