import { NextResponse } from "next/server";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";
import { getMilestoneForStreams } from "@/lib/milestones";

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

interface AlbumImportResult {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
  spotifyAlbumId: string;
  isParticipation: boolean;
  streams?: StreamHistory;
}

export async function POST(req: Request) {
  try {
    const { albumUrlOrId } = await req.json();
    if (!albumUrlOrId) {
      return NextResponse.json({ success: false, error: "Missing albumUrlOrId parameter" }, { status: 400 });
    }

    // Extract 22-character Spotify album ID (handles intl-pt URLs too)
    const match = albumUrlOrId.match(/[a-zA-Z0-9]{22}(?=[^a-zA-Z0-9]|$)/);
    const albumId = match ? match[0] : null;
    if (!albumId) {
      return NextResponse.json({ success: false, error: "Invalid Spotify album link or ID" }, { status: 400 });
    }

    // 1. Fetch Spotify token
    const token = await getSpotifyToken();

    // 2. Fetch album data from Pathfinder — returns name, year, cover, tracks + playcounts in ONE call
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

    if (!pathfinderRes.ok) {
      return NextResponse.json({ success: false, error: `Pathfinder error: ${pathfinderRes.status} ${pathfinderRes.statusText}` }, { status: pathfinderRes.status });
    }

    const pathfinderData = await pathfinderRes.json();
    const albumUnion = pathfinderData?.data?.albumUnion;

    if (!albumUnion) {
      return NextResponse.json({ success: false, error: "Pathfinder returned no album data. The album may not exist or the token may be invalid." }, { status: 502 });
    }

    // 3. Extract album metadata from Pathfinder response
    const albumTitle: string = albumUnion.name || albumUnion.title || "Unknown Album";
    
    // Extract year from isoString date format: "2026-07-31T00:00:00Z"
    let releaseYear = "2024"; // fallback
    if (albumUnion.date?.isoString) {
      const yearMatch = albumUnion.date.isoString.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = yearMatch[1];
      }
    } else if (albumUnion.releaseDate?.isoString) {
      const yearMatch = albumUnion.releaseDate.isoString.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = yearMatch[1];
      }
    }
    
    // Prefer largest cover image from Pathfinder (sources are ordered smallest to largest)
    const coverSources: any[] = albumUnion.coverArt?.sources || [];
    const coverUrl: string = coverSources.length > 0
      ? coverSources[coverSources.length - 1].url  // largest image
      : "/petal.jpg";

    // Check if Ariana Grande is the primary album artist
    const albumArtists: any[] = albumUnion.artists?.items || [];
    const isArianaMainAlbum = albumArtists.some((a: any) =>
      a.profile?.name?.toLowerCase().includes("ariana grande")
    );

    // 4. Process tracks from Pathfinder response
    const pathfinderTracks: any[] = albumUnion.tracksV2?.items || [];
    const importedTracks: TrackImportResult[] = [];
    let albumStreamsSum = 0;
    const today = getTodayDateStr();

    for (const item of pathfinderTracks) {
      const track = item?.track;
      if (!track) continue;

      const uri: string = track.uri || "";
      const trackId: string = uri.split(":track:")[1] || "";
      if (!trackId) continue;

      const trackName: string = track.name || "Unknown Track";
      const playcountStr: string = track.playcount || "0";
      const playcount = parseInt(playcountStr, 10) || 0;

      // Get track artists
      const trackArtists: any[] = track.artists?.items || [];
      const isArianaTrack = trackArtists.some((a: any) =>
        a.profile?.name?.toLowerCase().includes("ariana grande")
      );
      const artistNames: string = trackArtists.map((a: any) => a.profile?.name || "").filter(Boolean).join(", ") || "Ariana Grande";

      if (isArianaTrack) {
        albumStreamsSum += playcount;
        const trackSlug = slugify(trackName) || trackId;
        const { milestoneName, milestoneTarget } = getMilestoneForStreams(playcount);
        importedTracks.push({
          id: trackSlug,
          title: trackName,
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
        });
      } else if (isArianaMainAlbum) {
        albumStreamsSum += playcount;
      }
    }

    // 5. Construct album result
    const albumSlug = slugify(albumTitle) || albumId;
    const importedAlbum: AlbumImportResult = {
      id: albumSlug,
      title: albumTitle,
      year: releaseYear,
      totalStreams: albumStreamsSum,
      dailyGain: 0,
      coverUrl,
      spotifyAlbumId: albumId,
      isParticipation: !isArianaMainAlbum,
      streams: addStreamHistoryEntry(undefined, today, albumStreamsSum, 0)
    };

    return NextResponse.json({
      success: true,
      album: importedAlbum,
      tracks: importedTracks
    });

  } catch (err: any) {
    console.error("Error importing album:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

function slugify(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove accents
    .replace(/[^a-z0-9 -]/g, "")     // remove invalid chars
    .replace(/\s+/g, "-")             // spaces → dashes
    .replace(/-+/g, "-")              // collapse dashes
    .trim();
}
