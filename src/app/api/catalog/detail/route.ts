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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "track" | "album"
    const id = url.searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ success: false, error: "Missing type or id" }, { status: 400 });
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    const collectionName = type === "album" ? "albums" : "tracks";
    const docRef = db.collection("catalog").doc("config").collection(collectionName).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: docSnap.data() });
  } catch (error: any) {
    console.error("Error loading detail:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
