import { firebaseDb } from "../config/firebase";

interface SuperchatData {
  username: string;
  amount: number;
  message: string | null;
  timestamp: number;
}

/*
 *    Pushes a superchat entry to Firebase Realtime Database
 *    Path: /superchats/{streamId}/{pushId}
 *    Params: streamId - stream id, data - superchat data
 */
export const pushSuperchat = async (streamId: string, data: SuperchatData) => {
  try {
    const ref = firebaseDb.ref(`superchats/${streamId}`);
    await ref.push({
      ...data,
      timestamp: Date.now(),
    });
    console.log(`✅ [Firebase] Superchat pushed for stream ${streamId}`);
  } catch (error) {
    console.error("❌ [Firebase] Error pushing superchat:", error);
  }
};

/*
 *    Fetches recent superchats from Firebase Realtime Database
 *    Path: /superchats/{streamId}
 *    Params: streamId - stream id, limit - number of superchats to fetch
 *    Returns: array of superchat objects
 */
export const getRecentSuperchats = async (streamId: string, limit: number = 20) => {
  try {
    const ref = firebaseDb.ref(`superchats/${streamId}`);
    const snapshot = await ref.orderByChild("timestamp").limitToLast(limit).once("value");

    if (!snapshot.exists()) {
      return [];
    }

    const superchats: (SuperchatData & { id: string })[] = [];

    snapshot.forEach((childSnapshot) => {
      superchats.push({
        id: childSnapshot.key!,
        ...childSnapshot.val(),
      });
    });

    // Return in reverse chronological order
    return superchats.reverse();
  } catch (error) {
    console.error("❌ [Firebase] Error fetching superchats:", error);
    return [];
  }
};
