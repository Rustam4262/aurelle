import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============ SALONS ============
export const salons = pgTable(
  "salons",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    isVerified: boolean("is_verified").default(false), // Admin verification status
    status: varchar("status", { length: 20 }).default("draft"), // draft, active, paused
    averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
    reviewCount: integer("review_count").default(0),
    // Payment settings (opt-in per salon)
    paymentEnabled: boolean("payment_enabled").default(false),
    depositPercent: integer("deposit_percent").default(0), // 0=full, 1-99=deposit %
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_salons_owner").on(table.ownerId),
    index("idx_salons_city").on(table.city),
    index("idx_salons_location").on(table.latitude, table.longitude),
    index("idx_salons_verified").on(table.isVerified),
  ],
);

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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
export const salonSettings = pgTable(
  "salon_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    salonId: varchar("salon_id").notNull().unique(),
    bufferMinutes: integer("buffer_minutes").default(10), // Buffer between bookings
    allowDoubleBooking: boolean("allow_double_booking").default(false), // Allow multiple bookings at same time
    autoConfirmBookings: boolean("auto_confirm_bookings").default(false), // Auto-confirm new bookings
    maxAdvanceBookingDays: integer("max_advance_booking_days").default(30), // How far in advance clients can book
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_salon_settings_salon").on(table.salonId)],
);

export const insertSalonSettingsSchema = createInsertSchema(salonSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalonSettings = z.infer<typeof insertSalonSettingsSchema>;
export type SalonSettings = typeof salonSettings.$inferSelect;

// ============ MASTERS ============
export const masters = pgTable(
  "masters",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    salonId: varchar("salon_id"), // Nullable for solo masters
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
    // Solo master fields
    isSoloMaster: boolean("is_solo_master").default(false),
    slug: varchar("slug", { length: 100 }).unique(), // Public URL: /master/:slug
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 100 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    serviceMode: varchar("service_mode", { length: 20 }).default("at_master"), // at_master, mobile, both
    workRadius: integer("work_radius").default(10), // km for mobile services
    mobileExtraCharge: integer("mobile_extra_charge").default(0), // UZS
    phone: varchar("phone", { length: 20 }),
    instagram: varchar("instagram", { length: 100 }),
    telegram: varchar("telegram", { length: 100 }),
    status: varchar("status", { length: 20 }).default("draft"), // draft, active, paused
  },
  (table) => [
    index("idx_masters_salon").on(table.salonId),
    index("idx_masters_user").on(table.userId),
    index("idx_masters_solo").on(table.isSoloMaster),
    index("idx_masters_slug").on(table.slug),
    index("idx_masters_location").on(table.latitude, table.longitude),
  ],
);

export const insertMasterSchema = createInsertSchema(masters).omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
});

export type InsertMaster = z.infer<typeof insertMasterSchema>;
export type Master = typeof masters.$inferSelect;

// ============ MASTER PORTFOLIO ============
export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    masterId: varchar("master_id").notNull(),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    title: jsonb("title").$type<{ en: string; ru: string; uz: string }>(),
    description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
    serviceCategory: varchar("service_category", { length: 50 }), // haircut, coloring, nails, etc.
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_portfolio_master").on(table.masterId),
    index("idx_portfolio_category").on(table.serviceCategory),
  ],
);

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;

// ============ MASTER WORKING HOURS ============
export const masterWorkingHours = pgTable(
  "master_working_hours",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    masterId: varchar("master_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
    openTime: varchar("open_time", { length: 5 }).notNull(), // "09:00"
    closeTime: varchar("close_time", { length: 5 }).notNull(), // "18:00"
    isClosed: boolean("is_closed").default(false),
  },
  (table) => [index("idx_master_hours_master").on(table.masterId)],
);

export const insertMasterWorkingHoursSchema = createInsertSchema(masterWorkingHours).omit({
  id: true,
});

export type InsertMasterWorkingHours = z.infer<typeof insertMasterWorkingHoursSchema>;
export type MasterWorkingHours = typeof masterWorkingHours.$inferSelect;

// ============ MASTER PORTFOLIO ============
export const masterPortfolio = pgTable(
  "master_portfolio",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    masterId: varchar("master_id").notNull(),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_master_portfolio_master").on(table.masterId)],
);

export const insertMasterPortfolioSchema = createInsertSchema(masterPortfolio).omit({
  id: true,
  createdAt: true,
});

export type InsertMasterPortfolio = z.infer<typeof insertMasterPortfolioSchema>;
export type MasterPortfolio = typeof masterPortfolio.$inferSelect;

