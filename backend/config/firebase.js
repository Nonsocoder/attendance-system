const admin = require("firebase-admin");
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string:", e.message);
  }
}

if (!serviceAccount) {
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (e) {
    console.error("❌ serviceAccountKey.json file not found.");
  }
}

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase connected successfully!");
  } catch (error) {
    console.error("❌ Firebase error:", error.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };
