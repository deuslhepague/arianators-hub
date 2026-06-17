import { NextResponse } from "next/server";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";
import { calculateForecast } from "@/lib/forecasting";
import { getMilestoneForStreams } from "@/lib/milestones";

export const dynamic = "force-dynamic";

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

function getTargetUpdateDate(previousHistory: StreamHistory | undefined, todayStr: string): string {
  if (!previousHistory) return todayStr;
  const dates = Object.keys(previousHistory).sort();
  if (dates.length === 0) return todayStr;
  const lastDateStr = dates[dates.length - 1];
  const parts = lastDateStr.split("-").map(Number);
  if (parts.length === 3) {
    const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    const nextDateStr = dateObj.toISOString().split("T")[0];
    if (nextDateStr <= todayStr) {
      return nextDateStr;
    }
  }
  return todayStr;
}


interface SpotifyTrackInput {
  id: string;
  title: string;
  artist: string;
  totalStreams: number;
  dailyGain: number;
  gainDiff: number;
  coverUrl: string;
  milestoneName: string;
  milestoneTarget: number;
  avgDailyGain: number;
  alternativeIds?: string[];
  spotifyTrackId?: string;
  spotifyAlbumId?: string;
  streams?: StreamHistory;
  daysToGoal?: number | null;
  dailyPace?: number;
}

