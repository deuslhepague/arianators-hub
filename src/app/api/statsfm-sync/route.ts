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

function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
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

async function fetchStatsFmProfile(userId: string) {
  const response = await fetch(`https://api.stats.fm/api/v1/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to load stats.fm profile for ${userId}`);
  }

  const data = await response.json();
  const profile = data?.item;
  if (!profile) {
    throw new Error(`Stats.fm profile not found for ${userId}`);
  }

  const isProfilePublic = profile.privacySettings?.profile === true;
  const isRecentlyPlayedPublic = profile.privacySettings?.recentlyPlayed === true;
  if (!isProfilePublic || !isRecentlyPlayedPublic) {
    throw new Error(`Stats.fm profile for ${userId} is private`);
  }

  return profile;
}

async function fetchRecentPlays(userId: string) {
  const response = await fetch(`https://api.stats.fm/api/v1/users/${userId}/streams/recent`);
  if (!response.ok) {
    throw new Error(`Failed to load recent streams for ${userId}`);
  }

  const data = await response.json();
  return data.items || [];
}

function getTrackMetadata(track: any, trackId: string, fallbackName: string) {
  const rawImage = track.albums?.[0]?.image || track.album?.image || "";
  const coverUrl = rawImage && (rawImage.includes("i.scdn.co") || rawImage.includes("mosaic.scdn.co"))
    ? rawImage
    : `/api/spotify-thumb?trackId=${trackId}`;
  const artists = track.artists?.map((artist: any) => artist.name).filter(Boolean).join(", ") || "Ariana Grande";

  return {
    name: fallbackName,
    coverUrl,
    artists
  };
}

