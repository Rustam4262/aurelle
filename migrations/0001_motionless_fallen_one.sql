CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255),
	"salon_id" varchar(255),
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"result" varchar(20) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"changed_by" varchar(255) NOT NULL,
	"change_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_statistics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"month" varchar(7) NOT NULL,
	"total_bookings" integer DEFAULT 0,
	"completed_bookings" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"average_rating" numeric(2, 1),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "owner_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"permission" varchar(100) NOT NULL,
	"granted_at" timestamp DEFAULT now(),
	"granted_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"title" jsonb,
	"description" jsonb,
	"service_category" varchar(50),
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salon_breaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"label" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salon_exceptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"exception_date" varchar(10) NOT NULL,
	"is_closed" boolean DEFAULT true,
	"open_time" varchar(5),
	"close_time" varchar(5),
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salon_managers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"permissions" jsonb DEFAULT '[]',
	"invited_by" varchar NOT NULL,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"revoked_at" timestamp,
	"revoked_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salon_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salon_id" varchar NOT NULL,
	"buffer_minutes" integer DEFAULT 10,
	"allow_double_booking" boolean DEFAULT false,
	"auto_confirm_bookings" boolean DEFAULT false,
	"max_advance_booking_days" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "salon_settings_salon_id_unique" UNIQUE("salon_id")
);
--> statement-breakpoint
CREATE TABLE "solo_master_services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"category" varchar(100) NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer,
	"duration" integer NOT NULL,
	"service_mode" varchar(20) DEFAULT 'both',
	"mobile_extra_charge" integer,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "solo_master_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" varchar NOT NULL,
	"buffer_minutes" integer DEFAULT 10,
	"travel_buffer_minutes" integer DEFAULT 30,
	"auto_confirm_bookings" boolean DEFAULT false,
	"max_advance_booking_days" integer DEFAULT 30,
	"min_advance_booking_hours" integer DEFAULT 2,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "solo_master_settings_master_id_unique" UNIQUE("master_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"salon_id" varchar NOT NULL,
	"master_id" varchar,
	"service_id" varchar NOT NULL,
	"preferred_date" varchar(10),
	"preferred_time_start" varchar(5),
	"preferred_time_end" varchar(5),
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP INDEX "idx_portfolio_master";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "salon_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "service_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "masters" ALTER COLUMN "salon_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "solo_master_service_id" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "modified_by" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "modification_history" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "is_mobile_booking" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_address" varchar(500);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "estimated_travel_time" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "mobile_extra_charge" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "is_solo_master" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "address" varchar(500);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "service_mode" varchar(20) DEFAULT 'at_master';--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "work_radius" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "mobile_extra_charge" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "instagram" varchar(100);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "telegram" varchar(100);--> statement-breakpoint
ALTER TABLE "masters" ADD COLUMN "status" varchar(20) DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "status" varchar(20) DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "booking_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "last_booked_at" timestamp;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "display_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "gender" varchar(20);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "birthday" varchar(10);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "notify_email" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "notify_reminder_24h" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "notify_reminder_2h" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "notify_booking_updates" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "notify_promotions" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_blocked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "block_reason" varchar;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_salon" ON "audit_logs" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_booking_history_booking" ON "booking_history" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_history_created" ON "booking_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_master_stats_master" ON "master_statistics" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_master_stats_month" ON "master_statistics" USING btree ("month");--> statement-breakpoint
CREATE INDEX "idx_master_stats_unique" ON "master_statistics" USING btree ("master_id","month");--> statement-breakpoint
CREATE INDEX "idx_owner_permissions_owner" ON "owner_permissions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_owner_permissions_permission" ON "owner_permissions" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_password_reset_expires" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_portfolio_master" ON "portfolio_items" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_category" ON "portfolio_items" USING btree ("service_category");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_salon_breaks_salon" ON "salon_breaks" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_salon_breaks_day" ON "salon_breaks" USING btree ("salon_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_salon_exceptions_salon" ON "salon_exceptions" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_salon_exceptions_date" ON "salon_exceptions" USING btree ("salon_id","exception_date");--> statement-breakpoint
CREATE INDEX "idx_salon_managers_salon" ON "salon_managers" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_salon_managers_user" ON "salon_managers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_salon_managers_status" ON "salon_managers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_salon_managers_unique" ON "salon_managers" USING btree ("salon_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_salon_settings_salon" ON "salon_settings" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_solo_master_services_master" ON "solo_master_services" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_solo_master_services_category" ON "solo_master_services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_solo_master_services_display_order" ON "solo_master_services" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "idx_waitlist_client" ON "waitlist" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_salon" ON "waitlist" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status" ON "waitlist" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_master_date_status" ON "bookings" USING btree ("master_id","booking_date","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_salon_date_status" ON "bookings" USING btree ("salon_id","booking_date","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_solo_master_service" ON "bookings" USING btree ("solo_master_service_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_mobile" ON "bookings" USING btree ("is_mobile_booking");--> statement-breakpoint
CREATE INDEX "idx_master_portfolio_master" ON "master_portfolio" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_masters_solo" ON "masters" USING btree ("is_solo_master");--> statement-breakpoint
CREATE INDEX "idx_masters_slug" ON "masters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_masters_location" ON "masters" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_services_booking_count" ON "services" USING btree ("booking_count");--> statement-breakpoint
CREATE INDEX "idx_services_display_order" ON "services" USING btree ("display_order");--> statement-breakpoint
ALTER TABLE "masters" ADD CONSTRAINT "masters_slug_unique" UNIQUE("slug");