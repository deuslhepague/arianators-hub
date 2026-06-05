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

    if (!tracks || !albums) {
      return NextResponse.json(
        { success: false, error: "Missing tracks or albums" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const catalogRef = db.collection("catalog").doc("config");
    const existingCatalogSnap = await catalogRef.get();
    const existingCatalog = existingCatalogSnap.exists ? (existingCatalogSnap.data() || {}) : {};
    const existingTracks = Array.isArray(existingCatalog.tracks) ? existingCatalog.tracks : [];

    await catalogRef.set({
      tracks,
      albums,
      updatedAt: new Date().toISOString()
    });

    const pendingWrites: Promise<unknown>[] = [];
    const now = new Date().toISOString();

    for (const track of tracks) {
      if (!track || !track.spotifyAlbumId) continue;

      const alreadyKnown = existingTracks.some((catalogTrack: any) => trackMatchesCatalog(track, catalogTrack));
      if (alreadyKnown) continue;

      const trackId = track.spotifyTrackId || track.id;
      if (!trackId) continue;

      const titleMatch = existingTracks.find((catalogTrack: any) =>
        cleanTrackTitle(catalogTrack.title) === cleanTrackTitle(track.title)
      );

      const pendingRef = db.collection("pending_validations").doc(trackId);
      pendingWrites.push(
        pendingRef.set(
          {
            trackId,
            trackName: track.title,
            suggestedSongId: titleMatch?.id || null,
            suggestedSongTitle: titleMatch?.title || null,
            coverUrl: track.coverUrl || "/petal.jpg",
            streams: 0,
            status: titleMatch ? "pending_merge" : "pending_new",
            source: "album_import",
            date: now.split("T")[0],
            updatedAt: now
          },
          { merge: true }
        )
      );
    }

    await Promise.all(pendingWrites);

    return NextResponse.json({
      success: true,
      message: `Saved ${tracks.length} tracks and ${albums.length} albums`
    });
  } catch (error: any) {
    console.error("Error saving catalog:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
