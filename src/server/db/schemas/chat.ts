import { relations, sql } from "drizzle-orm";
import { index, integer, json, timestamp, varchar } from "drizzle-orm/pg-core";
import { createTable, ulidPrimaryKey } from "./table";
import { users } from "./auth";

export const chats = createTable("chat", {
  id: ulidPrimaryKey(),
  userId: varchar("user_id", { length: 26 })
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, { fields: [chats.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messages = createTable(
  "message",
  {
    id: ulidPrimaryKey(),
    chatId: varchar("chat_id", { length: 26 })
      .notNull()
      .references(() => chats.id),
    role: varchar("role", { length: 255 }).notNull(),
    parts: json("parts").notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (message) => [index("message_chat_id_idx").on(message.chatId)],
);

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
}));
