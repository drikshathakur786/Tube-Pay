import admin from "firebase-admin";

/*
 *    Firebase Admin SDK Initialization
 *    Uses service account credentials from environment variable
 *    Exports the Realtime Database reference
 */

// Parse service account from environment variable (JSON string)
let serviceAccount: admin.ServiceAccount | undefined;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
} catch (error) {
  console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
}

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log("✅ Firebase Admin initialized with service account");
  } else {
    // Fallback: initialize without credentials (for development/testing)
    admin.initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log("⚠️ Firebase Admin initialized without service account (limited access)");
  }
}

const firebaseDb = admin.database();

export { firebaseDb, admin };
