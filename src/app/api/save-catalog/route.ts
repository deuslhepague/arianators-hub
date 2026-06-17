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

    // Save updatedAt to catalog/config
    await db.collection("catalog").doc("config").set({
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Fetch existing keys for deletion check and history merging
    const existingTracksSnap = await db.collection("catalog").doc("config").collection("tracks").get();
    const existingAlbumsSnap = await db.collection("catalog").doc("config").collection("albums").get();

    const existingTracksMap = new Map<string, any>();
    existingTracksSnap.forEach(doc => {
      existingTracksMap.set(doc.id, doc.data());
    });

    const existingAlbumsMap = new Map<string, any>();
    existingAlbumsSnap.forEach(doc => {
      existingAlbumsMap.set(doc.id, doc.data());
    });

    const newTrackIds = new Set(tracks.map(t => t.id).filter(Boolean));
    const newAlbumIds = new Set(albums.map(a => a.id).filter(Boolean));

    const ops: { type: 'set' | 'delete', ref: admin.firestore.DocumentReference, data?: any }[] = [];

    existingTracksSnap.forEach(doc => {
      if (!newTrackIds.has(doc.id)) {
        ops.push({ type: 'delete', ref: doc.ref });
      }
    });

    existingAlbumsSnap.forEach(doc => {
      if (!newAlbumIds.has(doc.id)) {
        ops.push({ type: 'delete', ref: doc.ref });
      }
    });

    tracks.forEach(track => {
      if (track && track.id) {
        const ref = db.collection("catalog").doc("config").collection("tracks").doc(track.id);
        const existingTrack = existingTracksMap.get(track.id);
        const mergedStreams = {
          ...(existingTrack?.streams || {}),
          ...(track.streams || {})
        };
        const dataToSave = {
          ...track,
          streams: mergedStreams
        };
        ops.push({ type: 'set', ref, data: dataToSave });
      }
    });

    albums.forEach(album => {
      if (album && album.id) {
        const ref = db.collection("catalog").doc("config").collection("albums").doc(album.id);
        const existingAlbum = existingAlbumsMap.get(album.id);
        const mergedStreams = {
          ...(existingAlbum?.streams || {}),
          ...(album.streams || {})
        };
        const dataToSave = {
          ...album,
          streams: mergedStreams
        };
        ops.push({ type: 'set', ref, data: dataToSave });
      }
    });

    // Run batch writes in chunks of 400
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();
      chunk.forEach(op => {
        if (op.type === 'delete') {
          batch.delete(op.ref);
        } else {
          batch.set(op.ref, op.data);
        }
      });
      await batch.commit();
    }

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
