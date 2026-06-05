import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";

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

    const snap = await db.collection("catalog").doc("config").get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: true, tracks: [], albums: [], message: "No catalog found" },
        { status: 200 }
      );
    }

    const data = snap.data();
    return NextResponse.json({
      success: true,
      tracks: data?.tracks || [],
      albums: data?.albums || [],
      updatedAt: data?.updatedAt
    });
  } catch (error: any) {
    console.error("Error loading catalog:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
