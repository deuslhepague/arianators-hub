const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credPath = path.join(
    process.cwd(),
    "arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json"
  );

  if (!fs.existsSync(credPath)) {
    throw new Error(`Firebase credentials file not found at ${credPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "arianatorshub"
  });

  return admin.app();
}

function cleanStreamHistory(history) {
  if (!history) return {};

  const sortedDates = Object.keys(history).sort();
  const cleaned = {};

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const entry = history[date];

    const cleanedDates = Object.keys(cleaned).sort();
    
    if (cleanedDates.length > 0) {
      const prevDate = cleanedDates[cleanedDates.length - 1];
      const prevEntry = cleaned[prevDate];

      // Rule 1: If total streams is equal to previous total streams, skip
      if (entry.total === prevEntry.total) {
        continue;
      }

      // Calculate daily gain (with fallback/healing)
      const calculatedDaily = (entry.daily !== null && entry.daily !== undefined)
        ? entry.daily
        : (entry.total - prevEntry.total);

      // Rule 2: If calculated daily gain <= 0, skip
      if (calculatedDaily <= 0) {
        continue;
      }

      // Rule 3: If calculated daily gain is exactly equal to previous day's daily gain, skip
      if (calculatedDaily === prevEntry.daily) {
        continue;
      }

      cleaned[date] = {
        total: entry.total,
        daily: calculatedDaily
      };
    } else {
      // First entry
      const initialDaily = (entry.daily !== null && entry.daily !== undefined)
        ? entry.daily
        : entry.total;
      cleaned[date] = {
        total: entry.total,
        daily: initialDaily
      };
    }
  }

  return cleaned;
}

async function run() {
  try {
    const app = getAdminApp();
    const db = admin.firestore(app);
    
    console.log("Loading catalog config...");
    const catalogRef = db.collection("catalog").doc("config");
    const catalogSnap = await catalogRef.get();
    if (!catalogSnap.exists) {
      console.log("No catalog found!");
      return;
    }

    const data = catalogSnap.data();
    const tracks = data.tracks || [];
    const albums = data.albums || [];

    console.log(`Processing ${tracks.length} tracks...`);
    let trackModifiedCount = 0;
    const cleanedTracks = tracks.map(track => {
      if (track.streams) {
        const origHistoryStr = JSON.stringify(track.streams);
        const cleanedHistory = cleanStreamHistory(track.streams);
        const cleanedHistoryStr = JSON.stringify(cleanedHistory);
        if (origHistoryStr !== cleanedHistoryStr) {
          trackModifiedCount++;
          console.log(`Track "${track.title}" history modified.`);
          console.log("  Before:", origHistoryStr);
          console.log("  After: ", cleanedHistoryStr);
        }
        return {
          ...track,
          streams: cleanedHistory
        };
      }
      return track;
    });

    console.log(`Processing ${albums.length} albums...`);
    let albumModifiedCount = 0;
    const cleanedAlbums = albums.map(album => {
      if (album.streams) {
        const origHistoryStr = JSON.stringify(album.streams);
        const cleanedHistory = cleanStreamHistory(album.streams);
        const cleanedHistoryStr = JSON.stringify(cleanedHistory);
        if (origHistoryStr !== cleanedHistoryStr) {
          albumModifiedCount++;
          console.log(`Album "${album.title}" history modified.`);
          console.log("  Before:", origHistoryStr);
          console.log("  After: ", cleanedHistoryStr);
        }
        return {
          ...album,
          streams: cleanedHistory
        };
      }
      return album;
    });

    if (trackModifiedCount > 0 || albumModifiedCount > 0) {
      console.log("Saving cleaned catalog to Firestore...");
      await catalogRef.update({
        tracks: cleanedTracks,
        albums: cleanedAlbums,
        updatedAt: new Date().toISOString()
      });
      console.log("Database history cleanup complete!");
    } else {
      console.log("All history entries are already clean. No database updates needed.");
    }

  } catch (err) {
    console.error("Migration Error:", err);
  }
}

run();
