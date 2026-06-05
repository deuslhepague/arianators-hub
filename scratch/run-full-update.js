const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Import our streamHistory utility locally (compiled/transpiled, or we can write the JS equivalent directly)
function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

function addStreamHistoryEntry(currentHistory, dateStr, totalStreams, previousTotalStreams = 0) {
  if (!currentHistory) {
    currentHistory = {};
  }

  let dailyStreams = 0;
  let prevDaily = null;
  let isTotalEqual = false;

  const sortedDates = Object.keys(currentHistory)
    .filter(d => d !== dateStr)
    .sort();

  if (sortedDates.length > 0) {
    const lastDate = sortedDates[sortedDates.length - 1];
    const lastEntry = currentHistory[lastDate];

    if (lastEntry) {
      dailyStreams = Math.max(0, totalStreams - lastEntry.total);
      prevDaily = lastEntry.daily;
      isTotalEqual = (totalStreams === lastEntry.total);
    }
  } else {
    dailyStreams = totalStreams - previousTotalStreams;
    isTotalEqual = (totalStreams === previousTotalStreams);
  }

  if (isTotalEqual || dailyStreams <= 0 || (prevDaily !== null && dailyStreams === prevDaily)) {
    const updatedHistory = { ...currentHistory };
    delete updatedHistory[dateStr];
    return updatedHistory;
  }

  return {
    ...currentHistory,
    [dateStr]: {
      total: totalStreams,
      daily: dailyStreams
    }
  };
}

async function getSpotifyToken() {
  try {
    const res = await fetch("https://stoken.gifted.co.ke/token.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.token) return data.token;
    }
  } catch (err) {}
  
  try {
    const res = await fetch("https://spotify.xwolf.space/api/token", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.token) return data.token;
    }
  } catch (err) {}

  throw new Error("Failed to fetch Spotify access token");
}

async function fetchSpotify(url, init) {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    if (res.status !== 429) return res;
  } catch (err) {}

  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
    "https://thingproxy.freeboard.io/fetch/"
  ];

  for (const proxy of proxies) {
    const proxiedUrl = `${proxy}${encodeURIComponent(url)}`;
    try {
      const proxyInit = {
        method: init?.method || "GET",
        headers: {
          "Authorization": init?.headers ? init.headers["Authorization"] || "" : "",
          "Content-Type": init?.headers ? init.headers["Content-Type"] || "application/json" : "application/json",
          "accept": "application/json",
          "app-platform": "WebPlayer"
        },
        cache: "no-store"
      };
      if (init?.body) proxyInit.body = init.body;
      const res = await fetch(proxiedUrl, proxyInit);
      if (res.status === 200) return res;
    } catch (err) {}
  }
  throw new Error(`Failed to fetch ${url}`);
}

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  const credPath = path.join(process.cwd(), "arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json");
  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "arianatorshub"
  });
  return admin.app();
}

async function run() {
  try {
    const app = getAdminApp();
    const db = admin.firestore(app);

    console.log("1. Loading catalog...");
    const catalogRef = db.collection("catalog").doc("config");
    const catalogSnap = await catalogRef.get();
    if (!catalogSnap.exists) {
      console.log("Catalog not found.");
      return;
    }

    const data = catalogSnap.data();
    const tracks = data.tracks || [];
    const albums = data.albums || [];

    console.log("2. Fetching Spotify token...");
    const token = await getSpotifyToken();

    // Collect all unique album IDs
    const uniqueAlbumIds = new Set();
    tracks.forEach(t => {
      if (t.spotifyAlbumId) uniqueAlbumIds.add(t.spotifyAlbumId);
    });

    const trackPlaycounts = {};
    const albumPlaycounts = {};

    console.log(`3. Querying Pathfinder for ${uniqueAlbumIds.size} albums...`);
    const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";

    for (const albumId of uniqueAlbumIds) {
      try {
        console.log(`Fetching album: ${albumId}`);
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
            variables: { uri: `spotify:album:${albumId}`, locale: "intl-pt", offset: 0, limit: 50 },
            operationName: "getAlbum",
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10"
              }
            }
          })
        });

        if (res.ok) {
          const resData = await res.json();
          const items = resData?.data?.albumUnion?.tracksV2?.items || [];
          let albumSum = 0;

          const matchingAlbumObj = albums.find(a => (a.spotifyAlbumId || a.id) === albumId);
          const albumIsParticipation = matchingAlbumObj?.isParticipation || false;

          items.forEach((item) => {
            const track = item?.track;
            if (track) {
              const uri = track.uri || "";
              const id = uri.split(":track:")[1] || uri;
              const playcount = parseInt(track.playcount || "0", 10) || 0;

              const artistsItems = track.artists?.items || [];
              const isArianaTrack = artistsItems.some(a => 
                a.profile?.name?.toLowerCase().includes("ariana grande")
              );

              if (id) {
                trackPlaycounts[id] = playcount;
                if (!albumIsParticipation || isArianaTrack) {
                  albumSum += playcount;
                }
              }
            }
          });

          albumPlaycounts[albumId] = albumSum;
        } else {
          console.error(`Pathfinder returned error status ${res.status} for album ${albumId}`);
        }
      } catch (err) {
        console.error(`Error querying Pathfinder for album ${albumId}:`, err);
      }
    }

    console.log("4. Updating tracks with self-healing...");
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
          console.log(`Healed track "${track.title}" playcount from ${track.totalStreams} down to ${totalNewStreams}`);
          track.dailyGain = 0;
          track.gainDiff = 0;
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

    console.log("5. Updating albums...");
    const updatedAlbums = albums.map(album => {
      const previousTotalStreams = album.totalStreams || 0;
      const previousHistory = album.streams;
      const albumId = album.spotifyAlbumId || album.id;

      if (albumId && albumPlaycounts[albumId]) {
        const newTotal = albumPlaycounts[albumId];
        const diff = newTotal - album.totalStreams;
        if (diff > 0) {
          album.dailyGain = diff;
        } else if (diff < 0) {
          console.log(`Healed album "${album.title}" playcount from ${album.totalStreams} down to ${newTotal}`);
          album.dailyGain = 0;
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

    console.log("6. Writing updated catalog back to Firestore...");
    await catalogRef.update({
      tracks: updatedTracks,
      albums: updatedAlbums,
      updatedAt: new Date().toISOString()
    });

    console.log("Done! Everything updated and healed.");
  } catch (err) {
    console.error("Execution Error:", err);
  }
}

run();
