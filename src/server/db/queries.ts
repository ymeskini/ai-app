import * as Sentry from "@sentry/nextjs";
import { eq, and } from "drizzle-orm";
import type { UIMessage } from "ai";

import { db } from "./index.ts";
import { chats, messages } from "./schema.ts";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: UIMessage[];
}) => {
  const { userId, chatId, title, messages: newMessages } = opts;

  // First, check if the chat exists and belongs to the user
  const existingChat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (existingChat) {
    // If chat exists but belongs to a different user, throw error
    if (existingChat.userId !== userId) {
      throw new Error("Chat ID already exists under a different user");
    }
    // Delete all existing messages
    await db.delete(messages).where(eq(messages.chatId, chatId));
  } else {
    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
    });
  }

  // Insert all messages
  await db.insert(messages).values(
    newMessages.map((message, index) => ({
      id: crypto.randomUUID(),
      chatId,
      role: message.role,
      parts: message.parts,
      order: index,
    })),
  );

  return { id: chatId };
};

export const getChat = async (opts: { userId: string; chatId: string }) => {
  const { userId, chatId } = opts;

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  if (!chat) {
    return null;
  }

  return {
    ...chat,
    messages: chat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts,
    })),
  };
};

export const getChats = async (opts: { userId: string }) => {
  const { userId } = opts;

  return await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
};

export const deleteChat = async (opts: { userId: string; chatId: string }) => {
  const { userId, chatId } = opts;

  try {
    // First, check if the chat exists and belongs to the user
    const existingChat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    });

    if (!existingChat) {
      return { success: false, error: "CHAT_NOT_FOUND" as const };
    }

    // Delete all messages first (due to foreign key constraint)
    await db.delete(messages).where(eq(messages.chatId, chatId));

    // Delete the chat
    await db.delete(chats).where(eq(chats.id, chatId));

    Sentry.addBreadcrumb({
      message: "Chat deleted successfully",
      category: "database",
      data: { chatId, userId },
      level: "info",
    });

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    console.error("Error deleting chat:", error);
    return { success: false, error: "INTERNAL_ERROR" as const };
  }
};
