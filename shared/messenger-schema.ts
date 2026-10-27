import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  serial,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
  check,
  customType,
} from "drizzle-orm/pg-core";
import { users } from "./models/auth";
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const messengerConversations = pgTable("messenger_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  directKey: text("direct_key").unique("messenger_conversations_direct_key_key"),
  kind: text("kind").notNull().default("direct"),
  title: varchar("title", { length: 100 }),
  creatorId: varchar("creator_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},t=>[check('messenger_conversation_kind',sql`(${t.kind}='direct' AND ${t.directKey} IS NOT NULL) OR (${t.kind}='group' AND ${t.directKey} IS NULL AND ${t.title} IS NOT NULL AND length(trim(${t.title})) between 1 and 100 AND ${t.creatorId} IS NOT NULL)`)]);
export const messengerMembers = pgTable(
  "messenger_members",
  {
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => messengerConversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadId: integer("last_read_id").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("messenger_members_user").on(t.userId),
  ],
);
export const messengerMessages = pgTable(
  "messenger_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => messengerConversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id),
    clientId: uuid("client_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("messenger_message_retry").on(t.conversationId, t.senderId, t.clientId),
    index("messenger_messages_history").on(t.conversationId, t.id),
    check("messenger_body_length", sql`length(trim(${t.body})) between 1 and 4000`),
  ],
);
export const messengerBlocks = pgTable(
  "messenger_blocks",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: varchar("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.blockedUserId] }),
    check("messenger_block_self", sql`${t.userId} <> ${t.blockedUserId}`),
  ],
);
export const messengerAttachments = pgTable(
  "messenger_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: integer("message_id")
      .notNull()
      .unique()
      .references(() => messengerMessages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
  },
  (t) => [check("messenger_attachments_size_check", sql`${t.size} between 1 and 8388608`)],
);
