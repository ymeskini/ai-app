import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteChat } from "~/server/db/queries";
import { db } from "~/server/db";

// Mock the database
vi.mock("~/server/db", () => ({
  db: {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
    },
    delete: vi.fn(),
  },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

describe("deleteChat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should successfully delete a chat that exists and belongs to the user", async () => {
    // Mock the chat exists
    vi.mocked(db.query.chats.findFirst).mockResolvedValue({
      id: "chat-123",
      userId: "user-123",
      title: "Test Chat",
    });

    // Mock successful deletion
    vi.mocked(db.delete).mockResolvedValue({} as any);

    const result = await deleteChat({
      userId: "user-123",
      chatId: "chat-123",
    });

    expect(result).toEqual({ success: true });
    expect(db.delete).toHaveBeenCalledTimes(2); // Once for messages, once for chat
  });

  it("should return CHAT_NOT_FOUND when chat does not exist", async () => {
    // Mock the chat does not exist
    vi.mocked(db.query.chats.findFirst).mockResolvedValue(null);

    const result = await deleteChat({
      userId: "user-123",
      chatId: "chat-123",
    });

    expect(result).toEqual({ success: false, error: "CHAT_NOT_FOUND" });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("should return INTERNAL_ERROR when database operation fails", async () => {
    // Mock the chat exists
    vi.mocked(db.query.chats.findFirst).mockResolvedValue({
      id: "chat-123",
      userId: "user-123",
      title: "Test Chat",
    });

    // Mock database error
    vi.mocked(db.delete).mockRejectedValue(new Error("Database error"));

    const result = await deleteChat({
      userId: "user-123",
      chatId: "chat-123",
    });

    expect(result).toEqual({ success: false, error: "INTERNAL_ERROR" });
  });
});
