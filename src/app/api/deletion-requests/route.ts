import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { verifyAdminSessionToken } from "@/lib/adminAuth";

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credPath = path.join(
    process.cwd(),
    "arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json"
  );

  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Firebase credentials file not found at ${credPath}.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "arianatorshub"
  });

  return admin.app();
}

async function deleteUserData(db: admin.firestore.Firestore, userId: string) {
  const userRef = db.collection("users").doc(userId);
  const dailyStreamsSnap = await userRef.collection("dailyStreams").get();
  const leaderboardSnap = await db.collection("leaderboard").where("userId", "==", userId).get();

  const deletePromises: Promise<any>[] = [];
  dailyStreamsSnap.forEach((docSnap) => deletePromises.push(docSnap.ref.delete()));
  leaderboardSnap.forEach((docSnap) => deletePromises.push(docSnap.ref.delete()));
  deletePromises.push(userRef.delete());

  await Promise.all(deletePromises);
}

export async function POST(req: Request) {
  try {
    const { userId, displayName } = await req.json();
    if (!userId || !displayName) {
      return NextResponse.json(
        { success: false, error: "Missing userId or displayName" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    await db.collection("deletion_requests").doc(userId).set(
      {
        userId,
        displayName,
        status: "pending",
        requestedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creating deletion request:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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

    const snap = await db
      .collection("deletion_requests")
      .where("status", "==", "pending")
      .get();

    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });

    return NextResponse.json({ success: true, requests: list });
  } catch (error: any) {
    console.error("Error getting pending deletions:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing userId or action" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = admin.firestore(app);
    const requestRef = db.collection("deletion_requests").doc(userId);

    await requestRef.set(
      {
        status: action === "approve" ? "approved" : "rejected",
        resolvedAt: new Date().toISOString()
      },
      { merge: true }
    );

    if (action === "approve") {
      await deleteUserData(db, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error resolving user deletion:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
