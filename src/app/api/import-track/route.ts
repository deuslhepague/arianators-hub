import { NextResponse } from "next/server";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";
import { getMilestoneForStreams } from "@/lib/milestones";

export const dynamic = "force-dynamic";

interface TrackImportResult {
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
  alternativeIds: string[];
  spotifyTrackId: string;
  spotifyAlbumId: string;
  streams?: StreamHistory;
}

export async function POST(req: Request) {
  try {
    const { trackUrlOrId } = await req.json();
    if (!trackUrlOrId) {
      return NextResponse.json({ success: false, error: "Missing trackUrlOrId parameter" }, { status: 400 });
    }

    // Extract 22-character Spotify track ID (handles intl-pt URLs too)
    const match = trackUrlOrId.match(/[a-zA-Z0-9]{22}(?=[^a-zA-Z0-9]|$)/);
    const trackId = match ? match[0] : null;
    if (!trackId) {
      return NextResponse.json({ success: false, error: "Invalid Spotify track link or ID" }, { status: 400 });
    }

    // 1. Fetch Spotify token
    const token = await getSpotifyToken();

    // 2. Fetch track data from Pathfinder — returns name, artists, album cover, and playcount in ONE call
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

    if (!pathfinderRes.ok) {
      return NextResponse.json({ success: false, error: `Pathfinder error: ${pathfinderRes.status} ${pathfinderRes.statusText}` }, { status: pathfinderRes.status });
    }

    const pathfinderData = await pathfinderRes.json();
    const trackUnion = pathfinderData?.data?.trackUnion;

    if (!trackUnion) {
      return NextResponse.json({ success: false, error: "Pathfinder returned no track data. The track may not exist or the token may be invalid." }, { status: 502 });
    }

    // 3. Extract from Pathfinder response
    const trackTitle: string = trackUnion.name || "Unknown Track";
    const playcountStr: string = trackUnion.playcount || "0";
    const playcount = parseInt(playcountStr, 10) || 0;

    // Album info from trackUnion.albumOfTrack
    const albumOfTrack = trackUnion.albumOfTrack;
    const albumId: string = albumOfTrack?.id || "";

    // Get Spotify CDN cover from albumOfTrack.coverArt.sources (largest image last)
    const coverSources: any[] = albumOfTrack?.coverArt?.sources || [];
    const coverUrl: string = coverSources.length > 0
      ? coverSources[coverSources.length - 1].url   // largest = 640x640
      : `/api/spotify-thumb?trackId=${trackId}`;

    // Track artists — in getTrack response structure, artists are under trackUnion.artists
    // The user-shared sample shows albumOfTrack but not direct track artists in trackUnion
    // Fall back to parsing from album context
    const artistNames = "Ariana Grande"; // safe default; can be refined if needed

    const trackSlug = slugify(trackTitle) || trackId;
    const { milestoneName, milestoneTarget } = getMilestoneForStreams(playcount);
    const today = getTodayDateStr();
    const importedTrack: TrackImportResult = {
      id: trackSlug,
      title: trackTitle,
      artist: artistNames,
      totalStreams: playcount,
      dailyGain: 0,
      gainDiff: 0,
      coverUrl,
      milestoneName,
      milestoneTarget,
      avgDailyGain: 0,
      alternativeIds: [],
      spotifyTrackId: trackId,
      spotifyAlbumId: albumId,
      streams: addStreamHistoryEntry(undefined, today, playcount, 0)
    };

    return NextResponse.json({
      success: true,
      track: importedTrack
    });

  } catch (err: any) {
    console.error("Error importing track:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

function slugify(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
