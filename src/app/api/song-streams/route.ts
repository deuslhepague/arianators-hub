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

function cleanTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s*-\s*(sped up|slowed|acapella|instrumental|remix|acoustic|radio edit|edit|live|version).*/i, "")
    .trim();
}

let cachedCatalog: { tracks: any[]; albums: any[] } = { tracks: [], albums: [] };
let cachedCatalogTimestamp = 0;

async function loadCatalog(db: admin.firestore.Firestore): Promise<{ tracks: any[]; albums: any[] }> {
  const now = Date.now();
  if (cachedCatalog.tracks.length > 0 && (now - cachedCatalogTimestamp) < 600000) {
    return cachedCatalog;
  }
  const snap = await db.collection("catalog").doc("config").get();
  if (!snap.exists) return { tracks: [], albums: [] };
  const data = snap.data() || {};
  cachedCatalog = { tracks: data.tracks || [], albums: data.albums || [] };
  cachedCatalogTimestamp = now;
  return cachedCatalog;
}

async function loadSongStreamDoc(db: admin.firestore.Firestore, dateStr: string) {
  const snap = await db.collection("song_streams").doc(dateStr).get();
  return snap.exists ? (snap.data() || { tracks: {} }) : { tracks: {} };
}

async function saveSongStreamDoc(db: admin.firestore.Firestore, dateStr: string, tracks: Record<string, number>) {
  await db.collection("song_streams").doc(dateStr).set(
    {
      date: dateStr,
      tracks,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

function trackMatchesCatalog(song: any, trackId: string, trackName?: string) {
  if (song.id === trackId) return true;
  const altIds = song.alternativeIds || [];
  if (altIds.includes(trackId)) return true;
  if (trackName && cleanTrackTitle(song.title) === cleanTrackTitle(trackName)) return true;
  return false;
}

function sumPendingForTrack(pendingDocs: any[], trackId: string) {
  return pendingDocs
    .filter((item) => item.status === "pending_merge" && item.suggestedSongId === trackId)
    .reduce((sum, item) => sum + (item.streams || 0), 0);
}

interface SongStreamsCache {
  data: any;
  timestamp: number;
}

const cachedSongLeaderboards: Record<string, SongStreamsCache> = {};

export async function GET(req: Request) {
  try {
    const app = getAdminApp();
    const db = admin.firestore(app);
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || getTodayDateStr();
    const view = url.searchParams.get("view") || "songs";
    const bypassCache = url.searchParams.get("bypass") === "true";

    if (view === "pending") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const authResult = verifyAdminSessionToken(token);

      if (!authResult.valid) {
        return NextResponse.json(
          { success: false, error: authResult.error || "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const now = Date.now();
    // Cache duration: 1 minute for all dates
    const cacheDuration = 60000;

    if (view === "songs" && !bypassCache && cachedSongLeaderboards[dateStr] && (now - cachedSongLeaderboards[dateStr].timestamp) < cacheDuration) {
      return NextResponse.json(cachedSongLeaderboards[dateStr].data);
    }

    const pendingSnap = await db.collection("pending_validations").get();
    const pendingDocs: any[] = [];
    pendingSnap.forEach((docSnap) => {
      pendingDocs.push(docSnap.data());
    });

    if (view === "pending") {
      return NextResponse.json({
        success: true,
        requests: pendingDocs.filter((item) => item.status === "pending_merge" || item.status === "pending_new" || item.status === "auto_merged")
      });
    }

    const { tracks: catalogTracks } = await loadCatalog(db);
    const songStreamDoc = await loadSongStreamDoc(db, dateStr);
    const songStreams: Record<string, number> = songStreamDoc.tracks || {};

    const list = catalogTracks.map((song: any) => {
      const mainId = song.id;
      const spotifyId = song.spotifyTrackId;
      const altIds = song.alternativeIds || [];

      let codebaseStreams = Number(songStreams[mainId] || 0);
      if (spotifyId && spotifyId !== mainId) {
        codebaseStreams += Number(songStreams[spotifyId] || 0);
      }
      altIds.forEach((altId: string) => {
        if (altId !== mainId && altId !== spotifyId) {
          codebaseStreams += Number(songStreams[altId] || 0);
        }
      });

      return {
        id: mainId,
        title: song.title,
        artist: song.artist || "Ariana Grande",
        coverUrl: song.coverUrl || "/petal.jpg",
        cycleDate: dateStr,
        fanbaseStreams: codebaseStreams,
        pendingStreams: sumPendingForTrack(pendingDocs, mainId),
        isPending: false
      };
    });

    pendingDocs.forEach((item) => {
      if (item.status === "pending_new" || !item.suggestedSongId) {
        list.push({
          id: item.trackId,
          title: item.trackName,
          artist: "Ariana Grande",
          coverUrl: item.coverUrl || "/petal.jpg",
          cycleDate: dateStr,
          fanbaseStreams: songStreams[item.trackId] || 0,
          pendingStreams: songStreams[item.trackId] || 0,
          isPending: true
        });
      }
    });

    list.sort((a: any, b: any) => b.fanbaseStreams - a.fanbaseStreams);

    const payload = {
      success: true,
      songs: list
    };

    if (view === "songs") {
      cachedSongLeaderboards[dateStr] = {
        data: payload,
        timestamp: now
      };
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Error loading song streams:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { trackId, trackName, coverUrl, count } = await req.json();
    if (!trackId || !trackName || !count) {
      return NextResponse.json(
        { success: false, error: "Missing trackId, trackName or count" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const dateStr = getTodayDateStr();

    const { tracks: catalogTracks } = await loadCatalog(db);
    const songStreamDoc = await loadSongStreamDoc(db, dateStr);
    const songStreams: Record<string, number> = songStreamDoc.tracks || {};
    const pendingRef = db.collection("pending_validations").doc(trackId);

    let matchedSong = catalogTracks.find((song: any) => trackMatchesCatalog(song, trackId));

    if (matchedSong) {
      songStreams[matchedSong.id] = (songStreams[matchedSong.id] || 0) + count;
      await saveSongStreamDoc(db, dateStr, songStreams);
      return NextResponse.json({ success: true });
    }

    matchedSong = catalogTracks.find((song: any) => cleanTrackTitle(song.title) === cleanTrackTitle(trackName));

    if (matchedSong) {
      songStreams[matchedSong.id] = (songStreams[matchedSong.id] || 0) + count;
      await saveSongStreamDoc(db, dateStr, songStreams);
      await pendingRef.set(
        {
          trackId,
          trackName,
          suggestedSongId: matchedSong.id,
          suggestedSongTitle: matchedSong.title,
          coverUrl,
          streams: admin.firestore.FieldValue.increment(count),
          status: "pending_merge",
          date: dateStr,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      return NextResponse.json({ success: true });
    }

    songStreams[trackId] = (songStreams[trackId] || 0) + count;
    await saveSongStreamDoc(db, dateStr, songStreams);
    await pendingRef.set(
      {
        trackId,
        trackName,
        suggestedSongId: null,
        suggestedSongTitle: null,
        coverUrl,
        streams: admin.firestore.FieldValue.increment(count),
        status: "pending_new",
        date: dateStr,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving song stream:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const authResult = verifyAdminSessionToken(token);

    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { trackId, action, targetSongId } = await req.json();
    if (!trackId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing trackId or action" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const pendingRef = db.collection("pending_validations").doc(trackId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ success: true });
    }

    const pending = pendingSnap.data() || {};
    const dateStr = pending.date || getTodayDateStr();
    const songStreamDoc = await loadSongStreamDoc(db, dateStr);
    const songStreams: Record<string, number> = songStreamDoc.tracks || {};
    const { tracks: catalogTracks } = await loadCatalog(db);

    if (action === "merge" && targetSongId) {
      const targetIndex = catalogTracks.findIndex((song: any) => song.id === targetSongId);
      if (targetIndex !== -1) {
        const targetSong = catalogTracks[targetIndex];
        const targetKey = targetSong.spotifyTrackId || targetSong.id;

        const alternativeIds = Array.isArray(targetSong.alternativeIds) ? [...targetSong.alternativeIds] : [];
        if (!alternativeIds.includes(trackId)) {
          alternativeIds.push(trackId);
        }
        catalogTracks[targetIndex] = { ...targetSong, alternativeIds };

        // 1. Update today's in-memory songStreams to merge trackId into targetKey
        if (trackId !== targetKey) {
          const todayCount = Number(songStreams[trackId] || pending.streams || 0);
          if (todayCount > 0) {
            songStreams[targetKey] = (songStreams[targetKey] || 0) + todayCount;
          }
          delete songStreams[trackId];
        }

        // 2. Query all documents in the song_streams collection to perform historical merges
        const songStreamsSnap = await db.collection("song_streams").get();
        const batch = db.batch();
        let hasBatchOps = false;

        songStreamsSnap.forEach((doc) => {
          if (doc.id === dateStr) return; // Skip today's document as it will be saved by saveSongStreamDoc below

          const docData = doc.data() || {};
          const tracksMap = docData.tracks || {};
          if (tracksMap[trackId] !== undefined) {
            const count = Number(tracksMap[trackId]) || 0;
            if (count > 0 && trackId !== targetKey) {
              tracksMap[targetKey] = (tracksMap[targetKey] || 0) + count;
            }
            delete tracksMap[trackId];
            batch.set(doc.ref, { tracks: tracksMap }, { merge: true });
            hasBatchOps = true;
          }
        });

        if (hasBatchOps) {
          await batch.commit();
        }
      }
    } else if (action === "create") {
      const newTrack = {
        id: trackId,
        title: pending.trackName || trackId,
        artist: "Ariana Grande",
        totalStreams: songStreams[trackId] || pending.streams || 0,
        dailyGain: 0,
        gainDiff: 0,
        coverUrl: pending.coverUrl || "/petal.jpg",
        milestoneName: "Goal",
        milestoneTarget: 10_000_000,
        avgDailyGain: 100_000,
        alternativeIds: [],
        streams: {
          [dateStr]: {
            total: songStreams[trackId] || pending.streams || 0,
            daily: songStreams[trackId] || pending.streams || 0
          }
        }
      };
      catalogTracks.push(newTrack);
    } else if (action === "reject") {
      delete songStreams[trackId];
    }

    await db.collection("catalog").doc("config").set(
      {
        tracks: catalogTracks,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    await saveSongStreamDoc(db, dateStr, songStreams);
    await pendingRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error resolving song validation:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const authResult = verifyAdminSessionToken(token);

    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const today = getTodayDateStr();

    const usersSnap = await db.collection("users").get();
    const simUsers: Array<{ id: string; data: any }> = [];
    usersSnap.forEach((docSnap) => {
      if (docSnap.id.startsWith("sim_")) {
        simUsers.push({ id: docSnap.id, data: docSnap.data() });
      }
    });

    const songStreamDoc = await loadSongStreamDoc(db, today);
    const songStreams: Record<string, number> = songStreamDoc.tracks || {};
    const { tracks: catalogTracks } = await loadCatalog(db);

    for (const user of simUsers) {
      const dailyStreamsSnap = await db.collection("users").doc(user.id).collection("dailyStreams").get();
      const deletePromises: Promise<any>[] = [];

      dailyStreamsSnap.forEach((docSnap) => {
        const dayData = docSnap.data() || {};
        Object.entries(dayData).forEach(([trackId, count]) => {
          if (trackId === "total" || trackId === "date" || trackId === "lastUpdated") return;
          const value = typeof count === "number" ? count : Number(count) || 0;
          if (!value) return;

          const matched = catalogTracks.find((song: any) => song.id === trackId || (song.alternativeIds || []).includes(trackId));
          const songKey = matched ? matched.id : trackId;
          if (songStreams[songKey]) {
            songStreams[songKey] = Math.max(0, songStreams[songKey] - value);
          }
        });
        deletePromises.push(docSnap.ref.delete());
      });

      const leaderboardSnap = await db.collection("leaderboard").where("userId", "==", user.id).get();
      leaderboardSnap.forEach((docSnap) => deletePromises.push(docSnap.ref.delete()));

      deletePromises.push(db.collection("users").doc(user.id).delete());
      await Promise.all(deletePromises);
    }

    await saveSongStreamDoc(db, today, songStreams);

    return NextResponse.json({
      success: true,
      removedUsers: simUsers.length
    });
  } catch (error: any) {
    console.error("Error clearing simulated plays:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
