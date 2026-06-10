import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";

export const dynamic = "force-dynamic";

interface TrackData {
  id: string;
  title: string;
  spotifyTrackId?: string;
  spotifyAlbumId?: string;
  totalStreams?: number;
  dailyGain?: number;
  gainDiff?: number;
  streams?: StreamHistory;
}

interface AlbumData {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  spotifyAlbumId?: string;
  isParticipation?: boolean;
  streams?: StreamHistory;
}

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
      throw new Error(`Firebase credentials file not found at ${credPath}`);
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

export async function POST(req: Request) {
  try {
    // Verify admin passcode
    const adminPasscode = req.headers.get("x-admin-passcode") || req.headers.get("x-admin-secret");
    const expectedPasscode = process.env.ADMIN_PASSCODE || process.env.ADMIN_SECRET;
    
    if (!expectedPasscode || adminPasscode !== expectedPasscode) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - invalid admin passcode" },
        { status: 401 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    // Load catalog directly from Firestore
    let tracks: TrackData[] = [];
    let albums: AlbumData[] = [];
    try {
      const tracksSnap = await db.collection("catalog").doc("config").collection("tracks").get();
      const albumsSnap = await db.collection("catalog").doc("config").collection("albums").get();
      tracks = tracksSnap.docs.map(doc => doc.data() as TrackData);
      albums = albumsSnap.docs.map(doc => doc.data() as AlbumData);
    } catch (err) {
      console.error("Error loading catalog from Firestore:", err);
      return NextResponse.json(
        { success: false, error: "Failed to load catalog from database" },
        { status: 500 }
      );
    }

    if (tracks.length === 0 && albums.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tracks or albums to update",
        updatedCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get Spotify token
    const token = await getSpotifyToken();
    
    // Track updates
    const updates: any[] = [];
    const albumUpdates: any[] = [];
    const errors: any[] = [];
    let previousDayData: any = null;

    // Get yesterday's date for comparison
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split('T')[0];

    // Map to cache track playcounts returned from album fetches
    const trackPlaycounts: Record<string, number> = {};

    // 1. Update all albums first
    for (const album of albums) {
      const albumId = album.spotifyAlbumId || album.id;
      if (!albumId || albumId.length !== 22) continue;

      try {
        const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
        const pathfinderRes = await fetchSpotify(pathfinderUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "accept-language": "pt-BR",
            "app-platform": "WebPlayer",
            "authorization": `Bearer ${token}`,
            "content-type": "application/json;charset=UTF-8",
            "origin": "https://open.spotify.com",
            "referer": "https://open.spotify.com/",
            "spotify-app-version": "1.2.92.73.g916d0757",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"
          },
          body: JSON.stringify({
            variables: {
              uri: `spotify:album:${albumId}`,
              locale: "intl-pt",
              offset: 0,
              limit: 50
            },
            operationName: "getAlbum",
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10"
              }
            }
          })
        });

        if (pathfinderRes.ok) {
          const data = await pathfinderRes.json();
          const items = data?.data?.albumUnion?.tracksV2?.items || [];
          let albumSum = 0;
          const albumIsParticipation = album.isParticipation || false;

          items.forEach((item: any) => {
            const track = item?.track;
            if (track) {
              const uri = track.uri || "";
              const id = uri.split(":track:")[1] || uri;
              const playcountStr = track.playcount || "0";
              const playcount = parseInt(playcountStr, 10) || 0;

              // Check if Ariana Grande participates in this track
              const artistsItems = track.artists?.items || [];
              const isArianaTrack = artistsItems.some((a: any) => 
                a.profile?.name?.toLowerCase().includes("ariana grande")
              );

              if (id) {
                trackPlaycounts[id] = playcount;
                // Exclude "The Way - Spanglish Version" (3HAQ4fEd3opmo09LJIHOX2) because it shares/duplicates the playcount of the standard version
                if (id !== "3HAQ4fEd3opmo09LJIHOX2") {
                  if (!albumIsParticipation || isArianaTrack) {
                    albumSum += playcount;
                  }
                }
              }
            }
          });

          if (albumSum > 0) {
            const oldPlaycount = album.totalStreams || 0;
            
            // Calculate daily gain based on yesterday's final total count
            const yesterdayEntry = album.streams?.[yesterdayDateStr];
            const yesterdayTotal = yesterdayEntry?.total || 0;

            const dailyGain = (yesterdayEntry !== undefined && albumSum !== yesterdayTotal)
              ? Math.max(0, albumSum - yesterdayTotal)
              : (yesterdayEntry !== undefined ? (yesterdayEntry.daily || album.dailyGain || 0) : Math.max(0, albumSum - oldPlaycount));

            albumUpdates.push({
              id: album.id,
              title: album.title,
              oldPlaycount,
              newPlaycount: albumSum,
              dailyGain,
              timestamp: new Date().toISOString()
            });

            album.totalStreams = albumSum;
            album.dailyGain = dailyGain;

            // Add stream history entry for today
            const today = getTodayDateStr();
            album.streams = addStreamHistoryEntry(
              album.streams,
              today,
              albumSum,
              yesterdayTotal || oldPlaycount
            );
          }
        } else {
          errors.push({
            albumId: album.id,
            error: `Spotify API error: ${pathfinderRes.status}`
          });
        }
      } catch (err: any) {
        errors.push({
          albumId: album.id,
          error: err.message || "Unknown error"
        });
      }
    }

    // 2. Update each track's playcount
    for (const track of tracks) {
      if (!track.spotifyTrackId) continue;

      try {
        let newPlaycount = 0;

        // Check if we already fetched this track's playcount during album updates
        if (trackPlaycounts[track.spotifyTrackId]) {
          newPlaycount = trackPlaycounts[track.spotifyTrackId];
        } else {
          // Fetch track data individually from Spotify Pathfinder
          const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
          const pathfinderRes = await fetchSpotify(pathfinderUrl, {
            method: "POST",
            headers: {
              "accept": "application/json",
              "accept-language": "pt-BR",
              "app-platform": "WebPlayer",
              "authorization": `Bearer ${token}`,
              "content-type": "application/json;charset=UTF-8",
              "origin": "https://open.spotify.com",
              "referer": "https://open.spotify.com/",
              "spotify-app-version": "1.2.92.73.g916d0757",
              "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"
            },
            body: JSON.stringify({
              variables: { uri: `spotify:track:${track.spotifyTrackId}` },
              operationName: "getTrack",
              extensions: {
                persistedQuery: {
                  version: 1,
                  sha256Hash: "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294"
                }
              }
            })
          });

          if (!pathfinderRes.ok) {
            errors.push({
              trackId: track.id,
              error: `Spotify API error: ${pathfinderRes.status}`
            });
            continue;
          }

          const data = await pathfinderRes.json();
          const trackUnion = data?.data?.trackUnion;
          
          if (!trackUnion) {
            errors.push({
              trackId: track.id,
              error: "No track data returned from Spotify"
            });
            continue;
          }

          newPlaycount = parseInt(trackUnion.playcount || "0", 10) || 0;
        }

        const oldPlaycount = track.totalStreams || 0;

        // Calculate daily gain based on yesterday's final total count
        const yesterdayEntry = track.streams?.[yesterdayDateStr];
        const yesterdayTotal = yesterdayEntry?.total || 0;
        const yesterdayDailyGain = yesterdayEntry?.daily || 0;

        let dailyGain = 0;
        let gainDiff = track.gainDiff || 0;

        if (yesterdayEntry !== undefined && newPlaycount !== yesterdayTotal) {
          dailyGain = Math.max(0, newPlaycount - yesterdayTotal);
          gainDiff = dailyGain - yesterdayDailyGain;
        } else if (yesterdayEntry !== undefined) {
          // Spotify has not updated yet, retain yesterday's gain and gainDiff
          dailyGain = yesterdayDailyGain || track.dailyGain || 0;
          gainDiff = track.gainDiff || 0;
        } else {
          dailyGain = Math.max(0, newPlaycount - oldPlaycount);
        }

        updates.push({
          id: track.id,
          title: track.title,
          oldPlaycount,
          newPlaycount,
          dailyGain,
          gainDiff,
          timestamp: new Date().toISOString()
        });

        // Update track data
        track.totalStreams = newPlaycount;
        track.dailyGain = dailyGain;
        track.gainDiff = gainDiff;

        // Add stream history entry for today
        const today = getTodayDateStr();
        track.streams = addStreamHistoryEntry(
          track.streams,
          today,
          newPlaycount,
          yesterdayTotal || oldPlaycount
        );

      } catch (err: any) {
        errors.push({
          trackId: track.id,
          error: err.message || "Unknown error"
        });
      }
    }

    // Save updated tracks and albums back to Firestore catalog config
    try {
      await db.collection("catalog").doc("config").set({
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const ops: { type: 'set', ref: admin.firestore.DocumentReference, data: any }[] = [];
      tracks.forEach(track => {
        if (track && track.id) {
          const ref = db.collection("catalog").doc("config").collection("tracks").doc(track.id);
          ops.push({ type: 'set', ref, data: track });
        }
      });
      albums.forEach(album => {
        if (album && album.id) {
          const ref = db.collection("catalog").doc("config").collection("albums").doc(album.id);
          ops.push({ type: 'set', ref, data: album });
        }
      });

      const CHUNK_SIZE = 400;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        chunk.forEach(op => {
          batch.set(op.ref, op.data);
        });
        await batch.commit();
      }

      try {
        const syncUrl = new URL("/api/spotify-sync", req.url);
        await fetch(syncUrl, {
          method: "POST",
          headers: {
            "x-admin-passcode": expectedPasscode
          }
        });
      } catch (syncError) {
        console.error("Error running Spotify sync from scheduled update:", syncError);
      }
    } catch (err) {
      console.error("Error saving updated data to Firestore:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} tracks and ${albumUpdates.length} albums`,
      updatedTracksCount: updates.length,
      updatedAlbumsCount: albumUpdates.length,
      errorCount: errors.length,
      updates: updates.slice(0, 10), // Return first 10 for brevity
      albumUpdates: albumUpdates.slice(0, 10),
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
      note: errors.length > 0 ? "Some entities failed to update" : "All entities updated successfully"
    });

  } catch (err: any) {
    console.error("Scheduled update error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trigger = url.searchParams.get("trigger");
    const adminPasscode = url.searchParams.get("admin_passcode") || url.searchParams.get("admin_secret");

    if (trigger === "now" && adminPasscode) {
      // Convert GET request to POST for manual trigger
      const postReq = new Request(req, {
        method: "POST",
        headers: new Headers(req.headers)
      });
      
      if (adminPasscode) {
        postReq.headers.set("x-admin-passcode", adminPasscode);
        postReq.headers.set("x-force-update", "true");
      }

      return POST(postReq);
    }

    const now = new Date();
    const gmt = new Date(now.toLocaleString("en-US", { timeZone: "GMT" }));
    const nextUpdateGMT = new Date(gmt);
    nextUpdateGMT.setUTCDate(nextUpdateGMT.getUTCDate() + 1);
    nextUpdateGMT.setUTCHours(0, 0, 0, 0);

    return NextResponse.json({
      status: "ok",
      message: "Scheduled update endpoint is active",
      currentTime: gmt.toISOString(),
      nextScheduledUpdate: nextUpdateGMT.toISOString(),
      description: "Updates run automatically at 00:00 GMT daily",
      manualTrigger: "POST with x-admin-passcode header and x-force-update: true"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
