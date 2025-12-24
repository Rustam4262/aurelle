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

// ============ MASTERS ============
export const masters = pgTable("masters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salonId: varchar("salon_id").notNull(),
  userId: varchar("user_id"), // Optional link to user account
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
]);

export const insertMasterSchema = createInsertSchema(masters).omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
});

export type InsertMaster = z.infer<typeof insertMasterSchema>;
export type Master = typeof masters.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_services_salon").on(table.salonId),
  index("idx_services_category").on(table.category),
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
  masterId: varchar("master_id").notNull(),
  serviceId: varchar("service_id").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // "14:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "15:00"
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, cancelled, completed
  priceSnapshot: integer("price_snapshot").notNull(), // price at time of booking in UZS
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bookings_client").on(table.clientId),
  index("idx_bookings_salon").on(table.salonId),
  index("idx_bookings_master").on(table.masterId),
  index("idx_bookings_date").on(table.bookingDate),
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
