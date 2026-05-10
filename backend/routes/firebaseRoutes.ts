import { Router } from "express";
import { getRecentSuperchats } from "../services/firebase";

const router = Router();

/*
 *    Gets recent superchats for a stream from Firebase
 *    GET /api/superchats/:streamId
 *    Params: streamId - stream id
 *    Query: limit - number of superchats (default: 20)
 *    Returns: array of superchat objects from Firebase Realtime Database
 */
router.get("/:streamId", async (req: any, res: any) => {
  try {
    const { streamId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const superchats = await getRecentSuperchats(streamId, limit);

    res.status(200).json({
      streamId,
      count: superchats.length,
      superchats,
    });
  } catch (error) {
    console.error("Error fetching superchats:", error);
    res.status(500).json({ error: "Failed to fetch superchats" });
  }
});

export default router;
