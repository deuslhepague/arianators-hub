import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

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

function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

interface LeaderboardCache {
  data: any[];
  timestamp: number;
}

const cachedLeaderboards: Record<string, LeaderboardCache> = {};

export async function GET(req: Request) {
  try {
    const app = getAdminApp();
    const db = admin.firestore(app);
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || getTodayDateStr();
    const bypassCache = url.searchParams.get("bypass") === "true";
    const now = Date.now();

    // Cache duration: 1 minute for all dates
    const cacheDuration = 60000;

    if (!bypassCache && cachedLeaderboards[dateStr] && (now - cachedLeaderboards[dateStr].timestamp) < cacheDuration) {
      return NextResponse.json({
        success: true,
        users: cachedLeaderboards[dateStr].data
      });
    }

    let list: any[] = [];
    let shouldRebuild = bypassCache;

    if (!shouldRebuild) {
      const snap = await db.collection("leaderboard")
        .where("date", "==", dateStr)
        .get();
      
      if (snap.empty) {
        shouldRebuild = true;
      } else {
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            userId: data.userId,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            streamsToday: data.streamsToday || 0
          });
        });
      }
    }

    if (shouldRebuild) {
      list = [];
      const usersSnap = await db.collection("users").get();
      const batch = db.batch();
      let hasUpdates = false;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data() || {};
        const userId = userDoc.id;
        const dailySnap = await userDoc.ref.collection("dailyStreams").doc(dateStr).get();
        
        if (dailySnap.exists) {
          const dailyData = dailySnap.data() || {};
          const totalStreams = Number(dailyData.total || 0);
          
          if (totalStreams > 0) {
            const displayName = userData.displayName || userData.customId || userId;
            const avatarUrl = userData.avatarUrl || "";
            const leaderboardRef = db.collection("leaderboard").doc(`${dateStr}_${userId}`);
            
            batch.set(leaderboardRef, {
              userId,
              displayName,
              avatarUrl,
              streamsToday: totalStreams,
              date: dateStr,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            list.push({
              userId,
              displayName,
              avatarUrl,
              streamsToday: totalStreams
            });
            hasUpdates = true;
          }
        }
      }
      
      if (hasUpdates) {
        await batch.commit();
      }
    }

    list.sort((a, b) => b.streamsToday - a.streamsToday);
    const topUsers = list.slice(0, 20);

    cachedLeaderboards[dateStr] = {
      data: topUsers,
      timestamp: now
    };

    return NextResponse.json({
      success: true,
      users: topUsers
    });
  } catch (error: any) {
    console.error("Error loading leaderboard API:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