// ============ SERVICES ============
export const services = pgTable(
  "services",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  (table) => [
    index("idx_services_salon").on(table.salonId),
    index("idx_services_category").on(table.category),
    index("idx_services_booking_count").on(table.bookingCount),
    index("idx_services_display_order").on(table.displayOrder),
  ],
);

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ============ MASTER SERVICES (pivot table) ============
export const masterServices = pgTable("master_services", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull(),
  serviceId: varchar("service_id").notNull(),
});

// ============ SOLO MASTER SERVICES ============
export const soloMasterServices = pgTable(
  "solo_master_services",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    masterId: varchar("master_id").notNull(),
    name: jsonb("name").notNull().$type<{ en: string; ru: string; uz: string }>(),
    description: jsonb("description").$type<{ en: string; ru: string; uz: string }>(),
    category: varchar("category", { length: 100 }).notNull(),
    priceMin: integer("price_min").notNull(), // in UZS
    priceMax: integer("price_max"), // in UZS, optional for fixed price
    duration: integer("duration").notNull(), // in minutes
    serviceMode: varchar("service_mode", { length: 20 }).default("both"), // at_master | mobile | both
    mobileExtraCharge: integer("mobile_extra_charge"), // extra charge for mobile service
    isActive: boolean("is_active").default(true),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_solo_master_services_master").on(table.masterId),
    index("idx_solo_master_services_category").on(table.category),
    index("idx_solo_master_services_display_order").on(table.displayOrder),
  ],
);

export const insertSoloMasterServiceSchema = createInsertSchema(soloMasterServices).omit({
  id: true,
  createdAt: true,
});

export type InsertSoloMasterService = z.infer<typeof insertSoloMasterServiceSchema>;
export type SoloMasterService = typeof soloMasterServices.$inferSelect;

