const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
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
