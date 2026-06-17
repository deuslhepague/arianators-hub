import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";
import { calculateForecast } from "@/lib/forecasting";
import { getMilestoneForStreams } from "@/lib/milestones";

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

/**
 * Load catalog (tracks + albums) from Firestore as admin
 */
export async function GET(req: Request) {
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

    const tracksSnap = await db.collection("catalog").doc("config").collection("tracks").get();
    const albumsSnap = await db.collection("catalog").doc("config").collection("albums").get();
    const configSnap = await db.collection("catalog").doc("config").get();

    const tracks = tracksSnap.docs.map(doc => {
      const data = doc.data();

      // Calculate forecasting using full history on the server
      const milestone = getMilestoneForStreams(data.totalStreams || 0);
      const forecast = calculateForecast(
        data.streams,
        data.totalStreams || 0,
        milestone.milestoneTarget,
        data.dailyGain || data.avgDailyGain || 0
      );
      data.daysToGoal = forecast.daysToGoal;
      data.dailyPace = forecast.dailyVelocity;

      if (data.streams) {
        const sortedDates = Object.keys(data.streams).sort();
        const lastTwo = sortedDates.slice(-2);
        const slicedStreams: Record<string, any> = {};
        lastTwo.forEach(date => {
          slicedStreams[date] = data.streams[date];
        });
        data.streams = slicedStreams;
      }
      return data;
    });
    const albums = albumsSnap.docs.map(doc => {
      const data = doc.data();

      // Calculate forecasting using full history on the server
      const milestone = getMilestoneForStreams(data.totalStreams || 0);
      const forecast = calculateForecast(
        data.streams,
        data.totalStreams || 0,
        milestone.milestoneTarget,
        data.dailyGain || 0
      );
      data.daysToGoal = forecast.daysToGoal;
      data.dailyPace = forecast.dailyVelocity;

      if (data.streams) {
        const sortedDates = Object.keys(data.streams).sort();
        const lastTwo = sortedDates.slice(-2);
        const slicedStreams: Record<string, any> = {};
        lastTwo.forEach(date => {
          slicedStreams[date] = data.streams[date];
        });
        data.streams = slicedStreams;
      }
      return data;
    });
    let updatedAt = null;
    if (configSnap.exists) {
      const rawUpdatedAt = configSnap.data()?.updatedAt;
      if (rawUpdatedAt) {
        if (typeof rawUpdatedAt.toDate === "function") {
          updatedAt = rawUpdatedAt.toDate().toISOString();
        } else if (typeof rawUpdatedAt === "string") {
          updatedAt = rawUpdatedAt;
        } else if (rawUpdatedAt._seconds) {
          updatedAt = new Date(rawUpdatedAt._seconds * 1000).toISOString();
        } else {
          updatedAt = new Date(rawUpdatedAt).toISOString();
        }
      }
    }

    return NextResponse.json({
      success: true,
      tracks,
      albums,
      updatedAt
    });
  } catch (error: any) {
    console.error("Error loading catalog:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