interface SpotifyAlbumInput {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
  spotifyAlbumId?: string;
  isParticipation?: boolean;
  streams?: StreamHistory;
  daysToGoal?: number | null;
  dailyPace?: number;
}

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

    const app = getAdminApp();
    const db = admin.firestore(app);

    // Load catalog directly from Firestore
    const tracksSnap = await db.collection("catalog").doc("config").collection("tracks").get();
    const albumsSnap = await db.collection("catalog").doc("config").collection("albums").get();
    const tracks: SpotifyTrackInput[] = tracksSnap.docs.map(doc => doc.data() as SpotifyTrackInput);
    const albums: SpotifyAlbumInput[] = albumsSnap.docs.map(doc => doc.data() as SpotifyAlbumInput);

    // 1. Fetch Spotify token dynamically
    const spotifyToken = await getSpotifyToken();

    // Maps to store playcount data fetched from Spotify
    const trackPlaycounts: Record<string, number> = {};
    const albumPlaycounts: Record<string, number> = {};

    // 2. Resolve album IDs for tracks that don't have spotifyAlbumId but do have spotifyTrackId
    const resolvedAlbumIdsMap: Record<string, string> = {}; // trackId -> albumId
    const tracksNeedAlbumResolve = tracks.filter(t => t.spotifyTrackId && !t.spotifyAlbumId);

    for (const track of tracksNeedAlbumResolve) {
      const trackId = track.spotifyTrackId!;
      try {
        const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
        const res = await fetchSpotify(pathfinderUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "accept-language": "pt-BR",
            "app-platform": "WebPlayer",
            "authorization": `Bearer ${spotifyToken}`,
            "content-type": "application/json;charset=UTF-8",
            "origin": "https://open.spotify.com",
            "referer": "https://open.spotify.com/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            variables: { uri: `spotify:track:${trackId}` },
            operationName: "getTrack",
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294"
              }
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const trackUnion = data?.data?.trackUnion;
          if (trackUnion?.albumOfTrack?.id) {
            resolvedAlbumIdsMap[trackId] = trackUnion.albumOfTrack.id;
          }
        }
      } catch (err) {
        console.error(`Error resolving album ID for track ${trackId}:`, err);
      }
    }

    // 3. Collect all unique album IDs we need to fetch
    const uniqueAlbumIds = new Set<string>();
    
    // Add explicitly configured album IDs from tracks
    tracks.forEach(t => {
      if (t.spotifyAlbumId) {
        uniqueAlbumIds.add(t.spotifyAlbumId);
      }
      if (t.spotifyTrackId && resolvedAlbumIdsMap[t.spotifyTrackId]) {
        uniqueAlbumIds.add(resolvedAlbumIdsMap[t.spotifyTrackId]);
      }
    });

    // Add album IDs from the albums section
    albums.forEach(a => {
      const albumId = a.spotifyAlbumId || a.id;
      if (albumId && albumId.length === 22) {
        uniqueAlbumIds.add(albumId);
      }
    });

    // 4. Fetch each album from Spotify Pathfinder API to extract track playcounts and total album playcounts
    for (const albumId of uniqueAlbumIds) {
      try {
        const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
        const variables = {
          uri: `spotify:album:${albumId}`,
          locale: "intl-pt",
          offset: 0,
          limit: 50
        };
        const extensions = {
          persistedQuery: {
            version: 1,
            sha256Hash: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10"
          }
        };

        const res = await fetchSpotify(pathfinderUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "accept-language": "pt-BR",
            "app-platform": "WebPlayer",
            "authorization": `Bearer ${spotifyToken}`,
            "content-type": "application/json;charset=UTF-8",
            "origin": "https://open.spotify.com",
            "referer": "https://open.spotify.com/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            variables,
            operationName: "getAlbum",
            extensions
          })
        });

        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.albumUnion?.tracksV2?.items || [];
          let albumSum = 0;

          const matchingAlbumObj = albums.find(a => (a.spotifyAlbumId || a.id) === albumId);
          const albumIsParticipation = matchingAlbumObj?.isParticipation || false;

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
                if (id !== "3HAQ4fEd3opmo09LJIHOX2") {
                  if (!albumIsParticipation || isArianaTrack) {
                    albumSum += playcount;
                  }
                }
              }
            }
          });

          albumPlaycounts[albumId] = albumSum;
        }
      } catch (err) {
        console.error(`Error querying Pathfinder for album ${albumId}:`, err);
      }
    }

    // 5. Update track playcounts in the tracks catalog array
    const today = getTodayDateStr();
    const updatedTracks = tracks.map(track => {
      const previousTotalStreams = track.totalStreams || 0;
      const previousHistory = track.streams;
      let mainPlaycount = 0;
      
      if (track.spotifyTrackId && trackPlaycounts[track.spotifyTrackId]) {
        mainPlaycount = trackPlaycounts[track.spotifyTrackId];
      }

      let maxAltPlaycount = 0;
      if (track.alternativeIds) {
        track.alternativeIds.forEach(altId => {
          if (trackPlaycounts[altId] && trackPlaycounts[altId] > maxAltPlaycount) {
            maxAltPlaycount = trackPlaycounts[altId];
          }
        });
      }

      const totalNewStreams = Math.max(mainPlaycount, maxAltPlaycount);

      if (totalNewStreams > 0) {
        const diff = totalNewStreams - track.totalStreams;
        if (diff > 0) {
          track.gainDiff = diff - track.dailyGain;
          track.dailyGain = diff;
        } else if (diff < 0) {
          track.dailyGain = 0;
          track.gainDiff = 0;
        }
        track.totalStreams = totalNewStreams;
        const targetDate = getTargetUpdateDate(previousHistory, today);
        track.streams = addStreamHistoryEntry(
          previousHistory,
          targetDate,
          totalNewStreams,
          previousTotalStreams
        );
      }

      return track;
    });

    // 6. Update album playcounts in the albums array
    const updatedAlbums = albums.map(album => {
      const previousTotalStreams = album.totalStreams || 0;
      const previousHistory = album.streams;
      const albumId = album.spotifyAlbumId || album.id;
      if (albumId && albumPlaycounts[albumId]) {
        const newTotal = albumPlaycounts[albumId];
        const diff = newTotal - album.totalStreams;
        if (diff > 0) {
          album.dailyGain = diff;
        }
        album.totalStreams = newTotal;
        const targetDate = getTargetUpdateDate(previousHistory, today);
        album.streams = addStreamHistoryEntry(
          previousHistory,
          targetDate,
          newTotal,
          previousTotalStreams
        );
      }
      return album;
    });

    // 7. Save updated tracks and albums back to Firestore catalog config
    await db.collection("catalog").doc("config").set({
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const ops: { type: 'set', ref: admin.firestore.DocumentReference, data: any }[] = [];
    updatedTracks.forEach(track => {
      if (track && track.id) {
        const ref = db.collection("catalog").doc("config").collection("tracks").doc(track.id);
        ops.push({ type: 'set', ref, data: track });
      }
    });
    updatedAlbums.forEach(album => {
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

    // 8. Trigger statsfm-users sync to refresh user charts if needed (non-blocking)
    try {
      const expectedPasscode = process.env.ADMIN_PASSCODE || process.env.ADMIN_SECRET;
      const syncUrl = new URL("/api/spotify-sync", req.url);
      fetch(syncUrl, {
        method: "POST",
        headers: {
          "x-admin-passcode": expectedPasscode || ""
        }
      }).catch(err => console.error("Error triggering spotify-sync:", err));
    } catch (err) {
      console.error("Error setting up sync call:", err);
    }

    // 9. Slice stream history before returning to client to save bandwidth, pre-calculating forecasts
    const slicedTracks = updatedTracks.map(t => {
      const track = { ...t };

      const milestone = getMilestoneForStreams(track.totalStreams || 0);
      const forecast = calculateForecast(
        track.streams,
        track.totalStreams || 0,
        milestone.milestoneTarget,
        track.dailyGain || track.avgDailyGain || 0
      );
      track.daysToGoal = forecast.daysToGoal;
      track.dailyPace = forecast.dailyVelocity;

      const streams = track.streams;
      if (streams) {
        const sortedDates = Object.keys(streams).sort();
        const lastTwo = sortedDates.slice(-2);
        const sliced: Record<string, any> = {};
        lastTwo.forEach(date => {
          sliced[date] = streams[date];
        });
        track.streams = sliced;
      }
      return track;
    });

    const slicedAlbums = updatedAlbums.map(a => {
      const album = { ...a };

      const milestone = getMilestoneForStreams(album.totalStreams || 0);
      const forecast = calculateForecast(
        album.streams,
        album.totalStreams || 0,
        milestone.milestoneTarget,
        album.dailyGain || 0
      );
      album.daysToGoal = forecast.daysToGoal;
      album.dailyPace = forecast.dailyVelocity;

      const streams = album.streams;
      if (streams) {
        const sortedDates = Object.keys(streams).sort();
        const lastTwo = sortedDates.slice(-2);
        const sliced: Record<string, any> = {};
        lastTwo.forEach(date => {
          sliced[date] = streams[date];
        });
        album.streams = sliced;
      }
      return album;
    });

    return NextResponse.json({
      success: true,
      tracks: slicedTracks,
      albums: slicedAlbums
    });

  } catch (err: any) {
    console.error("Backend error updating plays:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
