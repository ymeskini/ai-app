import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export { createTable } from "./table";
export * from "./auth";
export * from "./chat";
export * from "./rag";

import type { users, accounts, sessions, verificationTokens } from "./auth";
import type { chats, messages, messageSources } from "./chat";
import type { documents, chunks } from "./rag";

export declare namespace DB {
  export type User = InferSelectModel<typeof users>;
  export type NewUser = InferInsertModel<typeof users>;

  export type Account = InferSelectModel<typeof accounts>;
  export type NewAccount = InferInsertModel<typeof accounts>;

  export type Session = InferSelectModel<typeof sessions>;
  export type NewSession = InferInsertModel<typeof sessions>;

  export type VerificationToken = InferSelectModel<typeof verificationTokens>;
  export type NewVerificationToken = InferInsertModel<
    typeof verificationTokens
  >;

  export type Chat = InferSelectModel<typeof chats>;
  export type NewChat = InferInsertModel<typeof chats>;

  export type Message = InferSelectModel<typeof messages>;
  export type NewMessage = InferInsertModel<typeof messages>;

  export type MessageSource = InferSelectModel<typeof messageSources>;
  export type NewMessageSource = InferInsertModel<typeof messageSources>;

  export type Document = InferSelectModel<typeof documents>;
  export type NewDocument = InferInsertModel<typeof documents>;

  export type Chunk = InferSelectModel<typeof chunks>;
  export type NewChunk = InferInsertModel<typeof chunks>;
}
