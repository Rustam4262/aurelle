import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============ SALONS ============
export const salons = pgTable("salons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  name: jsonb("name").notNull().$type<{ en: string; ru: string; uz: string }>(),
  description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  photos: text("photos").array(),
  isActive: boolean("is_active").default(true),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_salons_owner").on(table.ownerId),
  index("idx_salons_city").on(table.city),
  index("idx_salons_location").on(table.latitude, table.longitude),
]);

export const insertSalonSchema = createInsertSchema(salons).omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalon = z.infer<typeof insertSalonSchema>;
export type Salon = typeof salons.$inferSelect;

// ============ SALON WORKING HOURS ============
export const salonWorkingHours = pgTable("salon_working_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  openTime: varchar("open_time", { length: 5 }).notNull(), // "09:00"
  closeTime: varchar("close_time", { length: 5 }).notNull(), // "20:00"
  isClosed: boolean("is_closed").default(false),
});

export const insertWorkingHoursSchema = createInsertSchema(salonWorkingHours).omit({
  id: true,
});

export type InsertWorkingHours = z.infer<typeof insertWorkingHoursSchema>;
export type WorkingHours = typeof salonWorkingHours.$inferSelect;

// ============ SALON SETTINGS ============
export const salonSettings = pgTable("salon_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull().unique(),
  bufferMinutes: integer("buffer_minutes").default(10), // Buffer between bookings
  allowDoubleBooking: boolean("allow_double_booking").default(false), // Allow multiple bookings at same time
  autoConfirmBookings: boolean("auto_confirm_bookings").default(false), // Auto-confirm new bookings
  maxAdvanceBookingDays: integer("max_advance_booking_days").default(30), // How far in advance clients can book
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_salon_settings_salon").on(table.salonId),
]);

export const insertSalonSettingsSchema = createInsertSchema(salonSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalonSettings = z.infer<typeof insertSalonSettingsSchema>;
export type SalonSettings = typeof salonSettings.$inferSelect;

// ============ MASTERS ============
export const masters = pgTable("masters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  userId: varchar("user_id"), // Link to user account for login
  email: varchar("email", { length: 255 }), // Login email
  name: varchar("name", { length: 200 }).notNull(),
  photo: varchar("photo", { length: 500 }),
  specialties: jsonb("specialties").$type<{ en: string[]; ru: string[]; uz: string[] }>(),
  bio: jsonb("bio").$type<{ en: string; ru: string; uz: string }>(),
  experience: integer("experience").default(0), // years
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_masters_salon").on(table.salonId),
  index("idx_masters_user").on(table.userId),
]);

export const insertMasterSchema = createInsertSchema(masters).omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
});

export type InsertMaster = z.infer<typeof insertMasterSchema>;
export type Master = typeof masters.$inferSelect;

// ============ MASTER PORTFOLIO ============
export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  title: jsonb("title").$type<{ en: string; ru: string; uz: string }>(),
  description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
  serviceCategory: varchar("service_category", { length: 50 }), // haircut, coloring, nails, etc.
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_portfolio_master").on(table.masterId),
  index("idx_portfolio_category").on(table.serviceCategory),
]);

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;

// ============ MASTER WORKING HOURS ============
export const masterWorkingHours = pgTable("master_working_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  openTime: varchar("open_time", { length: 5 }).notNull(), // "09:00"
  closeTime: varchar("close_time", { length: 5 }).notNull(), // "18:00"
  isClosed: boolean("is_closed").default(false),
}, (table) => [
  index("idx_master_hours_master").on(table.masterId),
]);

export const insertMasterWorkingHoursSchema = createInsertSchema(masterWorkingHours).omit({
  id: true,
});

export type InsertMasterWorkingHours = z.infer<typeof insertMasterWorkingHoursSchema>;
export type MasterWorkingHours = typeof masterWorkingHours.$inferSelect;

// ============ MASTER PORTFOLIO ============
export const masterPortfolio = pgTable("master_portfolio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_master_portfolio_master").on(table.masterId),
]);

export const insertMasterPortfolioSchema = createInsertSchema(masterPortfolio).omit({
  id: true,
  createdAt: true,
});

export type InsertMasterPortfolio = z.infer<typeof insertMasterPortfolioSchema>;
export type MasterPortfolio = typeof masterPortfolio.$inferSelect;

