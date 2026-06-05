import { NextResponse } from "next/server";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { dbOperations } from "@/lib/firebase";
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

/**
 * Scheduled update route - updates playcount for all tracks at midnight GMT
 * 
 * GRATUITO: Use GitHub Actions para chamar este endpoint diariamente:
 * 1. Crie .github/workflows/daily-update.yml
 * 2. Configure para executar todo dia 00:00 GMT
 * 3. Envie request POST com header x-admin-passcode
 * 
 * Exemplo com cron:
 *   schedule:
 *     - cron: '0 0 * * *'  # 00:00 GMT
 * 
 * Ou use uptimerobot.com (free tier) para simples HTTP requests
 */
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

    // Load all tracks from database
    let tracks: TrackData[] = [];
    try {
      const catalog = await dbOperations.loadCatalog();
      if (catalog && catalog.tracks) {
        tracks = catalog.tracks;
      }
    } catch (err) {
      console.error("Error loading catalog:", err);
      // Continue with empty array - will just update what we can
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

    // Get yesterday's data for comparison
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split('T')[0];

    try {
      previousDayData = await dbOperations.getHistoricalData(yesterdayDateStr);
    } catch (_) {
      console.warn("Could not load yesterday's data");
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
        const dailyGain = Math.max(0, newPlaycount - oldPlaycount);

        // Calculate gainDiff (change in daily gain compared to yesterday)
        let gainDiff = 0;
        if (previousDayData?.tracks?.[track.id]) {
          const yesterdayDailyGain = previousDayData.tracks[track.id].dailyGain || 0;
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
          oldPlaycount
        );

      } catch (err: any) {
        errors.push({
          trackId: track.id,
          error: err.message || "Unknown error"
        });
      }
    }

    // Save updated tracks to database
    try {
      await dbOperations.saveCatalog(tracks, []);
      
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
      
      await dbOperations.saveHistoricalData(today, historicalSnapshot);

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
      console.error("Error saving to database:", err);
      // Still return success - tracks were fetched even if save failed
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

/**
 * GET endpoint - returns current status and can trigger manual update
 */
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
