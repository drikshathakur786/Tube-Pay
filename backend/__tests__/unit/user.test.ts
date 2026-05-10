import { findUser, createUser, updateUserProfile } from "../../services/user";
import prisma from "../../config/prisma";
import { RedisService } from "../../services/redis";

// Mock Prisma
jest.mock("../../config/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Redis
jest.mock("../../services/redis", () => ({
  RedisService: {
    getCachedUserProfile: jest.fn().mockResolvedValue(null),
    cacheUserProfile: jest.fn().mockResolvedValue(undefined),
    invalidateUserProfileCache: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("User Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // findUser tests
  // =====================
  describe("findUser", () => {
    it("should find a user by id", async () => {
      const mockUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
        createdAt: new Date(),
        avatarUrl: null,
        streams: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await findUser(undefined, "user-123");

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
        })
      );
    });

    it("should find a user by email", async () => {
      const mockUser = {
        id: "user-456",
        name: "Email User",
        email: "email@example.com",
        role: "USER",
        createdAt: new Date(),
        avatarUrl: null,
        streams: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await findUser("email@example.com", undefined);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "email@example.com" },
        })
      );
    });

    it("should return null when no email or id is provided", async () => {
      const result = await findUser(undefined, undefined);
      expect(result).toBeNull();
    });

    it("should return null when user is not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await findUser(undefined, "nonexistent-id");
      expect(result).toBeNull();
    });

    it("should return cached user if available", async () => {
      const cachedUser = {
        id: "cached-user",
        name: "Cached",
        email: "cached@test.com",
        role: "USER",
      };

      (RedisService.getCachedUserProfile as jest.Mock).mockResolvedValue(cachedUser);

      const result = await findUser(undefined, "cached-user");

      expect(result).toEqual(cachedUser);
      // Prisma should NOT be called since cache returned data
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // =====================
  // createUser tests
  // =====================
  describe("createUser", () => {
    it("should create a new user", async () => {
      const mockUser = {
        id: "new-user-123",
        name: "New User",
        email: "new@example.com",
        role: "USER",
        createdAt: new Date(),
        avatarUrl: null,
        streams: [],
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await createUser("New User", "new@example.com");

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "New User", email: "new@example.com" },
        })
      );
    });

    it("should cache the created user", async () => {
      const mockUser = {
        id: "cached-new",
        name: "Cached New",
        email: "cachednew@test.com",
        role: "USER",
        createdAt: new Date(),
        avatarUrl: null,
        streams: [],
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await createUser("Cached New", "cachednew@test.com");

      expect(RedisService.cacheUserProfile).toHaveBeenCalledWith(
        mockUser.id,
        mockUser
      );
    });

    it("should return null on error", async () => {
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await createUser("Fail", "fail@test.com");
      expect(result).toBeNull();
    });
  });

  // =====================
  // updateUserProfile tests
  // =====================
  describe("updateUserProfile", () => {
    it("should update user name", async () => {
      const mockUpdatedUser = {
        id: "user-123",
        name: "Updated Name",
        email: "test@example.com",
        role: "USER",
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await updateUserProfile("Updated Name", "user-123");

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: { name: "Updated Name" },
        })
      );
    });

    it("should reject invalid roles", async () => {
      await expect(
        updateUserProfile("Name", "user-123", undefined, "ADMIN" as any)
      ).rejects.toThrow("not allowed");
    });

    it("should allow STREAMER role", async () => {
      const mockUpdatedUser = {
        id: "user-123",
        name: "Streamer",
        email: "test@example.com",
        role: "STREAMER",
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await updateUserProfile(undefined, "user-123", undefined, "STREAMER");

      expect(result).toEqual(mockUpdatedUser);
    });
  });
});
