import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";

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
    let albums: any[] = [];
    try {
      const catalogSnap = await db.collection("catalog").doc("config").get();
      if (catalogSnap.exists) {
        const catalogData = catalogSnap.data();
        tracks = catalogData?.tracks || [];
        albums = catalogData?.albums || [];
      }
    } catch (err) {
      console.error("Error loading catalog from Firestore:", err);
      return NextResponse.json(
        { success: false, error: "Failed to load catalog from database" },
        { status: 500 }
      );
    }

    if (tracks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tracks to update",
        updatedCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get Spotify token
    const token = await getSpotifyToken();
    
    // Track updates
    const updates: any[] = [];
    const errors: any[] = [];
    let previousDayData: any = null;

    // Get yesterday's date for comparison
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split('T')[0];

    try {
      const yesterdaySnap = await db.collection("historical").doc(yesterdayDateStr).get();
      if (yesterdaySnap.exists) {
        previousDayData = yesterdaySnap.data();
      }
    } catch (_) {
      console.warn("Could not load yesterday's data from Firestore");
    }

    // Update each track's playcount from Spotify
    for (const track of tracks) {
      if (!track.spotifyTrackId) continue;

      try {
        // Fetch track data from Spotify Pathfinder
        const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
        const pathfinderRes = await fetchSpotify(pathfinderUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "accept-language": "pt-BR",
            "app-platform": "WebPlayer",
            "authorization": `Bearer ${token}`,
            "content-type": "application/json;charset=UTF-8",
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

        const newPlaycount = parseInt(trackUnion.playcount || "0", 10) || 0;
        const oldPlaycount = track.totalStreams || 0;

        // Calculate daily gain based on yesterday's final total count (to support multiple runs a day)
        const yesterdayData = previousDayData?.tracks?.[track.id];
        const yesterdayTotal = yesterdayData?.totalStreams || 0;
        const yesterdayDailyGain = yesterdayData?.dailyGain || 0;

        const dailyGain = yesterdayData !== undefined
          ? Math.max(0, newPlaycount - yesterdayTotal)
          : Math.max(0, newPlaycount - oldPlaycount);

        // Calculate gainDiff (change in daily gain compared to yesterday)
        let gainDiff = 0;
        if (yesterdayData !== undefined) {
          gainDiff = dailyGain - yesterdayDailyGain;
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
        tracks,
        albums,
        updatedAt: new Date().toISOString()
      });
      
      // Also save today's snapshot to historical data
      const today = new Date().toISOString().split('T')[0];
      const historicalSnapshot: any = {
        date: today,
        tracks: {}
      };
      
      for (const track of tracks) {
        historicalSnapshot.tracks[track.id] = {
          totalStreams: track.totalStreams,
          dailyGain: track.dailyGain,
          gainDiff: track.gainDiff
        };
      }
      
      await db.collection("historical").doc(today).set({
        date: today,
        tracks: historicalSnapshot.tracks,
        savedAt: new Date().toISOString()
      });

      try {
        const syncUrl = new URL("/api/statsfm-sync", req.url);
        await fetch(syncUrl, {
          method: "POST",
          headers: {
            "x-admin-passcode": expectedPasscode
          }
        });
      } catch (syncError) {
        console.error("Error running stats.fm sync from scheduled update:", syncError);
      }
    } catch (err) {
      console.error("Error saving updated data to Firestore:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} tracks`,
      updatedCount: updates.length,
      errorCount: errors.length,
      updates: updates.slice(0, 10), // Return first 10 for brevity
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
      note: errors.length > 0 ? "Some tracks failed to update" : "All tracks updated successfully"
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
