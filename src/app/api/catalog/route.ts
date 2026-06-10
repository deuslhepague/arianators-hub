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

let cachedCatalog: any = null;
let cachedTimestamp = 0;
const CACHE_TTL = 300_000; // 5 minutes

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const bypass = url.searchParams.get("bypass") === "true";
    const now = Date.now();

    if (!bypass && cachedCatalog && (now - cachedTimestamp) < CACHE_TTL) {
      return NextResponse.json({ success: true, ...cachedCatalog });
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    
    const tracksSnap = await db.collection("catalog").doc("config").collection("tracks").get();
    const albumsSnap = await db.collection("catalog").doc("config").collection("albums").get();
    const configSnap = await db.collection("catalog").doc("config").get();

    const tracks = tracksSnap.docs.map(doc => doc.data());
    const albums = albumsSnap.docs.map(doc => doc.data());
    const updatedAt = configSnap.exists ? configSnap.data()?.updatedAt : null;

    const payload = {
      tracks,
      albums,
      updatedAt
    };

    cachedCatalog = payload;
    cachedTimestamp = now;

    return NextResponse.json({ success: true, ...payload });
  } catch (error: any) {
    console.error("Error loading public catalog:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
