import { pgTable, varchar, text, timestamp, boolean, jsonb, index, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";

// ============ ADMIN ROLES & PERMISSIONS ============

export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // super_admin, admin, moderator
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<string[]>(), // ["users.read", "users.block", ...]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_admin_roles_name").on(table.name),
]);

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users.id
  roleId: varchar("role_id").notNull(), // FK to admin_roles.id
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_admin_users_user").on(table.userId),
  index("idx_admin_users_role").on(table.roleId),
]);

// ============ SANCTION REASON CODES ============

export const sanctionReasonCodes = pgTable("sanction_reason_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sanction_reason_codes_code").on(table.code),
]);

export const insertSanctionReasonCodeSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export type InsertSanctionReasonCode = z.infer<typeof insertSanctionReasonCodeSchema>;
export type SanctionReasonCode = typeof sanctionReasonCodes.$inferSelect;

// ============ SANCTIONS ============

export const sanctions = pgTable("sanctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: varchar("target_type", { length: 20 }).notNull(), // user, salon, master, client
  targetId: varchar("target_id").notNull(),
  sanctionType: varchar("sanction_type", { length: 30 }).notNull(), // temp_block, perm_block, feature_restrict
  features: jsonb("features").$type<Record<string, boolean>>(), // {"chat": false, "booking_create": false}
  reasonCodeId: varchar("reason_code_id"), // FK to sanction_reason_codes.id
  reasonText: text("reason_text").notNull(),
  commentToUser: text("comment_to_user"),
  internalNote: text("internal_note"),
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, expired, revoked
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by"), // FK to users.id
  revokeReason: text("revoke_reason"),
  createdBy: varchar("created_by").notNull(), // FK to users.id (admin)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sanctions_target").on(table.targetType, table.targetId, table.status),
  index("idx_sanctions_status_ends").on(table.status, table.endsAt),
  index("idx_sanctions_created_by").on(table.createdBy, table.createdAt),
]);

export const insertSanctionSchema = z.object({
  targetType: z.enum(["user", "salon", "master", "client"]),
  targetId: z.string(),
  sanctionType: z.enum(["temp_block", "perm_block", "feature_restrict"]),
  features: z.record(z.boolean()).optional(),
  reasonCodeId: z.string().optional(),
  reasonText: z.string().min(1),
  commentToUser: z.string().optional(),
  internalNote: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type InsertSanction = z.infer<typeof insertSanctionSchema>;
export type Sanction = typeof sanctions.$inferSelect;

// ============ COMPLAINTS ============

export const complaints = pgTable("complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  complainantUserId: varchar("complainant_user_id").notNull(), // FK to users.id
  targetType: varchar("target_type", { length: 20 }).notNull(), // salon, master, client, user
  targetId: varchar("target_id").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // spam, fraud, abuse, quality, other
  description: text("description").notNull(),
  attachments: jsonb("attachments").$type<string[]>(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, in_review, resolved, rejected
  assignedAdminId: varchar("assigned_admin_id"), // FK to users.id
  resolutionComment: text("resolution_comment"),
  decision: varchar("decision", { length: 30 }), // warning, sanction_applied, no_action
  sanctionId: varchar("sanction_id"), // FK to sanctions.id
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_complaints_status").on(table.status, table.createdAt),
  index("idx_complaints_target").on(table.targetType, table.targetId),
  index("idx_complaints_assigned").on(table.assignedAdminId, table.status),
]);

export const insertComplaintSchema = z.object({
  targetType: z.enum(["salon", "master", "client", "user"]),
  targetId: z.string(),
  category: z.enum(["spam", "fraud", "abuse", "quality", "other"]),
  description: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaints.$inferSelect;

// ============ AUDIT LOGS ============

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").notNull(), // FK to users.id (admin)
  actorRole: varchar("actor_role", { length: 30 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // user.block, salon.verify, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // user, salon, booking, etc.
  entityId: varchar("entity_id"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  requestId: varchar("request_id", { length: 64 }),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_actor").on(table.actorUserId, table.createdAt),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId, table.createdAt),
  index("idx_audit_logs_action").on(table.action, table.createdAt),
]);

export const insertAuditLogSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  oldData: z.any().optional(),
  newData: z.any().optional(),
  meta: z.any().optional(),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ CHAT THREADS ============

export const chatThreads = pgTable("chat_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull().default("support"), // support
  userId: varchar("user_id").notNull(), // FK to users.id (user who initiated chat)
  assignedAdminId: varchar("assigned_admin_id"), // FK to users.id (admin)
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, closed
  lastMessageAt: timestamp("last_message_at"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by"), // FK to users.id
  closeReason: text("close_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_threads_user").on(table.userId, table.status),
  index("idx_chat_threads_assigned").on(table.assignedAdminId, table.status),
  index("idx_chat_threads_last_message").on(table.lastMessageAt),
]);

export type ChatThread = typeof chatThreads.$inferSelect;

// ============ CHAT MESSAGES ============

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(), // FK to chat_threads.id
  senderType: varchar("sender_type", { length: 10 }).notNull(), // user, admin
  senderUserId: varchar("sender_user_id").notNull(), // FK to users.id
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // text, system
  text: text("text"),
  attachments: jsonb("attachments").$type<string[]>(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_thread").on(table.threadId, table.createdAt),
  index("idx_chat_messages_sender").on(table.senderUserId, table.createdAt),
]);

export const insertChatMessageSchema = z.object({
  threadId: z.string(),
  senderType: z.enum(["user", "admin"]),
  senderUserId: z.string(),
  text: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============ CHAT MESSAGE READS ============

export const chatMessageReads = pgTable("chat_message_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(), // FK to chat_messages.id
  readerUserId: varchar("reader_user_id").notNull(), // FK to users.id
  readAt: timestamp("read_at").defaultNow(),
}, (table) => [
  index("idx_chat_message_reads_reader").on(table.readerUserId, table.readAt),
  index("idx_chat_message_reads_message").on(table.messageId),
]);

export type ChatMessageRead = typeof chatMessageReads.$inferSelect;

// ============ CHAT TEMPLATES ============

export const chatTemplates = pgTable("chat_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(), // FK to users.id (admin)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_templates_category").on(table.category),
]);

export const insertChatTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1),
  category: z.string().optional(),
});

export type InsertChatTemplate = z.infer<typeof insertChatTemplateSchema>;
export type ChatTemplate = typeof chatTemplates.$inferSelect;
