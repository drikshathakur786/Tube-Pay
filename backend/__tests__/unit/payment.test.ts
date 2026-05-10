import { createPayment, getPayment, updatePayment } from "../../services/payment";
import prisma from "../../config/prisma";
import { RedisService } from "../../services/redis";

// Mock Prisma
jest.mock("../../config/prisma", () => ({
  __esModule: true,
  default: {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock Redis
jest.mock("../../services/redis", () => ({
  RedisService: {
    cachePaymentDetails: jest.fn().mockResolvedValue(undefined),
    getCachedPaymentDetails: jest.fn().mockResolvedValue(null),
    invalidatePaymentCaches: jest.fn().mockResolvedValue(undefined),
    incrementStreamDonations: jest.fn().mockResolvedValue(undefined),
    getCachedUserSentPayments: jest.fn().mockResolvedValue(null),
    cacheUserSentPayments: jest.fn().mockResolvedValue(undefined),
    getCachedStreamerReceivedPayments: jest.fn().mockResolvedValue(null),
    cacheStreamerReceivedPayments: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPayment = {
  id: "order_123",
  amount: 100,
  message: "Great stream!",
  userId: "user-1",
  streamId: "stream-1",
  status: "PENDING",
  createdAt: new Date(),
  user: { id: "user-1", name: "Donor", email: "donor@test.com" },
  stream: {
    id: "stream-1",
    title: "Test Stream",
    streamer: { id: "streamer-1", name: "Streamer", email: "streamer@test.com" },
  },
};

describe("Payment Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // createPayment tests
  // =====================
  describe("createPayment", () => {
    it("should create a payment successfully", async () => {
      (prisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await createPayment(
        "order_123",
        100,
        "Great stream!",
        "user-1",
        "stream-1"
      );

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            id: "order_123",
            amount: 100,
            message: "Great stream!",
            userId: "user-1",
            streamId: "stream-1",
            status: "PENDING",
          },
        })
      );
    });

    it("should cache the payment after creation", async () => {
      (prisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      await createPayment("order_123", 100, "Great stream!", "user-1", "stream-1");

      expect(RedisService.cachePaymentDetails).toHaveBeenCalledWith(
        "order_123",
        mockPayment
      );
    });

    it("should throw an error if creation fails", async () => {
      (prisma.payment.create as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(
        createPayment("order_fail", 50, null, "user-1", "stream-1")
      ).rejects.toThrow("Error creating payment");
    });
  });

  // =====================
  // getPayment tests
  // =====================
  describe("getPayment", () => {
    it("should get a payment from database", async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(mockPayment);

      const result = await getPayment("order_123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order_123" },
        })
      );
    });

    it("should return cached payment if available", async () => {
      (RedisService.getCachedPaymentDetails as jest.Mock).mockResolvedValue(mockPayment);

      const result = await getPayment("order_123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it("should throw if payment not found", async () => {
      (RedisService.getCachedPaymentDetails as jest.Mock).mockResolvedValue(null);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getPayment("nonexistent")).rejects.toThrow();
    });
  });

  // =====================
  // updatePayment tests
  // =====================
  describe("updatePayment", () => {
    it("should update payment status to SUCCESS", async () => {
      const updatedPayment = { ...mockPayment, status: "SUCCESS" };
      (prisma.payment.update as jest.Mock).mockResolvedValue(updatedPayment);

      const result = await updatePayment("order_123", "SUCCESS");

      expect(result.status).toBe("SUCCESS");
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order_123" },
          data: { status: "SUCCESS" },
        })
      );
    });

    it("should invalidate caches after update", async () => {
      const updatedPayment = { ...mockPayment, status: "SUCCESS" };
      (prisma.payment.update as jest.Mock).mockResolvedValue(updatedPayment);

      await updatePayment("order_123", "SUCCESS");

      expect(RedisService.invalidatePaymentCaches).toHaveBeenCalledWith(
        "order_123",
        "user-1",
        "stream-1"
      );
    });

    it("should increment stream donations on SUCCESS", async () => {
      const updatedPayment = { ...mockPayment, status: "SUCCESS" };
      (prisma.payment.update as jest.Mock).mockResolvedValue(updatedPayment);

      await updatePayment("order_123", "SUCCESS");

      expect(RedisService.incrementStreamDonations).toHaveBeenCalledWith(
        "stream-1",
        100
      );
    });

    it("should throw if payment not found during update", async () => {
      (prisma.payment.update as jest.Mock).mockRejectedValue(new Error("Not found"));

      await expect(updatePayment("nonexistent", "SUCCESS")).rejects.toThrow();
    });
  });
});
