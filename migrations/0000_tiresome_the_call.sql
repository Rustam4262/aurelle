CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"salon_id" varchar NOT NULL,
	"master_id" varchar,
	"service_id" varchar NOT NULL,
	"booking_date" timestamp NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"price_snapshot" integer NOT NULL,
	"notes" text,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"salon_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_portfolio" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"description" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"service_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_working_hours" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" varchar(5) NOT NULL,
	"close_time" varchar(5) NOT NULL,
	"is_closed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "masters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"user_id" varchar,
	"email" varchar(255),
	"name" varchar(200) NOT NULL,
	"photo" varchar(500),
	"specialties" jsonb,
	"bio" jsonb,
	"experience" integer DEFAULT 0,
	"average_rating" numeric(2, 1) DEFAULT '0',
	"review_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"message" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"related_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"salon_id" varchar,
	"master_id" varchar,
	"booking_id" varchar,
	"rating" integer NOT NULL,
	"comment" text,
	"owner_response" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salon_working_hours" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" varchar(5) NOT NULL,
	"close_time" varchar(5) NOT NULL,
	"is_closed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "salons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"address" varchar(500) NOT NULL,
	"city" varchar(100) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"photos" text[],
	"is_active" boolean DEFAULT true,
	"average_rating" numeric(2, 1) DEFAULT '0',
	"review_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"category" varchar(100) NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer,
	"duration" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) DEFAULT 'client' NOT NULL,
	"full_name" varchar(200),
	"phone" varchar(20),
	"city" varchar(100),
	"avatar_url" varchar(500),
	"is_profile_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"phone_number" varchar,
	"provider" varchar DEFAULT 'local',
	"provider_id" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE INDEX "idx_bookings_client" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_salon" ON "bookings" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_master" ON "bookings" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_date" ON "bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "idx_favorites_user" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_master" ON "master_portfolio" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_master_hours_master" ON "master_working_hours" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_masters_salon" ON "masters" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_masters_user" ON "masters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reviews_salon" ON "reviews" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_master" ON "reviews" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_client" ON "reviews" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_salons_owner" ON "salons" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_salons_city" ON "salons" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_salons_location" ON "salons" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_services_salon" ON "services" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_services_category" ON "services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");