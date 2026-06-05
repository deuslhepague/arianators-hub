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

async function run() {
  try {
    const app = getAdminApp();
    const db = admin.firestore(app);
    const catalogSnap = await db.collection("catalog").doc("config").get();
    if (!catalogSnap.exists) {
      console.log("No catalog found!");
      return;
    }

    const data = catalogSnap.data();
    const tracks = data.tracks || [];
    const track = tracks.find(t => t.id === "dont-wanna-break-up-again");
    if (track) {
      console.log("Found track in Firestore:");
      console.log(JSON.stringify(track, null, 2));
    } else {
      console.log("Track dont-wanna-break-up-again not found in catalog");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
