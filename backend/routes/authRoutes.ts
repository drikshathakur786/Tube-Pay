import { Router } from "express";
import passport from "passport";
import { loginUser } from "../controller/user";
import { reqUser } from "../types";
import { generateToken } from "../config/jwt";
import { jwtAuth } from "../middleware/jwtAuth";
import { findUser } from "../services/user";

const router = Router();

/*
 *    Logs in user
 *    GET /api/auth/google
 *    Returns: user object or null on error
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

/*
 *    Logs in user
 *    GET /api/auth/google/callback
 *    Returns: user object or null on error
 */
router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/signin`,
  }),
  async (req: reqUser, res: any) => {
    await loginUser(req, res);
  }
);

/*
 *    Check's the current user
 *    GET /api/auth/current
 *    Returns: user object or null on error
 */
router.get('/current', (req: reqUser, res: any) => {
    if (req.user) {
        return res.json([{"status": "verified"},{"user" :req.user}]);
    }
    
    res.status(200).json([{"status": "Not verified"},{"user" :req.user}]);
})

/*
 *    Logs out user
 *    DELETE /api/auth/logout
 *    Returns: user object or null on error
 */
router.delete("/logout", (req: reqUser, res: any) => {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
  });
  
  res.status(200).json({ message: "Logged out successfully" });
});

/*
 *    Generates a JWT token for the authenticated user
 *    POST /api/auth/token
 *    Requires: User must be logged in via session (Google OAuth)
 *    Returns: JWT token
 */
router.post("/token", (req: reqUser, res: any) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: "You must be logged in to get a token" });
  }

  const email = req.user.emails?.[0]?.value || "";
  const token = generateToken(req.user.uid, email);

  res.status(200).json({
    message: "JWT token generated successfully",
    token,
    tokenType: "Bearer",
  });
});

/*
 *    JWT-protected demo route
 *    GET /api/auth/jwt-protected
 *    Requires: Valid JWT token in Authorization header
 *    Returns: user profile fetched using JWT userId
 */
router.get("/jwt-protected", jwtAuth, async (req: any, res: any) => {
  try {
    const user = await findUser(undefined, req.jwtUser.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "JWT authentication successful",
      user,
    });
  } catch (error) {
    console.error("Error in jwt-protected route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;