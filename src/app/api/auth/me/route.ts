import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("arianators_user_id");

    if (!userIdCookie || !userIdCookie.value) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const userId = userIdCookie.value;

    const app = getAdminApp();
    const db = admin.firestore(app);
    const userSnap = await db.collection("users").doc(userId).get();

    if (!userSnap.exists) {
      // Cookie is invalid or user was deleted
      cookieStore.delete("arianators_user_id");
      return NextResponse.json({ authenticated: false, user: null });
    }

    const userData = userSnap.data() || {};

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userData.userId,
        display_name: userData.displayName,
        images: [{ url: userData.avatarUrl || "" }],
        customId: userData.customId || null,
        syncEnabled: userData.syncEnabled ?? true,
        source: userData.source
      }
    });
  } catch (error: any) {
    console.error("Error in auth/me route:", error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}
