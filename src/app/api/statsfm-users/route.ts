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

export async function POST(req: Request) {
  try {
    const { profile } = await req.json();
    if (!profile?.id) {
      return NextResponse.json(
        { success: false, error: "Missing stats.fm profile" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const now = new Date().toISOString();
    const userRef = db.collection("users").doc(profile.id);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? (existingSnap.data() || {}) : {};

    await userRef.set(
      {
        userId: profile.id,
        statsFmUserId: profile.id,
        displayName: profile.display_name || profile.customId || profile.id,
        avatarUrl: profile.images?.[0]?.url || "",
        customId: profile.customId || null,
        syncEnabled: true,
        source: "stats.fm",
        statsFmConnectedAt: existingData.statsFmConnectedAt || now,
        statsFmLastSeenAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      userId: profile.id
    });
  } catch (error: any) {
    console.error("Error saving stats.fm user:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    
    const today = new Date().toISOString().split("T")[0];
    const dailyRef = db.collection("users").doc(userId).collection("dailyStreams").doc(today);
    const snap = await dailyRef.get();
    
    if (!snap.exists) {
      return NextResponse.json({ success: true, streams: {} });
    }

    const data = snap.data() || {};
    const { total, date, lastUpdated, ...tracks } = data;
    return NextResponse.json({ success: true, streams: tracks });
  } catch (error: any) {
    console.error("Error loading user daily streams:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