// ============ SERVICES ============
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  name: jsonb("name").notNull().$type<{ en: string; ru: string; uz: string }>(),
  description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
  category: varchar("category", { length: 100 }).notNull(),
  priceMin: integer("price_min").notNull(), // in UZS
  priceMax: integer("price_max"), // in UZS, optional for fixed price
  duration: integer("duration").notNull(), // in minutes
  isActive: boolean("is_active").default(true),
  bookingCount: integer("booking_count").default(0), // Phase 1: Track popularity
  lastBookedAt: timestamp("last_booked_at"), // Phase 1: Last booking timestamp
  displayOrder: integer("display_order").default(0), // Phase 1: Custom ordering
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_services_salon").on(table.salonId),
  index("idx_services_category").on(table.category),
  index("idx_services_booking_count").on(table.bookingCount),
  index("idx_services_display_order").on(table.displayOrder),
]);

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ============ MASTER SERVICES (pivot table) ============
export const masterServices = pgTable("master_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  serviceId: varchar("service_id").notNull(),
});

// ============ BOOKINGS ============
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  salonId: varchar("salon_id").notNull(),
  masterId: varchar("master_id"), // Optional - allows booking without specific master
  serviceId: varchar("service_id").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // "14:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "15:00"
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, cancelled, completed
  priceSnapshot: integer("price_snapshot").notNull(), // price at time of booking in UZS
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  modifiedBy: varchar("modified_by", { length: 255 }), // Phase 1: Who modified the booking
  modificationHistory: jsonb("modification_history").default('[]').$type<Array<{
    timestamp: string;
    action: string;
    changedBy: string;
    changes?: Record<string, any>;
  }>>(), // Phase 1: Audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bookings_client").on(table.clientId),
  index("idx_bookings_salon").on(table.salonId),
  index("idx_bookings_master").on(table.masterId),
  index("idx_bookings_date").on(table.bookingDate),
  index("idx_bookings_status").on(table.status),
  // Composite indexes for conflict checking optimization
  index("idx_bookings_master_date_status").on(table.masterId, table.bookingDate, table.status),
  index("idx_bookings_salon_date_status").on(table.salonId, table.bookingDate, table.status),
]);

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// ============ REVIEWS ============
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  salonId: varchar("salon_id"),
  masterId: varchar("master_id"),
  bookingId: varchar("booking_id"),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  ownerResponse: text("owner_response"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_reviews_salon").on(table.salonId),
  index("idx_reviews_master").on(table.masterId),
  index("idx_reviews_client").on(table.clientId),
]);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  ownerResponse: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// ============ PUSH SUBSCRIPTIONS ============
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key for encryption
  auth: text("auth").notNull(), // Auth secret for encryption
  userAgent: text("user_agent"), // Browser/device info
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_push_subscriptions_user").on(table.userId),
  index("idx_push_subscriptions_endpoint").on(table.endpoint),
]);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ============ WAITLIST ============
export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  salonId: varchar("salon_id").notNull(),
  masterId: varchar("master_id"),
  serviceId: varchar("service_id").notNull(),
  preferredDate: varchar("preferred_date", { length: 10 }), // YYYY-MM-DD
  preferredTimeStart: varchar("preferred_time_start", { length: 5 }), // HH:MM
  preferredTimeEnd: varchar("preferred_time_end", { length: 5 }), // HH:MM
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting, notified, booked, expired
  notifiedAt: timestamp("notified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_waitlist_client").on(table.clientId),
  index("idx_waitlist_salon").on(table.salonId),
  index("idx_waitlist_status").on(table.status),
]);

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  status: true,
  notifiedAt: true,
  createdAt: true,
});

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// ============ USER PROFILES ============
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("client"),
  fullName: varchar("full_name", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isProfileComplete: boolean("is_profile_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_profiles_user").on(table.userId),
]);

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// ============ FAVORITES ============
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  salonId: varchar("salon_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_favorites_user").on(table.userId),
]);

// ============ NOTIFICATIONS ============
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "new_booking", "booking_confirmed", etc.
  message: text("message"), // Legacy field, kept for backwards compatibility
  metadata: jsonb("metadata").$type<{ bookingDate?: string; startTime?: string; [key: string]: any }>(), // Structured data for client-side translation
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id"), // booking ID or other related entity
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_created").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const newBookingNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.literal("new_booking"),
  metadata: z.object({
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "bookingDate must be in YYYY-MM-DD format"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be in HH:MM format"),
  }),
  isRead: z.boolean().default(false),
  relatedId: z.string().optional(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NewBookingNotification = z.infer<typeof newBookingNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============ CONTACT SUBMISSIONS (kept from original) ============
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export interface ContactSubmission extends ContactFormData {
  id: string;
  submittedAt: Date;
}

export const newsletterSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export type NewsletterData = z.infer<typeof newsletterSchema>;

export interface NewsletterSubscription extends NewsletterData {
  id: string;
  subscribedAt: Date;
}

// ============ MASTER STATISTICS (Phase 1) ============
export const masterStatistics = pgTable("master_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // "YYYY-MM"
  totalBookings: integer("total_bookings").default(0),
  completedBookings: integer("completed_bookings").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_master_stats_master").on(table.masterId),
  index("idx_master_stats_month").on(table.month),
  // Unique constraint to prevent duplicate stats
  index("idx_master_stats_unique").on(table.masterId, table.month),
]);

