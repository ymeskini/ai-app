import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { chats, messages } from "./schema";
import type { Message } from "ai";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) => {
  const { userId, chatId, title, messages: newMessages } = opts;

  const existingChat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (existingChat) {
    if (existingChat.userId !== userId) {
      throw new Error("Chat ID already exists under a different user");
    }

    await db.delete(messages).where(eq(messages.chatId, chatId));
  } else {
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
    });
  }

  await db.insert(messages).values(
    newMessages.map((message, index) => ({
      id: crypto.randomUUID(),
      chatId,
      role: message.role,
      parts: message.parts,
      annotations: message.annotations ?? null,
      order: index,
    })),
  );

  return { id: chatId };
};

export const getChat = async (chatId: string, userId: string) => {
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
      content: message.parts,
      annotations: message.annotations,
    })),
  };
};

export const getChats = async (userId: string) => {
  return await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
};

export const deleteChat = async (chatId: string, userId: string) => {
  // First delete all messages associated with the chat
  await db.delete(messages).where(eq(messages.chatId, chatId));

  // Then delete the chat itself, but only if it belongs to the user
  const result = await db.delete(chats).where(
    and(eq(chats.id, chatId), eq(chats.userId, userId))
  );

  return result;
};
