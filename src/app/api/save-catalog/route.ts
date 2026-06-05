import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";

// Inicializar Firebase Admin SDK com credenciais do arquivo JSON local
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const credPath = path.join(
      process.cwd(),
      "arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json"
    );

    if (!fs.existsSync(credPath)) {
      throw new Error(
        `Firebase credentials file not found at ${credPath}. ` +
        `Make sure arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json exists in the root directory.`
      );
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(credPath, "utf-8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: "arianatorshub"
    });

    return admin.app();
  } catch (error: any) {
    console.error("Firebase Admin initialization error:", error.message);
    throw error;
  }
}

function cleanTrackTitle(title: string): string {
  return String(title || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s*-\s*(sped up|slowed|acapella|instrumental|remix|acoustic|radio edit|edit|live|version).*/i, "")
    .trim();
}

function trackMatchesCatalog(track: any, catalogTrack: any): boolean {
  if (!track || !catalogTrack) return false;

  const trackId = track.spotifyTrackId || track.id;
  if (trackId && (catalogTrack.spotifyTrackId === trackId || catalogTrack.id === trackId)) {
    return true;
  }

  const altIds = Array.isArray(catalogTrack.alternativeIds) ? catalogTrack.alternativeIds : [];
  if (trackId && altIds.includes(trackId)) {
    return true;
  }

  if (
    track.title &&
    catalogTrack.title &&
    cleanTrackTitle(track.title) === cleanTrackTitle(catalogTrack.title)
  ) {
    return true;
  }

  return false;
}

/**
 * Save catalog (tracks + albums) to Firestore as admin
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const { tracks, albums } = body;

    if (!Array.isArray(tracks) || tracks.length === 0 || !Array.isArray(albums) || albums.length === 0) {
      return NextResponse.json(
        { success: false, error: "Empty tracks or albums arrays are blocked to prevent catalog data loss." },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const catalogRef = db.collection("catalog").doc("config");
    const existingCatalogSnap = await catalogRef.get();
    const existingCatalog = existingCatalogSnap.exists ? (existingCatalogSnap.data() || {}) : {};
    const existingTracks = Array.isArray(existingCatalog.tracks) ? existingCatalog.tracks : [];

    const finalTracksMap = new Map();
    const existingIds = new Set(existingTracks.map((t: any) => t.id));
    const existingSpotifyIds = new Set(existingTracks.map((t: any) => t.spotifyTrackId).filter(Boolean));
    const existingAltIdToMainId = new Map();
    existingTracks.forEach((t: any) => {
      const altIds = Array.isArray(t.alternativeIds) ? t.alternativeIds : [];
      altIds.forEach((altId: string) => {
        existingAltIdToMainId.set(altId, t.id);
      });
    });

    const pendingWrites = [];
    const now = new Date().toISOString();

    for (const track of tracks) {
      if (!track) continue;

      const trackId = track.spotifyTrackId || track.id;
      if (!trackId) continue;

      // Check if this is an existing track in the database
      const isExisting =
        existingIds.has(track.id) ||
        existingSpotifyIds.has(track.spotifyTrackId) ||
        existingAltIdToMainId.has(track.spotifyTrackId);

      if (isExisting) {
        // Keep the track exactly as sent by the client (preserving edits, deletes, unlinks)
        finalTracksMap.set(track.id, track);
      } else {
        // This is a new track: check for auto-merge or reconciliation suggestions
        const isIntro = String(track.title || "").toLowerCase().includes("intro");
        const exactMatch = !isIntro && Array.from(finalTracksMap.values()).find((et: any) =>
          String(et.title || "").toLowerCase().trim() === String(track.title || "").toLowerCase().trim()
        );

        if (exactMatch) {
          // AUTO-MERGE!
          const alternativeIds = Array.isArray(exactMatch.alternativeIds) ? [...exactMatch.alternativeIds] : [];
          if (!alternativeIds.includes(trackId)) {
            alternativeIds.push(trackId);
          }
          exactMatch.alternativeIds = alternativeIds;
          finalTracksMap.set(exactMatch.id, exactMatch);

          const pendingRef = db.collection("pending_validations").doc(trackId);
          pendingWrites.push(
            pendingRef.set({
              trackId,
              trackName: track.title,
              suggestedSongId: exactMatch.id,
              suggestedSongTitle: exactMatch.title,
              coverUrl: track.coverUrl || "/petal.jpg",
              streams: 0,
              status: "auto_merged",
              source: "album_import",
              date: now.split("T")[0],
              updatedAt: now
            }, { merge: true })
          );
        } else {
          // Keep the track as a separate item
          const cleanMatch = Array.from(finalTracksMap.values()).find((et: any) =>
            cleanTrackTitle(et.title) === cleanTrackTitle(track.title)
          );

          finalTracksMap.set(track.id, track);

          const pendingRef = db.collection("pending_validations").doc(trackId);
          pendingWrites.push(
            pendingRef.set({
              trackId,
              trackName: track.title,
              suggestedSongId: cleanMatch?.id || null,
              suggestedSongTitle: cleanMatch?.title || null,
              coverUrl: track.coverUrl || "/petal.jpg",
              streams: 0,
              status: cleanMatch ? "pending_merge" : "pending_new",
              source: "album_import",
              date: now.split("T")[0],
              updatedAt: now
            }, { merge: true })
          );
        }
      }
    }

    const finalTracks = Array.from(finalTracksMap.values());

    await catalogRef.set({
      tracks: finalTracks,
      albums,
      updatedAt: new Date().toISOString()
    });

    await Promise.all(pendingWrites);

    return NextResponse.json({
      success: true,
      message: `Saved ${finalTracks.length} tracks and ${albums.length} albums`
    });
  } catch (error: any) {
    console.error("Error saving catalog:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