export const insertMasterStatisticsSchema = createInsertSchema(masterStatistics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMasterStatistics = z.infer<typeof insertMasterStatisticsSchema>;
export type MasterStatistics = typeof masterStatistics.$inferSelect;

// ============ BOOKING HISTORY (Phase 1) ============
export const bookingHistory = pgTable("booking_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // "created", "confirmed", "cancelled", "rescheduled", "completed"
  previousState: jsonb("previous_state").$type<Partial<Booking>>(),
  newState: jsonb("new_state").$type<Partial<Booking>>(),
  changedBy: varchar("changed_by", { length: 255 }).notNull(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_booking_history_booking").on(table.bookingId),
  index("idx_booking_history_created").on(table.createdAt),
]);

export const insertBookingHistorySchema = createInsertSchema(bookingHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertBookingHistory = z.infer<typeof insertBookingHistorySchema>;
export type BookingHistory = typeof bookingHistory.$inferSelect;

// ============ RELATIONS ============
export const salonsRelations = relations(salons, ({ many }) => ({
  workingHours: many(salonWorkingHours),
  masters: many(masters),
  services: many(services),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const mastersRelations = relations(masters, ({ one, many }) => ({
  salon: one(salons, {
    fields: [masters.salonId],
    references: [salons.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  salon: one(salons, {
    fields: [services.salonId],
    references: [salons.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  salon: one(salons, {
    fields: [bookings.salonId],
    references: [salons.id],
  }),
  master: one(masters, {
    fields: [bookings.masterId],
    references: [masters.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  salon: one(salons, {
    fields: [reviews.salonId],
    references: [salons.id],
  }),
  master: one(masters, {
    fields: [reviews.masterId],
    references: [masters.id],
  }),
}));

// ============ AUDIT LOGS ============
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // "booking.cancel", "service.create", "master.update"
  entityType: varchar("entity_type", { length: 50 }).notNull(), // "booking", "service", "master", "salon"
  entityId: varchar("entity_id", { length: 255 }),
  salonId: varchar("salon_id", { length: 255 }),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  result: varchar("result", { length: 20 }).notNull(), // "success" / "failure"
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_actor").on(table.actorId),
  index("idx_audit_logs_salon").on(table.salonId),
  index("idx_audit_logs_created").on(table.createdAt),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ OWNER PERMISSIONS ============
export const ownerPermissions = pgTable("owner_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  permission: varchar("permission", { length: 100 }).notNull(), // "owner.read_dashboard", "owner.manage_bookings"
  grantedAt: timestamp("granted_at").defaultNow(),
  grantedBy: varchar("granted_by", { length: 255 }),
}, (table) => [
  index("idx_owner_permissions_owner").on(table.ownerId),
  index("idx_owner_permissions_permission").on(table.permission),
]);

export const insertOwnerPermissionSchema = createInsertSchema(ownerPermissions).omit({
  id: true,
  grantedAt: true,
});

export type InsertOwnerPermission = z.infer<typeof insertOwnerPermissionSchema>;
export type OwnerPermission = typeof ownerPermissions.$inferSelect;

// ============ SALON BREAKS ============
export const salonBreaks = pgTable("salon_breaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  startTime: varchar("start_time", { length: 5 }).notNull(), // "13:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "14:00"
  label: varchar("label", { length: 100 }), // "Lunch Break", "Cleaning", etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_salon_breaks_salon").on(table.salonId),
  index("idx_salon_breaks_day").on(table.salonId, table.dayOfWeek),
]);

export const insertSalonBreakSchema = createInsertSchema(salonBreaks).omit({
  id: true,
  createdAt: true,
});

export type InsertSalonBreak = z.infer<typeof insertSalonBreakSchema>;
export type SalonBreak = typeof salonBreaks.$inferSelect;

// ============ SALON EXCEPTIONS ============
export const salonExceptions = pgTable("salon_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  exceptionDate: varchar("exception_date", { length: 10 }).notNull(), // "2026-01-17" (YYYY-MM-DD)
  isClosed: boolean("is_closed").default(true),
  openTime: varchar("open_time", { length: 5 }), // If not closed, custom hours
  closeTime: varchar("close_time", { length: 5 }),
  reason: text("reason"), // "New Year", "Renovation", etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_salon_exceptions_salon").on(table.salonId),
  index("idx_salon_exceptions_date").on(table.salonId, table.exceptionDate),
]);

export const insertSalonExceptionSchema = createInsertSchema(salonExceptions).omit({
  id: true,
  createdAt: true,
});

export type InsertSalonException = z.infer<typeof insertSalonExceptionSchema>;
export type SalonException = typeof salonExceptions.$inferSelect;