// ============ SOLO MASTER SETTINGS ============
export const soloMasterSettings = pgTable("solo_master_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  masterId: varchar("master_id").notNull().unique(),
  bufferMinutes: integer("buffer_minutes").default(10), // buffer between appointments
  travelBufferMinutes: integer("travel_buffer_minutes").default(30), // extra buffer for mobile bookings
  autoConfirmBookings: boolean("auto_confirm_bookings").default(false),
  maxAdvanceBookingDays: integer("max_advance_booking_days").default(30),
  minAdvanceBookingHours: integer("min_advance_booking_hours").default(2),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSoloMasterSettingsSchema = createInsertSchema(soloMasterSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertSoloMasterSettings = z.infer<typeof insertSoloMasterSettingsSchema>;
export type SoloMasterSettings = typeof soloMasterSettings.$inferSelect;

// ============ BOOKINGS ============
export const bookings = pgTable(
  "bookings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar("client_id").notNull(),
    salonId: varchar("salon_id"), // Nullable for solo master bookings
    masterId: varchar("master_id"), // Optional - allows booking without specific master
    serviceId: varchar("service_id"), // Nullable for solo master bookings (uses soloMasterServiceId)
    soloMasterServiceId: varchar("solo_master_service_id"), // For solo master bookings
    bookingDate: timestamp("booking_date").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(), // "14:00"
    endTime: varchar("end_time", { length: 5 }).notNull(), // "15:00"
    status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, cancelled, completed
    priceSnapshot: integer("price_snapshot").notNull(), // price at time of booking in UZS
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    modifiedBy: varchar("modified_by", { length: 255 }), // Phase 1: Who modified the booking
    modificationHistory: jsonb("modification_history").default("[]").$type<
      Array<{
        timestamp: string;
        action: string;
        changedBy: string;
        changes?: Record<string, any>;
      }>
    >(), // Phase 1: Audit trail
    // Mobile booking fields for solo masters
    isMobileBooking: boolean("is_mobile_booking").default(false),
    clientAddress: varchar("client_address", { length: 500 }),
    clientLatitude: decimal("client_latitude", { precision: 10, scale: 7 }),
    clientLongitude: decimal("client_longitude", { precision: 10, scale: 7 }),
    estimatedTravelTime: integer("estimated_travel_time"), // in minutes
    mobileExtraCharge: integer("mobile_extra_charge").default(0), // extra charge for mobile service
    paymentStatus: varchar("payment_status", { length: 20 }).default("not_required"), // not_required | pending | paid | refunded
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_bookings_client").on(table.clientId),
    index("idx_bookings_salon").on(table.salonId),
    index("idx_bookings_master").on(table.masterId),
    index("idx_bookings_date").on(table.bookingDate),
    index("idx_bookings_status").on(table.status),
    // Composite indexes for conflict checking optimization
    index("idx_bookings_master_date_status").on(table.masterId, table.bookingDate, table.status),
    index("idx_bookings_salon_date_status").on(table.salonId, table.bookingDate, table.status),
    index("idx_bookings_solo_master_service").on(table.soloMasterServiceId),
    index("idx_bookings_mobile").on(table.isMobileBooking),
  ],
);

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// ============ REVIEWS ============
export const reviews = pgTable(
  "reviews",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar("client_id").notNull(),
    salonId: varchar("salon_id"),
    masterId: varchar("master_id"),
    bookingId: varchar("booking_id"),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    ownerResponse: text("owner_response"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_reviews_salon").on(table.salonId),
    index("idx_reviews_master").on(table.masterId),
    index("idx_reviews_client").on(table.clientId),
  ],
);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  ownerResponse: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// ============ PUSH SUBSCRIPTIONS ============
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(), // Public key for encryption
    auth: text("auth").notNull(), // Auth secret for encryption
    userAgent: text("user_agent"), // Browser/device info
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_push_subscriptions_user").on(table.userId),
    index("idx_push_subscriptions_endpoint").on(table.endpoint),
  ],
);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ============ WAITLIST ============
export const waitlist = pgTable(
  "waitlist",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  (table) => [
    index("idx_waitlist_client").on(table.clientId),
    index("idx_waitlist_salon").on(table.salonId),
    index("idx_waitlist_status").on(table.status),
  ],
);

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  status: true,
  notifiedAt: true,
  createdAt: true,
});

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// ============ USER PROFILES ============
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().unique(),
    role: varchar("role", { length: 20 }).notNull().default("client"),
    fullName: varchar("full_name", { length: 200 }),
    phone: varchar("phone", { length: 20 }),
    city: varchar("city", { length: 100 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    gender: varchar("gender", { length: 20 }),
    birthday: varchar("birthday", { length: 10 }),
    notifyEmail: boolean("notify_email").default(true),
    notifyReminder24h: boolean("notify_reminder_24h").default(true),
    notifyReminder2h: boolean("notify_reminder_2h").default(true),
    notifyBookingUpdates: boolean("notify_booking_updates").default(true),
    notifyPromotions: boolean("notify_promotions").default(false),
    isProfileComplete: boolean("is_profile_complete").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_user_profiles_user").on(table.userId)],
);

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// ============ FAVORITES ============
export const favorites = pgTable(
  "favorites",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    salonId: varchar("salon_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_favorites_user").on(table.userId)],
);

export const masterFavorites = pgTable(
  "master_favorites",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    masterId: varchar("master_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_master_favorites_user").on(table.userId),
    index("idx_master_favorites_master").on(table.masterId),
  ],
);

export type MasterFavorite = typeof masterFavorites.$inferSelect;

// ============ SUPPORT TICKETS ============
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(), // bug, payment, question, suggestion
    status: varchar("status", { length: 20 }).default("open"), // open, in_progress, resolved, closed
    priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
    assignedTo: varchar("assigned_to"), // Admin user ID
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("idx_support_tickets_user").on(table.userId),
    index("idx_support_tickets_status").on(table.status),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ticketId: varchar("ticket_id").notNull(),
    senderId: varchar("sender_id").notNull(),
    senderType: varchar("sender_type", { length: 20 }).notNull(), // user, admin
    message: text("message").notNull(),
    attachments: text("attachments").array(), // URLs to attached files
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_support_messages_ticket").on(table.ticketId)],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;

