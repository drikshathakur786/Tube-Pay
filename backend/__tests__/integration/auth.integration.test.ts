import { generateToken, verifyToken } from "../../config/jwt";
import { jwtAuth } from "../../middleware/jwtAuth";

// Mock the user service for jwtAuth middleware
jest.mock("../../services/user", () => ({
  findUser: jest.fn().mockImplementation((email, id) => {
    if (id === "valid-user-id") {
      return Promise.resolve({
        id: "valid-user-id",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
      });
    }
    return Promise.resolve(null);
  }),
}));

// Mock Redis (required by user service dependency chain)
jest.mock("../../services/redis", () => ({
  RedisService: {
    getCachedUserProfile: jest.fn().mockResolvedValue(null),
    cacheUserProfile: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Prisma (required by user service dependency chain)
jest.mock("../../config/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("JWT Authentication", () => {
  // =====================
  // Token Generation
  // =====================
  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const token = generateToken("user-123", "test@example.com");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateToken("user-1", "user1@test.com");
      const token2 = generateToken("user-2", "user2@test.com");

      expect(token1).not.toBe(token2);
    });
  });

  // =====================
  // Token Verification
  // =====================
  describe("verifyToken", () => {
    it("should verify a valid token and return payload", () => {
      const token = generateToken("user-123", "test@example.com");
      const payload = verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe("user-123");
      expect(payload!.email).toBe("test@example.com");
    });

    it("should return null for an invalid token", () => {
      const payload = verifyToken("invalid.token.string");
      expect(payload).toBeNull();
    });

    it("should return null for a tampered token", () => {
      const token = generateToken("user-123", "test@example.com");
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const payload = verifyToken(tamperedToken);

      expect(payload).toBeNull();
    });
  });

  // =====================
  // JWT Middleware
  // =====================
  describe("jwtAuth middleware", () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("should reject requests without Authorization header", async () => {
      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("No token") })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid Bearer format", async () => {
      mockReq.headers.authorization = "NotBearer token123";

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid token", async () => {
      mockReq.headers.authorization = "Bearer invalid.token.here";

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid") })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should accept requests with valid token and existing user", async () => {
      const token = generateToken("valid-user-id", "test@example.com");
      mockReq.headers.authorization = `Bearer ${token}`;

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.jwtUser).toEqual({
        userId: "valid-user-id",
        email: "test@example.com",
      });
    });

    it("should reject valid token for non-existent user", async () => {
      const token = generateToken("nonexistent-user", "ghost@test.com");
      mockReq.headers.authorization = `Bearer ${token}`;

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("not found") })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