async function syncOneUser(db: admin.firestore.Firestore, userId: string) {
  const now = new Date().toISOString();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  if (userData.syncEnabled === false) {
    return { userId, skipped: true, processed: 0, metadata: {} };
  }

  const profile = await fetchStatsFmProfile(userId);
  const items = [...(await fetchRecentPlays(userId))].reverse();
  const catalogTracks = await loadCatalogTracks(db);

  const lastTrackedEndTimeMs = Number(userData.lastTrackedEndTimeMs || 0);

  // Parse stats.fm items chronologically with a 30s debounce
  const validPlays: { trackId: string; trackName: string; endTimeMs: number; dateStr: string; item: any }[] = [];
  let tempPreviousEndTimeMs = 0;

  items.forEach(item => {
    const endTimeStr = item.endTime;
    if (!endTimeStr) return;
    const endTimeMs = new Date(endTimeStr).getTime();
    if (Number.isNaN(endTimeMs)) return;

    if (item.platform !== "SPOTIFY") return;

    if (tempPreviousEndTimeMs > 0 && (endTimeMs - tempPreviousEndTimeMs) < 30000) {
      return;
    }
    tempPreviousEndTimeMs = endTimeMs;

    const track = item.track;
    if (!track) return;

    const isAriana = track.artists?.some((artist: any) =>
      artist.id === 25059 || artist.name?.toLowerCase() === "ariana grande"
    );
    if (!isAriana) return;

    const spotifyIds = track.externalIds?.spotify || [];
    const trackId = spotifyIds[0] || String(track.id);
    const dateStr = new Date(endTimeStr).toISOString().split("T")[0];
    const trackName = track.name || track.title || trackId;

    validPlays.push({
      trackId,
      trackName,
      endTimeMs,
      dateStr,
      item
    });
  });

  // Load Firestore states for all unique dates present in the stats.fm payload
  const uniqueDates = Array.from(new Set(validPlays.map(p => p.dateStr)));
  const dailyStreamsDocs: Record<string, any> = {};
  const songStreamsDocs: Record<string, any> = {};

  await Promise.all(uniqueDates.map(async (date) => {
    const dailySnap = await userRef.collection("dailyStreams").doc(date).get();
    dailyStreamsDocs[date] = dailySnap.exists ? (dailySnap.data() || {}) : {};

    const songSnap = await db.collection("song_streams").doc(date).get();
    songStreamsDocs[date] = songSnap.exists ? (songSnap.data() || {}) : {};
  }));

  // Count total plays per track per date present in the stats.fm response
  const statsFmPlaysByDate: Record<string, Record<string, number>> = {};
  validPlays.forEach(p => {
    if (!statsFmPlaysByDate[p.dateStr]) {
      statsFmPlaysByDate[p.dateStr] = {};
    }
    statsFmPlaysByDate[p.dateStr][p.trackId] = (statsFmPlaysByDate[p.dateStr][p.trackId] || 0) + 1;
  });

  // Prepare increments per date
  const userTrackIncrementsByDate: Record<string, Record<string, number>> = {};
  const songStreamIncrementsByDate: Record<string, Record<string, number>> = {};
  const processedByDate: Record<string, number> = {};
  const pendingDocsByDate: Record<string, Record<string, any>> = {};
  const metadata: Record<string, { name: string; coverUrl: string; artists: string }> = {};

  let updatedLastTrackedEndTimeMs = lastTrackedEndTimeMs;

  validPlays.forEach(p => {
    const { trackId, trackName, endTimeMs, dateStr, item } = p;
    const isNewPlay = endTimeMs > lastTrackedEndTimeMs;

    if (!userTrackIncrementsByDate[dateStr]) userTrackIncrementsByDate[dateStr] = {};
    if (!songStreamIncrementsByDate[dateStr]) songStreamIncrementsByDate[dateStr] = {};
    if (!processedByDate[dateStr]) processedByDate[dateStr] = 0;
    if (!pendingDocsByDate[dateStr]) pendingDocsByDate[dateStr] = {};

    metadata[trackId] = getTrackMetadata(item.track, trackId, trackName);

    const currentQueued = userTrackIncrementsByDate[dateStr][trackId] || 0;
    const inDb = Number(dailyStreamsDocs[dateStr]?.[trackId] || 0);
    const totalProcessed = inDb + currentQueued;

    const statsFmCount = statsFmPlaysByDate[dateStr]?.[trackId] || 0;

    if (isNewPlay) {
      if (totalProcessed >= statsFmCount) {
        return;
      }
    } else {
      // Self-healing: if the DB count is less than the plays we got from stats.fm, we add the difference
      if (totalProcessed >= statsFmCount) {
        return;
      }
    }

    userTrackIncrementsByDate[dateStr][trackId] = (userTrackIncrementsByDate[dateStr][trackId] || 0) + 1;
    processedByDate[dateStr] += 1;
    updatedLastTrackedEndTimeMs = Math.max(updatedLastTrackedEndTimeMs, endTimeMs);

    const directMatch = catalogTracks.find((song: any) =>
      song.id === trackId || (song.alternativeIds || []).includes(trackId)
    );

    if (directMatch) {
      const mainTrackId = directMatch.spotifyTrackId || directMatch.id;
      songStreamIncrementsByDate[dateStr][mainTrackId] = (songStreamIncrementsByDate[dateStr][mainTrackId] || 0) + 1;
    } else {
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
          coverUrl: metadata[trackId].coverUrl,
          status: "pending_merge",
          streams: (pendingDocsByDate[dateStr][trackId]?.streams || 0) + 1
        };
      } else {
        songStreamIncrementsByDate[dateStr][trackId] = (songStreamIncrementsByDate[dateStr][trackId] || 0) + 1;
        pendingDocsByDate[dateStr][trackId] = {
          trackId,
          trackName,
          suggestedSongId: null,
          suggestedSongTitle: null,
          coverUrl: metadata[trackId].coverUrl,
          status: "pending_new",
          streams: (pendingDocsByDate[dateStr][trackId]?.streams || 0) + 1
        };
      }
    }
  });

  // Step 3: Self-healing reconciliation for song_streams across all affected dates
  uniqueDates.forEach(date => {
    const dailyData = dailyStreamsDocs[date] || {};
    const songStreamsTracks = songStreamsDocs[date]?.tracks || {};

    Object.entries(dailyData).forEach(([trackId, countVal]) => {
      if (["date", "total", "lastUpdated"].includes(trackId)) return;
      const userCount = Number(countVal) || 0;
      if (userCount <= 0) return;

      const matchedTrack = catalogTracks.find((song: any) =>
        song.id === trackId || (song.alternativeIds || []).includes(trackId)
      );
      const catalogTrackId = matchedTrack ? (matchedTrack.spotifyTrackId || matchedTrack.id) : trackId;

      const currentInSongStreams = Number(songStreamsTracks[catalogTrackId] || 0);
      const newIncrement = Number(songStreamIncrementsByDate[date]?.[catalogTrackId] || 0);
      const totalInSongStreams = currentInSongStreams + newIncrement;

      if (userCount > totalInSongStreams) {
        const diff = userCount - totalInSongStreams;
        if (!songStreamIncrementsByDate[date]) {
          songStreamIncrementsByDate[date] = {};
        }
        songStreamIncrementsByDate[date][catalogTrackId] = (songStreamIncrementsByDate[date][catalogTrackId] || 0) + diff;
      }
    });
  });

  let totalProcessed = 0;
  let totalSongStreamIncrements = 0;
  uniqueDates.forEach(date => {
    totalProcessed += processedByDate[date] || 0;
    totalSongStreamIncrements += Object.keys(songStreamIncrementsByDate[date] || {}).length;
  });

  if (totalProcessed === 0 && totalSongStreamIncrements === 0) {
    return {
      userId,
      processed: 0,
      lastTrackedEndTimeMs,
      metadata
    };
  }

  const batch = db.batch();

  batch.set(userRef, {
    userId,
    statsFmUserId: userId,
    displayName: profile.displayName || profile.customId || userId,
    avatarUrl: profile.image || userData.avatarUrl || "",
    customId: profile.customId || null,
    syncEnabled: true,
    source: "stats.fm",
    statsFmConnectedAt: userData.statsFmConnectedAt || now,
    statsFmLastSeenAt: now,
    lastTrackedEndTimeMs: updatedLastTrackedEndTimeMs,
    lastSyncedAt: now,
    totalStreams: admin.firestore.FieldValue.increment(totalProcessed),
    lastActive: now,
    updatedAt: now
  }, { merge: true });

  uniqueDates.forEach(date => {
    const processedForDate = processedByDate[date] || 0;
    const trackIncrements = userTrackIncrementsByDate[date] || {};

    if (processedForDate > 0 || Object.keys(trackIncrements).length > 0) {
      const dailyRef = userRef.collection("dailyStreams").doc(date);
      const dailyPayload: Record<string, any> = {
        date,
        lastUpdated: now
      };
      if (processedForDate > 0) {
        dailyPayload.total = admin.firestore.FieldValue.increment(processedForDate);
      }
      Object.entries(trackIncrements).forEach(([trackId, count]) => {
        dailyPayload[trackId] = admin.firestore.FieldValue.increment(count);
      });
      batch.set(dailyRef, dailyPayload, { merge: true });

      const leaderboardRef = db.collection("leaderboard").doc(`${date}_${userId}`);
      batch.set(leaderboardRef, {
        userId,
        displayName: profile.displayName || profile.customId || userId,
        avatarUrl: profile.image || userData.avatarUrl || "",
        streamsToday: admin.firestore.FieldValue.increment(processedForDate),
        date,
        lastUpdated: now
      }, { merge: true });
    }

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
    lastTrackedEndTimeMs: updatedLastTrackedEndTimeMs,
    metadata
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
      .filter(u => u.data.statsFmUserId && u.data.syncEnabled !== false);

    const results: any[] = [];
    const chunkSize = 5;

    for (let i = 0; i < eligibleUsers.length; i += chunkSize) {
      const chunk = eligibleUsers.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (user) => {
        try {
          return await syncOneUser(db, user.data.statsFmUserId);
        } catch (error: any) {
          return {
            userId: user.data.statsFmUserId,
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
    console.error("Error syncing stats.fm users:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "stats.fm sync endpoint is active"
  });
}