// ============ NOTIFICATIONS ============
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "new_booking", "booking_confirmed", etc.
    message: text("message"), // Legacy field, kept for backwards compatibility
    metadata: jsonb("metadata").$type<{
      bookingDate?: string;
      startTime?: string;
      [key: string]: any;
    }>(), // Structured data for client-side translation
    isRead: boolean("is_read").default(false),
    relatedId: varchar("related_id"), // booking ID or other related entity
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId),
    index("idx_notifications_created").on(table.createdAt),
  ],
);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const newBookingNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.literal("new_booking"),
  metadata: z.object({
    bookingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "bookingDate must be in YYYY-MM-DD format"),
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
export const masterStatistics = pgTable(
  "master_statistics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    masterId: varchar("master_id").notNull(),
    month: varchar("month", { length: 7 }).notNull(), // "YYYY-MM"
    totalBookings: integer("total_bookings").default(0),
    completedBookings: integer("completed_bookings").default(0),
    totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
    averageRating: decimal("average_rating", { precision: 2, scale: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_master_stats_master").on(table.masterId),
    index("idx_master_stats_month").on(table.month),
    // Unique constraint to prevent duplicate stats
    index("idx_master_stats_unique").on(table.masterId, table.month),
  ],
);

export const insertMasterStatisticsSchema = createInsertSchema(masterStatistics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMasterStatistics = z.infer<typeof insertMasterStatisticsSchema>;
export type MasterStatistics = typeof masterStatistics.$inferSelect;

// ============ BOOKING HISTORY (Phase 1) ============
export const bookingHistory = pgTable(
  "booking_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(), // "created", "confirmed", "cancelled", "rescheduled", "completed"
    previousState: jsonb("previous_state").$type<Partial<Booking>>(),
    newState: jsonb("new_state").$type<Partial<Booking>>(),
    changedBy: varchar("changed_by", { length: 255 }).notNull(),
    changeReason: text("change_reason"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_booking_history_booking").on(table.bookingId),
    index("idx_booking_history_created").on(table.createdAt),
  ],
);

export const insertBookingHistorySchema = createInsertSchema(bookingHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertBookingHistory = z.infer<typeof insertBookingHistorySchema>;
export type BookingHistory = typeof bookingHistory.$inferSelect;

// ============ USER ACTIVITY TRACKING ============
export const userActivitySessions = pgTable(
  "user_activity_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    sessionId: varchar("session_id").notNull(),
    loginAt: timestamp("login_at").notNull().defaultNow(),
    logoutAt: timestamp("logout_at"),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceType: varchar("device_type", { length: 50 }), // mobile, desktop, tablet
    browser: varchar("browser", { length: 100 }),
    os: varchar("os", { length: 100 }),
    durationSeconds: integer("duration_seconds").default(0),
    pageViews: integer("page_views").default(0),
    actionsCount: integer("actions_count").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_activity_sessions_user_id").on(table.userId),
    index("idx_user_activity_sessions_session_id").on(table.sessionId),
    index("idx_user_activity_sessions_login_at").on(table.loginAt),
  ],
);

export const insertUserActivitySessionSchema = createInsertSchema(userActivitySessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserActivitySession = z.infer<typeof insertUserActivitySessionSchema>;
export type UserActivitySession = typeof userActivitySessions.$inferSelect;

export const userActivityActions = pgTable(
  "user_activity_actions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    sessionId: varchar("session_id"),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: varchar("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_activity_actions_user_id").on(table.userId),
    index("idx_user_activity_actions_session_id").on(table.sessionId),
    index("idx_user_activity_actions_created_at").on(table.createdAt),
    index("idx_user_activity_actions_type").on(table.actionType, table.createdAt),
  ],
);

export const insertUserActivityActionSchema = createInsertSchema(userActivityActions).omit({
  id: true,
  createdAt: true,
});

export type InsertUserActivityAction = z.infer<typeof insertUserActivityActionSchema>;
export type UserActivityAction = typeof userActivityActions.$inferSelect;

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
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  (table) => [
    index("idx_audit_logs_actor").on(table.actorId),
    index("idx_audit_logs_salon").on(table.salonId),
    index("idx_audit_logs_created").on(table.createdAt),
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  ],
);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ OWNER PERMISSIONS ============
export const ownerPermissions = pgTable(
  "owner_permissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    permission: varchar("permission", { length: 100 }).notNull(), // "owner.read_dashboard", "owner.manage_bookings"
    grantedAt: timestamp("granted_at").defaultNow(),
    grantedBy: varchar("granted_by", { length: 255 }),
  },
  (table) => [
    index("idx_owner_permissions_owner").on(table.ownerId),
    index("idx_owner_permissions_permission").on(table.permission),
  ],
);

export const insertOwnerPermissionSchema = createInsertSchema(ownerPermissions).omit({
  id: true,
  grantedAt: true,
});

export type InsertOwnerPermission = z.infer<typeof insertOwnerPermissionSchema>;
export type OwnerPermission = typeof ownerPermissions.$inferSelect;

// ============ SALON BREAKS ============
export const salonBreaks = pgTable(
  "salon_breaks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    salonId: varchar("salon_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
    startTime: varchar("start_time", { length: 5 }).notNull(), // "13:00"
    endTime: varchar("end_time", { length: 5 }).notNull(), // "14:00"
    label: varchar("label", { length: 100 }), // "Lunch Break", "Cleaning", etc.
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_salon_breaks_salon").on(table.salonId),
    index("idx_salon_breaks_day").on(table.salonId, table.dayOfWeek),
  ],
);

