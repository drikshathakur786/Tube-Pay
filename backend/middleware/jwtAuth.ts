import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import { findUser } from "../services/user";

/*
 *    JWT Authentication Middleware
 *    Extracts Bearer token from Authorization header,
 *    verifies it, and attaches the user to the request.
 */
export const jwtAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided. Use 'Bearer <token>' in Authorization header." });
    }

    // * Step 1: Extract the token
    const token = authHeader.split(" ")[1];

    // * Step 2: Verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // * Step 3: Find the user in the database
    const user = await findUser(undefined, decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found for this token" });
    }

    // * Step 4: Attach user info to request
    req.jwtUser = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error("JWT Auth middleware error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
