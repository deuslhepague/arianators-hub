import { NextResponse } from "next/server";
import { getSpotifyToken, fetchSpotify } from "@/lib/spotify-token";
import { addStreamHistoryEntry, getTodayDateStr, StreamHistory } from "@/lib/streamHistory";

export const dynamic = "force-dynamic";

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
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tracks: SpotifyTrackInput[] = body.tracks || [];
    const albums: SpotifyAlbumInput[] = body.albums || [];

    // 1. Fetch Spotify token dynamically
    const token = await getSpotifyToken();

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
            "authorization": `Bearer ${token}`,
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
      // Also look up albums for alternative IDs
      if (t.alternativeIds) {
        t.alternativeIds.forEach(altId => {
          // If altId is a track ID (e.g. 22-char string), we could also add it if we know its album
          // But for now, we assume alternative track IDs are either in the same albums or we can do a fallback resolve
        });
      }
    });

    // Add album IDs from the albums section
    albums.forEach(a => {
      const albumId = a.spotifyAlbumId || a.id;
      // Ensure it's a Spotify album ID (e.g. not our mock "positions-album" slug, but a real 22-char Spotify ID)
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
            "authorization": `Bearer ${token}`,
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
                // If it is a participation album, only sum tracks where Ariana Grande is an artist.
                if (!albumIsParticipation || isArianaTrack) {
                  albumSum += playcount;
                }
              }
            }
          });

          albumPlaycounts[albumId] = albumSum;
        } else {
          console.error(`Spotify Pathfinder returned error status ${res.status} for album ${albumId}`);
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
      
      // Get playcount for main track ID
      if (track.spotifyTrackId && trackPlaycounts[track.spotifyTrackId]) {
        mainPlaycount = trackPlaycounts[track.spotifyTrackId];
      }

      // Sum playcounts from alternative track IDs
      let altPlaycountSum = 0;
      if (track.alternativeIds) {
        track.alternativeIds.forEach(altId => {
          if (trackPlaycounts[altId]) {
            altPlaycountSum += trackPlaycounts[altId];
          }
        });
      }

      const totalNewStreams = mainPlaycount + altPlaycountSum;

      if (totalNewStreams > 0) {
        const diff = totalNewStreams - track.totalStreams;
        if (diff > 0) {
          track.gainDiff = diff - track.dailyGain;
          track.dailyGain = diff;
        }
        track.totalStreams = totalNewStreams;
        track.streams = addStreamHistoryEntry(
          previousHistory,
          today,
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
        album.streams = addStreamHistoryEntry(
          previousHistory,
          today,
          newTotal,
          previousTotalStreams
        );
      }
      return album;
    });

    return NextResponse.json({
      success: true,
      tracks: updatedTracks,
      albums: updatedAlbums
    });

  } catch (err: any) {
    console.error("Backend error updating plays:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