export const insertSalonBreakSchema = createInsertSchema(salonBreaks).omit({
  id: true,
  createdAt: true,
});

export type InsertSalonBreak = z.infer<typeof insertSalonBreakSchema>;
export type SalonBreak = typeof salonBreaks.$inferSelect;

// ============ SALON EXCEPTIONS ============
export const salonExceptions = pgTable(
  "salon_exceptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    salonId: varchar("salon_id").notNull(),
    exceptionDate: varchar("exception_date", { length: 10 }).notNull(), // "2026-01-17" (YYYY-MM-DD)
    isClosed: boolean("is_closed").default(true),
    openTime: varchar("open_time", { length: 5 }), // If not closed, custom hours
    closeTime: varchar("close_time", { length: 5 }),
    reason: text("reason"), // "New Year", "Renovation", etc.
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_salon_exceptions_salon").on(table.salonId),
    index("idx_salon_exceptions_date").on(table.salonId, table.exceptionDate),
  ],
);

export const insertSalonExceptionSchema = createInsertSchema(salonExceptions).omit({
  id: true,
  createdAt: true,
});

export type InsertSalonException = z.infer<typeof insertSalonExceptionSchema>;
export type SalonException = typeof salonExceptions.$inferSelect;

// ============ SALON MANAGERS ============
export const salonManagers = pgTable(
  "salon_managers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    salonId: varchar("salon_id").notNull(),
    userId: varchar("user_id").notNull(), // References users table (from auth)
    permissions: jsonb("permissions").default("[]").$type<string[]>(), // Array of permission strings
    invitedBy: varchar("invited_by").notNull(), // Owner who sent invitation
    invitedAt: timestamp("invited_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    status: varchar("status", { length: 20 }).default("pending"), // pending, active, revoked
    revokedAt: timestamp("revoked_at"),
    revokedBy: varchar("revoked_by"),
    invitationToken: varchar("invitation_token").unique(),
    invitationExpiresAt: timestamp("invitation_expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_salon_managers_salon").on(table.salonId),
    index("idx_salon_managers_user").on(table.userId),
    index("idx_salon_managers_status").on(table.status),
    // Unique constraint: one user can only be manager of same salon once
    index("idx_salon_managers_unique").on(table.salonId, table.userId),
  ],
);

export const insertSalonManagerSchema = createInsertSchema(salonManagers).omit({
  id: true,
  invitedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalonManager = z.infer<typeof insertSalonManagerSchema>;
export type SalonManager = typeof salonManagers.$inferSelect;

// ============ PAYMENTS ============
export const payments = pgTable(
  "payments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").notNull(),
    provider: varchar("provider", { length: 20 }).notNull(), // "payme" | "click"
    externalId: varchar("external_id"), // Provider's transaction/order ID
    orderId: varchar("order_id").unique().notNull(), // Our internal order ID (sent to provider)
    amountUzs: integer("amount_uzs").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // "full" | "deposit"
    status: varchar("status", { length: 20 }).default("pending"), // pending | succeeded | failed | cancelled | refunded
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payments_booking").on(table.bookingId),
    index("idx_payments_order").on(table.orderId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_provider").on(table.provider),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============ PASSWORD RESET TOKENS ============
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(), // SHA-256 hash of random token
    expiresAt: timestamp("expires_at").notNull(), // Tokens expire after 1 hour
    usedAt: timestamp("used_at"), // Track if token was already used
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_password_reset_user").on(table.userId),
    index("idx_password_reset_token").on(table.token),
    index("idx_password_reset_expires").on(table.expiresAt),
  ],
);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ============ SCHEDULED NOTIFICATIONS (booking reminders) ============
export const scheduledNotifications = pgTable(
  "scheduled_notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),       // 'REMINDER_24H' | 'REMINDER_2H'
    channel: varchar("channel", { length: 20 }).notNull(), // 'email' | 'sms' | 'push'
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|sent|failed|cancelled
    error: text("error"),
    dedupeKey: varchar("dedupe_key", { length: 255 }).notNull().unique(),  // '{bookingId}:{type}:{channel}'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_sn_status_time").on(table.status, table.scheduledAt),
    index("idx_sn_booking").on(table.bookingId),
  ],
);

export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;
