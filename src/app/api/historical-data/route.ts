import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";

// Inicializar Firebase Admin SDK
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
 * Save historical data snapshot for a specific date
 */
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

    const { dateStr, snapshot } = await req.json();

    if (!dateStr || !snapshot) {
      return NextResponse.json(
        { success: false, error: "Missing dateStr or snapshot" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    await db.collection("historical").doc(dateStr).set({
      date: dateStr,
      ...snapshot,
      savedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Saved historical data for ${dateStr}`
    });
  } catch (error: any) {
    console.error("Error saving historical data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Load historical data for a specific date
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

    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: "Missing date query param" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    const snap = await db.collection("historical").doc(dateStr).get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: true, data: null, message: `No data for ${dateStr}` }
      );
    }

    return NextResponse.json({
      success: true,
      data: snap.data()
    });
  } catch (error: any) {
    console.error("Error loading historical data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
