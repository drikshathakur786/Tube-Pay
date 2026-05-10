import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tube-pay-jwt-secret-key";
const JWT_EXPIRY = "24h";

/*
 *    Generates a JWT token for a user
 *    Params: userId - user id, email - user email
 *    Returns: signed JWT token string
 */
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/*
 *    Verifies a JWT token and returns the decoded payload
 *    Params: token - JWT token string
 *    Returns: decoded payload or null if invalid
 */
export const verifyToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
};

export { JWT_SECRET, JWT_EXPIRY };
